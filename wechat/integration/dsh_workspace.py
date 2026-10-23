"""Separate role artifacts from disposable model evaluations."""
import hashlib
from pathlib import Path
from dsh_runtime import ROOT

def workspace_for(job,root=ROOT):
    scope=job.get('scope')
    if scope not in ('private','group') or not job.get('avatar'):raise ValueError('Missing workspace identity')
    role=hashlib.sha256((scope+'\0'+job['avatar']).encode()).hexdigest()[:24]
    if job.get('evaluation'):
        identity=hashlib.sha256(job['id'].encode()).hexdigest()[:24]
        folder=root/'runtime/dsh-workspaces/evaluations'/identity
    else:folder=root/'runtime/dsh-workspaces/characters'/role
    folder.mkdir(parents=True,exist_ok=True)
    resolved=folder.resolve()
    if not resolved.is_relative_to((root/'runtime/dsh-workspaces').resolve()):raise ValueError('Workspace escaped')
    return resolved
