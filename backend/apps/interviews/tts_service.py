"""
Text-to-Speech service using gTTS for backend audio generation.
The frontend primarily uses browser SpeechSynthesis; this is the fallback/download option.
"""
import os
import uuid
from io import BytesIO
from gtts import gTTS
from django.conf import settings


def text_to_speech_file(text: str, lang: str = 'en') -> str:
    """
    Convert text to MP3 and save to MEDIA_ROOT/tts/.
    Returns the relative URL path to the audio file.
    """
    tts_dir = os.path.join(settings.MEDIA_ROOT, 'tts')
    os.makedirs(tts_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(tts_dir, filename)

    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(filepath)

    return f"/media/tts/{filename}"


def text_to_speech_bytes(text: str, lang: str = 'en') -> bytes:
    """
    Convert text to MP3 and return as bytes (for streaming).
    """
    fp = BytesIO()
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.write_to_fp(fp)
    fp.seek(0)
    return fp.read()
