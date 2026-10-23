"""CPU-only local Kokoro TTS; all model/runtime/output assets live on D:."""
import argparse,json
from pathlib import Path
from voice_paths import VOICE_ROOT,tts_settings

def synthesize(text,output,speaker=None,character=None):
    import sherpa_onnx,soundfile
    if not text.strip() or len(text)>1500:raise ValueError('TTS text must be 1-1500 characters')
    output=Path(output).resolve()
    if not output.is_relative_to((VOICE_ROOT/'audio').resolve()) or output.suffix!='.wav' or output.exists():raise ValueError('Only new owned WAV outputs are accepted')
    settings=tts_settings(character);model=VOICE_ROOT/'models/kokoro-multi-lang-v1_1'
    config=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(model=str(model/'model.onnx'),voices=str(model/'voices.bin'),tokens=str(model/'tokens.txt'),data_dir=str(model/'espeak-ng-data'),lexicon=str(model/'lexicon-us-en.txt')+','+str(model/'lexicon-zh.txt')),
        num_threads=4,provider='cpu'),max_num_sentences=1)
    if not config.validate():raise ValueError('Local model files are incomplete')
    sid=settings.get('speaker_id',3) if speaker is None else speaker
    if not 3<=sid<=57:raise ValueError('Expected a configured Chinese female voice')
    tts=sherpa_onnx.OfflineTts(config)
    audio=tts.generate(text,sid=sid,speed=settings.get('speed',1.0))
    if len(audio.samples)==0:raise ValueError('Empty TTS output')
    output.parent.mkdir(parents=True,exist_ok=True)
    soundfile.write(str(output),audio.samples,audio.sample_rate,subtype='PCM_16')
    return {'path':str(output),'seconds':len(audio.samples)/audio.sample_rate,'sample_rate':audio.sample_rate,'speaker_id':sid,'engine':'kokoro','offline':True,'sent':False,'character':character,'voice_source':settings.get('voice_source','default')}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--text',required=True);p.add_argument('--out',required=True);p.add_argument('--speaker',type=int);p.add_argument('--character');a=p.parse_args()
    print(json.dumps(synthesize(a.text,a.out,a.speaker,a.character),ensure_ascii=False))
