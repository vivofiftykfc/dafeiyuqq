"""Route explicit full-computer owner tasks through the local host worker."""
import asyncio,json,sys
from pathlib import Path
from privacy_policy import ROOT
from host_access import mode_for
from host_executor import submit

def main():
    file=Path(sys.argv[1]).resolve()
    if file.parent!=(ROOT/'runtime/dsh-requests').resolve():raise ValueError('Unknown input')
    request=json.loads(file.read_text(encoding='utf-8'))
    job=json.loads((ROOT/'runtime/tavern-jobs.json').read_text(encoding='utf-8')).get(request['job']['id'],{})
    if job.get('scope')=='private' and not job.get('evaluation') and mode_for(True)=='danger-full-access':
        result=submit('generate',file)
    else:
        from dsh_generate import generate
        result=asyncio.run(generate(file))
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
