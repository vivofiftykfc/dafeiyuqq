import json,sys
from pathlib import Path
import numpy as np
import soundfile as sf
import sherpa_onnx
ROOT=Path(__file__).resolve().parent
asr=ROOT.parent/'models'/'sensevoice'
recognizer=sherpa_onnx.OfflineRecognizer.from_sense_voice(model=str(asr/'model.int8.onnx'),tokens=str(asr/'tokens.txt'),num_threads=4,language='zh',use_itn=True)
results=[]
for file in sys.argv[1:]:
    audio,rate=sf.read(file,dtype='float32')
    if audio.ndim>1:audio=audio.mean(axis=1)
    stream=recognizer.create_stream()
    stream.accept_waveform(rate,audio)
    recognizer.decode_stream(stream)
    row={'file':file,'seconds':round(len(audio)/rate,2),'sampleRate':rate,'rms':float(np.sqrt(np.mean(audio**2))),'clippedFraction':float(np.mean(np.abs(audio)>=.999)),'transcript':stream.result.text}
    results.append(row)
    print(json.dumps(row,ensure_ascii=False),flush=True)
(ROOT/'latest-audio-verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
