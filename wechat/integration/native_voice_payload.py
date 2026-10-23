"""Prepare immutable Tencent SILK for the future pinned native voice sender.

No microphone, UI, network, WeChat process or transmission is touched here.
"""
import hashlib,json,struct,sys,wave
from pathlib import Path
from privacy_policy import PRIVATE_PEER
from voice_paths import VOICE_ROOT

def packets(raw):
    if not isinstance(raw,bytes) or not raw.startswith(b'\x02#!SILK_V3') or not 10<len(raw)<=8*1024*1024:raise ValueError('Tencent SILK header required')
    offset=10;count=0
    while offset<len(raw):
        if offset+2>len(raw):raise ValueError('Truncated SILK packet length')
        size=struct.unpack_from('<h',raw,offset)[0];offset+=2
        if not 0<size<=5000 or offset+size>len(raw):raise ValueError('Invalid or truncated SILK packet')
        offset+=size;count+=1
        if count>6000:raise ValueError('Too many SILK packets')
    if not count:raise ValueError('Empty SILK voice')
    return count

def prepare(path,character=None,speaker_id=None,engine='kokoro'):
    path=Path(path).resolve(strict=True);folder=(VOICE_ROOT/'audio/private').resolve()
    if path.parent!=folder or path.suffix!='.wav' or not 0<path.stat().st_size<=16*1024*1024:raise ValueError('Owned private WAV required')
    if character is not None and (not isinstance(character,str) or not character or len(character)>200 or any(c in character for c in ('/','\\','\0'))):raise ValueError('Invalid character identity')
    digest=hashlib.sha256(path.read_bytes()).hexdigest();manifest=path.with_suffix('.voice.json')
    if manifest.exists():
        saved=json.loads(manifest.read_text(encoding='utf-8'));silk=path.with_suffix('.silk')
        if saved.get('wav_sha256')!=digest or saved.get('character')!=character or saved.get('speaker_id')!=speaker_id or saved.get('engine')!=engine or saved.get('target')!=PRIVATE_PEER or saved.get('silk_path')!=str(silk) or hashlib.sha256(silk.read_bytes()).hexdigest()!=saved.get('silk_sha256'):raise ValueError('Prepared voice identity conflict')
        count=packets(silk.read_bytes())
        if count>3000 or saved.get('packet_count')!=count or saved.get('voice_time_ms')!=count*20 or saved.get('codec_rate')!=24000 or saved.get('codec_roundtrip_verified') is not True:raise ValueError('Prepared voice metadata conflict')
        return saved
    with wave.open(str(path),'rb') as audio:
        seconds=audio.getnframes()/audio.getframerate()
    if not 0<seconds<=60:raise ValueError('Native voice requires at most 60 seconds')
    from local_voice import encode_silk,decode_silk
    silk=encode_silk(path);raw=silk.read_bytes();count=packets(raw)
    decoded=decode_silk(silk)
    try:
        with wave.open(str(decoded),'rb') as audio:decoded_ms=audio.getnframes()*1000/audio.getframerate()
        if abs(decoded_ms-count*20)>1 or decoded_ms<seconds*1000-1 or decoded_ms-seconds*1000>=21 or decoded_ms>60000:raise ValueError('Encoded voice duration mismatch')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=digest:raise ValueError('Source audio changed')
        saved={'version':1,'character':character,'speaker_id':speaker_id,'engine':engine,'target':PRIVATE_PEER,'wav_path':str(path),'wav_sha256':digest,'silk_path':str(silk),'silk_sha256':hashlib.sha256(raw).hexdigest(),'silk_bytes':len(raw),'packet_count':count,'voice_time_ms':round(decoded_ms),'wav_seconds':seconds,'codec_rate':24000,'header':'Tencent SILK_V3','codec_roundtrip_verified':True,'payload_ready':True,'native_transport_connected':False,'wechat_sent':False}
        with manifest.open('x',encoding='utf-8') as stream:json.dump(saved,stream,ensure_ascii=False,indent=2)
        return saved
    finally:decoded.unlink(missing_ok=True)

if __name__=='__main__':
    request=json.loads(sys.argv[1]);print(json.dumps(prepare(**request),ensure_ascii=False))
