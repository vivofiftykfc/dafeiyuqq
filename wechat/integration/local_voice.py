"""Offline ASR and Tencent SILK codec. Run only with runtime/voice-env Python."""
import argparse,hashlib,json,wave,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MODEL=ROOT/'runtime/models/faster-whisper-base'
MODEL_SHA='d01c3014881c9c6f3133c182f3d2887eb6ca1c789a7538c5c007196857a0a6a9'

def approved(path):
    path=Path(path).resolve(strict=True)
    from voice_paths import VOICE_ROOT
    allowed=[(ROOT/'runtime/media'/scope/'audio').resolve() for scope in ('private','group')]+[(VOICE_ROOT/'audio/private').resolve()]
    public=ROOT/'runtime/public-video-evidence'
    public_audio=path.name=='audio.wav' and path.parent.parent==public.resolve() and __import__('re').fullmatch(r'BV[0-9A-Za-z]+',path.parent.name)
    contact_audio=path.parent.parent==(VOICE_ROOT/'audio/contacts').resolve() and __import__('re').fullmatch(r'[0-9a-f]{64}',path.parent.name)
    if not (any(path.is_relative_to(folder) for folder in allowed) or public_audio or contact_audio) or not path.is_file() or not 0<path.stat().st_size<=16*1024*1024:raise ValueError('Only scoped local audio is accepted')
    return path

def decode_silk(path):
    import pilk
    path=approved(path)
    if not path.read_bytes()[:16].lstrip(b'\x02').startswith(b'#!SILK_V3'):raise ValueError('Invalid SILK header')
    pcm=path.with_suffix('.decoded.pcm');output=path.with_suffix('.decoded.wav')
    try:
        pilk.decode(str(path),str(pcm),pcm_rate=24000)
        if pcm.stat().st_size>24000*2*120:raise ValueError('Voice exceeds two minutes')
        with wave.open(str(output),'wb') as out:
            out.setnchannels(1);out.setsampwidth(2);out.setframerate(24000);out.writeframes(pcm.read_bytes())
    finally:pcm.unlink(missing_ok=True)
    return output

def encode_silk(path):
    import av,pilk
    path=approved(path);output=path.with_suffix('.silk')
    if output.exists():raise FileExistsError('Encoded voice already exists; refusing replacement')
    nonce=uuid.uuid4().hex
    pcm=path.with_name(path.stem+'.'+nonce+'.encoded.pcm')
    temporary=path.with_name(path.stem+'.'+nonce+'.encoded.silk')
    resampler=av.AudioResampler(format='s16',layout='mono',rate=24000)
    total=0
    try:
        with av.open(str(path)) as media,pcm.open('wb') as out:
            for source in media.decode(audio=0):
                for frame in resampler.resample(source):
                    raw=frame.to_ndarray().tobytes();total+=len(raw)
                    if total>24000*2*120:raise ValueError('Voice exceeds two minutes')
                    out.write(raw)
            for frame in resampler.resample(None):
                raw=frame.to_ndarray().tobytes();total+=len(raw)
                if total>24000*2*120:raise ValueError('Voice exceeds two minutes')
                out.write(raw)
            # One SILK packet is 20 ms in this encoder. Pad the final partial
            # packet instead of silently dropping the end of the generated voice.
            if not total:raise ValueError('Empty audio')
            padding=(-total)%960
            if padding:out.write(b'\0'*padding)
        pilk.encode(str(pcm),str(temporary),pcm_rate=24000,tencent=True)
        raw=temporary.read_bytes()
        if not raw.startswith(b'\x02#!SILK_V3') or not 10<len(raw)<=8*1024*1024:raise ValueError('Invalid encoded voice')
        with output.open('xb') as stream:stream.write(raw)
    finally:
        pcm.unlink(missing_ok=True);temporary.unlink(missing_ok=True)
    return output

def transcribe(path):
    from faster_whisper import WhisperModel
    path=approved(path)
    if path.suffix.lower()=='.silk':path=decode_silk(path)
    with wave.open(str(path),'rb') as audio:duration=audio.getnframes()/audio.getframerate()
    if not 0<duration<=120:raise ValueError('Voice duration rejected')
    if hashlib.sha256((MODEL/'model.bin').read_bytes()).hexdigest()!=MODEL_SHA:raise ValueError('Model digest mismatch')
    model=WhisperModel(str(MODEL),device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True)
    segments,info=model.transcribe(str(path),beam_size=5,language='zh',condition_on_previous_text=False,vad_filter=True)
    rows=[{'start':segment.start,'end':segment.end,'text':segment.text} for segment in segments]
    return {'text':''.join(row['text'] for row in rows).strip(),'language':info.language,'duration':duration,'segments':rows,'offline':True,'native_voice_transport':False}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('operation',choices=['transcribe','encode','decode']);parser.add_argument('path');args=parser.parse_args()
    result=transcribe(args.path) if args.operation=='transcribe' else {'path':str(encode_silk(args.path) if args.operation=='encode' else decode_silk(args.path)),'offline':True,'native_voice_transport':False}
    print(json.dumps(result,ensure_ascii=False))
