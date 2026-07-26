"""
Code execution service backed by Judge0 CE.

Primary target is Judge0 CE hosted on RapidAPI (free tier, zero infra):
    https://rapidapi.com/judge0-official/api/judge0-ce

Configure via env vars (see backend/.env.example):
    JUDGE0_API_URL   default https://judge0-ce.p.rapidapi.com
    JUDGE0_API_KEY   your RapidAPI key   (required to actually run code)
    JUDGE0_API_HOST  default judge0-ce.p.rapidapi.com

A self-hosted Judge0 also works: point JUDGE0_API_URL at it and set
JUDGE0_API_KEY to its X-Auth-Token (or leave it blank if auth is disabled).

Keeps the historical function name `execute_code` and a Judge0-shaped return
dict so callers (views.py) don't need to change.
"""
import json
import os
from urllib import request
from urllib.error import HTTPError, URLError


def _cfg(name, default=None):
    """Read config fresh each call so key rotation needs no restart."""
    return os.getenv(name, default)


class Judge0Error(RuntimeError):
    """Raised on any execution failure (config, network, or upstream)."""
    pass


def _headers(host: str, key: str) -> dict:
    # A browser-like UA is required for Cloudflare-fronted public instances
    # (e.g. ce.judge0.com), which reject the default urllib user-agent (err 1010).
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                      'AppleWebKit/537.36 (KHTML, like Gecko) '
                      'Chrome/122.0 Safari/537.36',
    }
    if 'rapidapi' in host:
        # RapidAPI-hosted Judge0
        headers['X-RapidAPI-Key'] = key
        headers['X-RapidAPI-Host'] = host
    elif key:
        # Self-hosted Judge0 with auth enabled
        headers['X-Auth-Token'] = key
    return headers


def execute_code(source_code: str, language_id: int = 63, stdin: str = "") -> dict:
    """
    Execute code via Judge0. Returns a Judge0-shaped dict:
        {stdout, stderr, compile_output, status_id, status: {id, description}, time, memory}

    Uses the synchronous submission endpoint (wait=true) so we get results in
    one request. Raises Judge0Error on any failure.
    """
    base_url = (_cfg('JUDGE0_API_URL', 'https://judge0-ce.p.rapidapi.com') or '').rstrip('/')
    api_key = _cfg('JUDGE0_API_KEY', '') or ''
    host = _cfg('JUDGE0_API_HOST', 'judge0-ce.p.rapidapi.com') or ''

    # RapidAPI (and most hosted Judge0) require a key. Fail with a clear,
    # actionable message instead of a confusing network error.
    if 'rapidapi' in host and not api_key:
        raise Judge0Error(
            'Code execution is not configured. Set JUDGE0_API_KEY (get a free '
            'key at rapidapi.com/judge0-official/api/judge0-ce) in the backend '
            'environment.'
        )

    url = f'{base_url}/submissions?base64_encoded=false&wait=true'
    payload = json.dumps({
        'source_code': source_code,
        'language_id': language_id,
        'stdin': stdin or '',
    }).encode('utf-8')

    req = request.Request(url, data=payload, headers=_headers(host, api_key), method='POST')

    try:
        with request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        detail = ''
        try:
            detail = e.read().decode('utf-8')
        except Exception:
            pass
        if e.code in (401, 403):
            raise Judge0Error(
                'Judge0 rejected the request (auth). Check JUDGE0_API_KEY / '
                f'JUDGE0_API_HOST. Upstream said: {detail or e.reason}'
            ) from e
        if e.code == 429:
            raise Judge0Error(
                'Judge0 rate limit reached (free tier). Try again later.'
            ) from e
        raise Judge0Error(f'Judge0 upstream error {e.code}: {detail or e.reason}') from e
    except URLError as e:
        raise Judge0Error(f'Could not reach Judge0: {e.reason}') from e
    except json.JSONDecodeError as e:
        raise Judge0Error(f'Judge0 returned malformed JSON: {e}') from e

    status = data.get('status') or {}
    return {
        'stdout': data.get('stdout') or '',
        'stderr': data.get('stderr') or '',
        'compile_output': data.get('compile_output') or '',
        'status_id': status.get('id', 0),
        'status': {
            'id': status.get('id', 0),
            'description': status.get('description', ''),
        },
        'time': data.get('time'),
        'memory': data.get('memory'),
    }
