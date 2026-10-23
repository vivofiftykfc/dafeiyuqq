"""Local-only OpenAI compatible embeddings using a pinned downloaded ONNX model."""
import os
import pathlib
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
os.environ['HF_HUB_DISABLE_XET']='1'
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
from threading import Lock
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

ROOT=pathlib.Path(__file__).resolve().parents[1]
MODEL='BAAI/bge-small-zh-v1.5'
MODEL_DIR=ROOT/'runtime/models/models--Qdrant--bge-small-zh-v1.5/snapshots/46fbe35fd4374a00fee7de77dfddaeb6dd6a2c59'
tokenizer=Tokenizer.from_file(str(MODEL_DIR/'tokenizer.json'))
tokenizer.enable_truncation(max_length=512)
tokenizer.enable_padding(pad_id=0,pad_token='[PAD]')
options=ort.SessionOptions();options.intra_op_num_threads=2
session=ort.InferenceSession(str(MODEL_DIR/'model_optimized.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
lock=Lock()
def embed(texts):
    with lock:
        encodings=tokenizer.encode_batch(texts)
        inputs={'input_ids':np.array([e.ids for e in encodings],dtype=np.int64),'attention_mask':np.array([e.attention_mask for e in encodings],dtype=np.int64),'token_type_ids':np.array([e.type_ids for e in encodings],dtype=np.int64)}
        output=session.run(None,{i.name:inputs[i.name] for i in session.get_inputs()})[0]
    vectors=output[:,0] if output.ndim==3 else output
    return vectors/np.maximum(np.linalg.norm(vectors,axis=1,keepdims=True),1e-12)
app=FastAPI()
class Input(BaseModel):
    input: str|list[str]
    model: str=MODEL
@app.get('/health')
def health():return {'ready':True,'model':MODEL,'local_only':True}
@app.post('/v1/embeddings')
def embeddings(body:Input):
    texts=[body.input] if isinstance(body.input,str) else body.input
    if not texts:raise ValueError('input must not be empty')
    vectors=embed(texts)
    return {'object':'list','model':MODEL,'data':[{'object':'embedding','index':i,'embedding':v.tolist()} for i,v in enumerate(vectors)],'usage':{'prompt_tokens':0,'total_tokens':0}}
if __name__=='__main__':uvicorn.run(app,host='127.0.0.1',port=18002,access_log=False)
