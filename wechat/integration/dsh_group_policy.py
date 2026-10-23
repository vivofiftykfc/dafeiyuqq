"""Group chat uses the DSH account model, with no host-computer tool surface."""
# IDs verified against the installed dsh-base bundle. Unknown future tools are
# additionally denied by the native execution guard in the context plugin.
HOST_TOOL_ROWS=('tool-plugin-manager','tool-working-directory','tool-bash','tool-pwsh','tool-jobs','tool-fs','tool-fs-search','tool-skill','tool-subagent-control','tool-subagent-list-agents','tool-subagent','tool-subagent-fork','tool-workflow','tool-todo','tool-goal')

def overlay(job):
 if job.get('scope')!='group':return []
 return [{'id':name,'disabled':True} for name in HOST_TOOL_ROWS]+[{'id':'plan-mode','disabled':True},{'id':'system-prompt','config':{'personaPrefix':'','personaSuffix':''}}]
