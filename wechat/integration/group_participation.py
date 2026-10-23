"""Explicit command parsing. Shared speech admission lives in group_speech.py."""

def owner_command(text):
    """Only an explicit top-level command can trigger privileged work."""
    for prefix in ('/龙虾 ','/openclaw '):
        if text.startswith(prefix):return text[len(prefix):].strip()
    return None
