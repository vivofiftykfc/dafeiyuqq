import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {guard,DATA,OWNER,onebot,qzonePost} from './owner-services.js';
import {sharedImage} from './shared-images.js';
import {validateFetchUrl} from './safe-fetch.js';
const file=path.join(DATA,'discovery-shares.json');
export function history(){guard();return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];}
const save=rows=>{fs.writeFileSync(file+'.tmp',JSON.stringify(rows,null,2));fs.renameSync(file+'.tmp',file);};
export async function share({channel,content,sourcePage,imageId}){
 guard();if(!['private','qzone'].includes(channel))throw Error('Unknown destination');
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'numeric',hourCycle:'h23'}).format(new Date()));
 if(channel==='private'&&(hour>=23||hour<9))throw Error('Quiet hours: save this discovery for daytime');
 if(!content.trim()||content.length>1200)throw Error('Use a short caption');
 const source=await validateFetchUrl(sourcePage,{publicDnsFallback:true});if(source.url.protocol!=='https:')throw Error('Use HTTPS source links');
 const img=imageId?sharedImage(imageId):null;
 const rows=history(),key=crypto.createHash('sha256').update(imageId||source.url.href).digest('hex');
 if(rows.some(r=>r.key===key))throw Error('This discovery was already shared or attempted; do not repost it to another destination');
 const recent=rows.filter(r=>Date.now()-r.at<86400000&&r.channel===channel);
 if(recent.length>=2||recent.some(r=>Date.now()-r.at<7200000))throw Error('Keep spontaneous discoveries occasional: at most two/day per destination, two hours apart');
 const row={key,channel,content,sourcePage:source.url.href,imageId,at:Date.now(),status:'pending'};rows.push(row);save(rows);
 try{
  const text=content+'\n来源：'+source.url.href;
  const result=channel==='qzone'?await qzonePost(text,img?[img.file]:[]):await onebot('send_private_msg',{user_id:Number(OWNER),message:[{type:'text',data:{text}},...(img?[{type:'image',data:{file:'base64://'+fs.readFileSync(img.file).toString('base64')}}]:[])]});
  row.status='sent';row.result=result;save(rows);return result;
 }catch(e){row.status='failed-or-unknown';save(rows);throw e;}
}
