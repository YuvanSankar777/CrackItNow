"""
Code execution service backed by Piston (https://github.com/engineer-man/piston).

Default target is a self-hosted Piston running locally at http://localhost:2000.
Override with PISTON_URL env var if you host it elsewhere.

Keeps the historical function name `execute_code` and the Judge0-shaped
return dict so callers (views.py) don't need to change.
"""
import json
import os
import re
from urllib import request
from urllib.error import HTTPError, URLError


PISTON_URL = os.getenv('PISTON_URL', 'http://localhost:2000/api/v2/execute')

# Judge0 language IDs → (piston language, default file extension, piston version "*")
LANG_MAP = {
    63: ('javascript', 'index.js'),   # Node.js
    71: ('python',     'main.py'),
    62: ('java',       'Main.java'),
    54: ('c++',        'main.cpp'),
    50: ('c',          'main.c'),
    68: ('php',        'main.php'),
    60: ('go',         'main.go'),
    72: ('ruby',       'main.rb'),
    73: ('rust',       'main.rs'),
    74: ('typescript', 'index.ts'),
}


class Judge0Error(RuntimeError):
    """Kept for backward compatibility with views.py. Raised on any execution failure."""
    pass


def _piston_language(language_id: int):
    return LANG_MAP.get(language_id, ('python', 'main.py'))


_JAVA_PUBLIC_CLASS_RE = re.compile(r'\bpublic\s+(?:final\s+|abstract\s+)?class\s+(\w+)')


def _resolve_filename(source_code: str, language: str, default_name: str) -> str:
    """Pick a filename Piston will accept. Java requires filename == public class name."""
    if language == 'java':
        m = _JAVA_PUBLIC_CLASS_RE.search(source_code)
        if m:
            return f'{m.group(1)}.java'
    return default_name


def execute_code(source_code: str, language_id: int = 63, stdin: str = "") -> dict:
    """
    Execute code via Piston. Returns a Judge0-shaped dict so the caller doesn't care
    which backend we use:
        {stdout, stderr, compile_output, status_id, status: {id, description}}
    """
    language, filename = _piston_language(language_id)
    filename = _resolve_filename(source_code, language, filename)

    payload = json.dumps({
        'language': language,
        'version': '*',
        'files': [{'name': filename, 'content': source_code}],
        'stdin': stdin or '',
        'compile_timeout': 15000,
        'run_timeout': 10000,
    }).encode('utf-8')

    req = request.Request(
        PISTON_URL,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with request.urlopen(req, timeout=25) as response:
            body = response.read().decode('utf-8')
            data = json.loads(body)
    except HTTPError as e:
        detail = ''
        try:
            detail = e.read().decode('utf-8')
        except Exception:
            pass
        raise Judge0Error(f"Piston upstream error {e.code}: {detail or e.reason}") from e
    except URLError as e:
        raise Judge0Error(f"Could not reach Piston: {e.reason}") from e
    except json.JSONDecodeError as e:
        raise Judge0Error(f"Piston returned malformed JSON: {e}") from e

    run = data.get('run', {}) or {}
    compile_step = data.get('compile', {}) or {}

    stdout = run.get('stdout', '') or ''
    stderr = run.get('stderr', '') or ''
    exit_code = run.get('code')
    signal = run.get('signal')
    compile_output = compile_step.get('stderr') or compile_step.get('output') or ''
    compile_code = compile_step.get('code')

    # Map to Judge0-style status
    if compile_code is not None and compile_code != 0:
        status_id = 6          # Judge0: Compilation Error
        status_desc = 'Compilation Error'
    elif signal:
        status_id = 7          # Runtime Error (SIGSEGV etc.)
        status_desc = f'Runtime Error ({signal})'
    elif exit_code == 0 and not stderr:
        status_id = 3          # Accepted
        status_desc = 'Accepted'
    elif stderr:
        status_id = 7
        status_desc = 'Runtime Error'
    else:
        status_id = 4
        status_desc = 'Wrong Answer'

    return {
        'stdout': stdout,
        'stderr': stderr,
        'compile_output': compile_output,
        'status_id': status_id,
        'status': {'id': status_id, 'description': status_desc},
        'time': None,
        'memory': None,
    }
