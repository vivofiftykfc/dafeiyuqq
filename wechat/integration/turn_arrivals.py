"""Track accepted native arrivals before expensive image/model processing."""
import uuid

class TurnArrivals:
    def __init__(self):self.epoch=uuid.uuid4().hex;self.latest={};self.sources={}
    def observe(self,target,source=None):
        identity=(target,source)
        if source and identity in self.sources:return self.sources[identity]
        count=self.latest.get(target,0)+1;self.latest[target]=count
        stamp=self.epoch+':'+str(count)
        if source:
            self.sources[identity]=stamp
            if len(self.sources)>1024:del self.sources[next(iter(self.sources))]
        return stamp
    def superseded(self,target,stamp):
        if not stamp:return False
        return stamp!=self.epoch+':'+str(self.latest.get(target,0))
    def image_reply_allowed(self,event,followups):
        return event['event_id'] not in followups and not self.superseded(event['chat_id'],event.get('arrival_stamp'))
