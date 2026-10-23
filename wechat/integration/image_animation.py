"""Bounded animation inspection; original bytes and vision samples are distinct."""
import io
from PIL import Image

def inspect(raw,samples=False):
    if not 0<len(raw)<=16*1024*1024:raise ValueError('Invalid animation size')
    with Image.open(io.BytesIO(raw)) as image:
        if image.format not in ('GIF','PNG','WEBP','JPEG'):raise ValueError('Unsupported image')
        count=getattr(image,'n_frames',1)
        if count>300 or image.width*image.height>24000000 or image.width*image.height*count>100000000:raise ValueError('Animation exceeds decode budget')
        selected={0,count//2,count-1} if samples else set();output=[];elapsed=0
        info={'format':image.format,'frames':count,'animated':count>1,'loop':image.info.get('loop'),'duration_ms':0}
        for index in range(count):
            image.seek(index);image.load()
            duration=image.info.get('duration',0)
            if not isinstance(duration,(int,float)) or not 0<=duration<=600000:duration=0
            if index in selected:
                frame=image.convert('RGB');frame.thumbnail((1536,1536));buffer=io.BytesIO();frame.save(buffer,format='JPEG',quality=90)
                output.append({'frame':index,'time_ms':elapsed,'jpeg':buffer.getvalue()})
            elapsed+=duration
        info['duration_ms']=elapsed
        return info,output

def incoming_bytes(raw):
    info,_=inspect(raw)
    if info['animated']:return raw,{'GIF':'.gif','PNG':'.png','WEBP':'.webp'}[info['format']]
    from media_core import image_bytes
    return image_bytes(raw),'.jpg'
