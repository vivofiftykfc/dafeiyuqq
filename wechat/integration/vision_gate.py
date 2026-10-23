"""Wait for exact-image understanding, not its optional conversational reply."""
import asyncio

class VisionGate:
    def __init__(self):self.events={}
    def begin(self,identity):
        if identity not in self.events:self.events[identity]=asyncio.Event()
        if len(self.events)>512:
            for key,event in list(self.events.items()):
                if key!=identity and event.is_set():del self.events[key]
                if len(self.events)<=512:break
    def finish(self,identity):
        event=self.events.get(identity)
        if event:event.set()
    async def wait(self,identity,timeout=25):
        event=self.events.get(identity)
        if event is None:return False
        try:
            await asyncio.wait_for(event.wait(),timeout)
            return True
        except asyncio.TimeoutError:return False
