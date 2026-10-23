"""Explicit owner computer access, distinct from the process's Windows token."""
import ctypes,json,os
from privacy_policy import ROOT

def mode_for(owner_work,root=ROOT):
    if not owner_work:return 'read-only'
    policy=json.loads((root/'local/autonomy.json').read_text(encoding='utf-8'))
    return 'danger-full-access' if policy.get('host_access')=='full' else 'workspace-write'

def overlay(mode,workspace):
    rows=[{'id':'sandbox-policy','config':{'mode':mode,'workspaceRoot':str(workspace)}}]
    if mode!='read-only':
        rows.append({'id':'permission','config':{'defaultPreset':'owner-computer','presets':{'owner-computer':{'sandbox':mode,'approval':'never'}}}})
    return rows

def process_access():
    return {'windows_elevated':bool(ctypes.windll.shell32.IsUserAnAdmin()) if os.name=='nt' else None,
            'meaning':'DSH full access removes its filesystem and command sandbox; Windows account permissions still apply.'}
