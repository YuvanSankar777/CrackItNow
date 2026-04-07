import json
import os
from urllib import request

from django.conf import settings


def execute_code(source_code: str, language_id: int = 63, stdin: str = "") -> dict:
    """
    Execute code via Judge0 CE API.
    Requires RAPIDAPI key in JUDGE0_API_KEY.
    """
    api_key = os.getenv('JUDGE0_API_KEY')
    if not api_key:
        return {
            'stdout': 'Mock execution successful.\n',
            'stderr': '',
            'compile_output': '',
            'status_id': 3,
            'status': {'description': 'Accepted (Mock)'},
        }

    payload = json.dumps({
        'source_code': source_code,
        'language_id': language_id,
        'stdin': stdin,
    }).encode('utf-8')

    req = request.Request(
        f"{settings.JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true",
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'x-rapidapi-key': api_key,
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
        },
        method='POST',
    )
    with request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode('utf-8'))
