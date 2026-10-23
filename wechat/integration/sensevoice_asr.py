"""Pinned CPU-only Chinese ASR; runtime and model stored under D:/Projects."""
import hashlib,json,re,sys,time
from local_voice import approved,decode_silk
from voice_paths import VOICE_ROOT
MODEL_SHA='c71f0ce00bec95b07744e116345e33d8cbbe08cef896382cf907bf4b51a2cd51'
TOKENS_SHA='f449eb28dc567533d7fa59be34e2abca8784f771850c78a47fb731a31429a1dc'

def transcribe(path):
    import av,numpy as np,sherpa_onnx
    started=time.monotonic();path=approved(path)
    if path.suffix.lower()=='.silk':path=decode_silk(path)
    resampler=av.AudioResampler(format='s16',layout='mono',rate=16000)
    parts=[];count=0
    with av.open(str(path)) as source:
        for frame in source.decode(audio=0):
            for converted in resampler.resample(frame):
                samples=converted.to_ndarray().reshape(-1);count+=len(samples)
                if count>16000*120:raise ValueError('Voice exceeds two minutes')
                parts.append(samples)
        for converted in resampler.resample(None):parts.append(converted.to_ndarray().reshape(-1))
    if not parts:raise ValueError('Empty audio')
    samples=np.concatenate(parts).astype(np.float32)/32768
    if not 0<len(samples)<=16000*120:raise ValueError('Voice duration rejected')
    model=VOICE_ROOT/'models/sensevoice'
    for name,digest in [('model.int8.onnx',MODEL_SHA),('tokens.txt',TOKENS_SHA)]:
        if hashlib.sha256((model/name).read_bytes()).hexdigest()!=digest:raise ValueError('ASR model digest mismatch')
    recognizer=sherpa_onnx.OfflineRecognizer.from_sense_voice(model=str(model/'model.int8.onnx'),tokens=str(model/'tokens.txt'),num_threads=4,provider='cpu',language='zh',use_itn=True)
    segments=[]
    for start in range(0,len(samples),25*16000):
        stream=recognizer.create_stream();chunk=samples[start:start+25*16000]
        stream.accept_waveform(16000,chunk);recognizer.decode_stream(stream)
        text=re.sub(r'<\|[^|]*\|>','',stream.result.text).strip()
        if text:segments.append({'start':start/16000,'end':(start+len(chunk))/16000,'text':text})
    return {'text':''.join(x['text'] for x in segments),'segments':segments,'duration':len(samples)/16000,'language':'zh','engine':'sensevoice-int8','offline':True,'seconds':time.monotonic()-started,'native_voice_transport':False}

if __name__=='__main__':print(json.dumps(transcribe(sys.argv[1]),ensure_ascii=False))
