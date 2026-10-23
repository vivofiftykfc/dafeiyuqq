import argparse, json, time, urllib.request, sys
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

ROOT = Path(__file__).resolve().parent
VOICES = {
    'cool': {'name': '清冷少御', 'instruction': '年轻成年女性，清冷少御音，中低音区，音色清澈干净，轻微冷感但并不冷漠，咬字自然，语气克制松弛，像熟悉的人在身边轻声聊天。不要播音腔，不要童声，不要夸张撒娇。'},
    'gentle': {'name': '温柔少御', 'instruction': '年轻成年女性，温柔少御音，中等偏低音高，音色柔和通透，带一点温暖的笑意和轻微气息感，语速自然稍慢，亲近而不刻意甜腻，像身边的人日常说话。不要客服腔，不要童声，不要夸张表演。'},
    'husky': {'name': '微哑姐姐感', 'instruction': '成年女性，成熟姐姐感，中低音区，嗓音有细微的沙哑和颗粒感，慵懒温暖，声音有质感而不粗糙，亲近放松，语气自然，停顿从容。不要男声，不要重烟嗓，不要播音朗诵。'},
}
REFERENCE = '你回来啦。今天过得怎么样？先坐一会儿，不用急着说。我刚才还在想，有些事情慢慢来，反而会看得更清楚。'

def load(kind):
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA torch is required')
    torch.set_num_threads(6)
    if torch.cuda.mem_get_info()[0] < 6 * 1024**3:
        try:
            with urllib.request.urlopen('http://127.0.0.1:8188/queue', timeout=5) as r:
                queue = json.load(r)
            if queue.get('queue_running') or queue.get('queue_pending'):
                raise RuntimeError('Image generation is busy; wait for it to finish before generating speech')
            req = urllib.request.Request('http://127.0.0.1:8188/free', data=b'{"unload_models":true,"free_memory":true}', headers={'Content-Type':'application/json'})
            urllib.request.urlopen(req, timeout=10).close()
            time.sleep(3)
        except RuntimeError:
            raise
        except Exception:
            pass
    if torch.cuda.mem_get_info()[0] < 5 * 1024**3:
        raise RuntimeError('Not enough free GPU memory; finish other GPU jobs first')
    return Qwen3TTSModel.from_pretrained(str(ROOT/'models'/('Qwen3-TTS-12Hz-1.7B-'+kind)), device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa')

def save(file, audio, rate):
    audio = np.asarray(audio)
    if not np.isfinite(audio).all() or len(audio) < rate:
        raise ValueError('Invalid or empty generated audio')
    peak = float(np.abs(audio).max())
    if peak > .98:
        audio = audio * (.98 / peak)
    sf.write(str(file), audio, rate, subtype='PCM_16')
    return {'file': str(file), 'sampleRate': rate, 'seconds': round(len(audio)/rate, 2), 'peak': peak}

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--design', action='store_true')
    p.add_argument('--job')
    args = p.parse_args()
    (ROOT/'references').mkdir(exist_ok=True)
    (ROOT/'audio').mkdir(exist_ok=True)
    if args.design:
        if (ROOT/'voices.json').exists():
            print('Existing reference voices retained; no redesign performed.', flush=True)
            sys.exit(0)
        model = load('VoiceDesign')
        manifest = {}
        for i, (key, voice) in enumerate(VOICES.items()):
            torch.manual_seed(7300+i)
            wavs, sr = model.generate_voice_design(text=REFERENCE, language='Chinese', instruct=voice['instruction'], max_new_tokens=900)
            manifest[key] = {**voice, 'text': REFERENCE, **save(ROOT/'references'/(key+'.wav'), wavs[0], sr)}
            (ROOT/'voices.partial.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps(manifest[key], ensure_ascii=True), flush=True)
        (ROOT/'voices.partial.json').replace(ROOT/'voices.json')
    else:
        jobfile = Path(args.job)
        job = json.loads(jobfile.read_text(encoding='utf-8'))
        try:
            voice = json.loads((ROOT/'voices.json').read_text(encoding='utf-8'))[job['voice']]
            model = load('Base')
            wavs, sr = model.generate_voice_clone(text=job['text'], language='Chinese', ref_audio=voice['file'], ref_text=voice['text'], max_new_tokens=1400)
            job.update(save(ROOT/'audio'/(job['id']+'.wav'), wavs[0], sr))
            job['status'] = 'completed'
        except Exception as e:
            job.update(status='error', error=str(e))
            raise
        finally:
            jobfile.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding='utf-8')
