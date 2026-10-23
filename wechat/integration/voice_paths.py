"""Owned D-drive voice artifacts. Existing user files are never migrated."""
import json
from pathlib import Path
VOICE_ROOT=Path('__VOICE_ROOT__')

def audio_dir(scope='private'):
    if scope not in ('private','group') and not __import__('re').fullmatch(r'contacts/[0-9a-f]{64}',scope):raise ValueError('Unknown audio scope')
    folder=VOICE_ROOT/'audio'/scope
    folder.mkdir(parents=True,exist_ok=True)
    return folder

def tts_settings(character=None):
    config=VOICE_ROOT/'tts.json'
    value=json.loads(config.read_text(encoding='utf-8-sig'))
    if character is not None:
        if not isinstance(character,str) or not character or len(character)>200 or any(x in character for x in ('/','\\','\x00')):raise ValueError('Invalid character identity')
        roles=VOICE_ROOT/'characters.json'
        overrides=json.loads(roles.read_text(encoding='utf-8-sig')) if roles.exists() else {}
        override=overrides.get(character)
        if override is not None:
            if not isinstance(override,dict) or set(override)-{'engine','speaker_id','speaker_name','speed','voice','rate'}:raise ValueError('Invalid character voice override')
            value={**value,**override}
        value={**value,'character':character,'voice_source':'character' if override is not None else 'default'}
    if value.get('engine')=='kokoro':
        if not isinstance(value.get('speaker_id'),int) or not 3<=value['speaker_id']<=57 or not isinstance(value.get('speed'),(int,float)) or not 0.8<=value['speed']<=1.2:raise ValueError('Invalid Kokoro voice configuration')
    elif value.get('engine')!='windows-sapi' or not isinstance(value.get('voice'),str) or not value['voice'] or not isinstance(value.get('rate'),int) or not -10<=value['rate']<=10:raise ValueError('Invalid local TTS configuration')
    return value

def asr_backend(path):
    config=json.loads((VOICE_ROOT/'asr.json').read_text(encoding='utf-8-sig'))
    integration=Path(__file__).resolve().parent
    if config.get('engine')=='sensevoice-int8':return VOICE_ROOT/'venv/Scripts/python.exe',integration/'sensevoice_asr.py',[str(path)]
    if config.get('engine')=='faster-whisper-base':return integration.parent/'runtime/voice-env/Scripts/python.exe',integration/'local_voice.py',['transcribe',str(path)]
    raise ValueError('Unsupported local ASR configuration')
