import { KokoroTTS } from '/vendor/kokoro/kokoro.web.js';
let loading=null,tts=null,latest=0,queue=Promise.resolve();
const send=(id,message)=>{if(id===latest)postMessage({id,type:'progress',message});};
async function model(){
 if(tts)return tts;
 if(!loading)loading=KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX',{
  dtype:'q8',device:'wasm',progress_callback:p=>{
   if(p.status==='progress')send(latest,'Đang tải Kokoro trên máy'+(Number.isFinite(p.progress)?' · '+Math.round(p.progress)+'%':'')+'…');
  }
 }).then(value=>(tts=value)).catch(error=>{loading=null;throw error;});
 return loading;
}
self.onmessage=({data})=>{
 latest=data.id;if(data.type!=='generate')return;
 queue=queue.catch(()=>{}).then(async()=>{
  const {id,text,voice}=data;if(id!==latest)return;
  try{
   send(id,'Đang tải bộ đọc Kokoro; lần đầu có thể mất vài phút…');
   const engine=await model();if(id!==latest)return;
   if(!Object.hasOwn(engine.voices,voice))throw new Error('Giọng không có trong bộ Kokoro.');
   // Split at sentence boundaries, preserving words, to avoid silent tokenizer truncation.
   const chunks=String(text).match(/[^.!?]+[.!?]*|[.!?]+/g)||[text];
   const parts=[];for(const sentence of chunks){let chunk='';for(const word of sentence.split(/\s+/).filter(Boolean)){if(chunk.length+word.length>350){parts.push(chunk);chunk='';}chunk+=(chunk?' ':'')+word;}if(chunk)parts.push(chunk);}
   const arrays=[];let size=0;
   for(const part of parts){if(id!==latest)return;send(id,'Kokoro đang tạo giọng '+engine.voices[voice].name+' trên máy…');const audio=await engine.generate(part,{voice,speed:1});arrays.push(audio.audio);size+=audio.audio.length;}
   if(id!==latest)return;
   const pcm=new Float32Array(size);let offset=0;for(const a of arrays){pcm.set(a,offset);offset+=a.length;}
   const wav=new ArrayBuffer(44+pcm.length*2),view=new DataView(wav);
   const str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};
   str(0,'RIFF');view.setUint32(4,36+pcm.length*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,24000,true);view.setUint32(28,48000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,pcm.length*2,true);
   pcm.forEach((s,i)=>view.setInt16(44+i*2,Math.max(-1,Math.min(1,s))*(s<0?32768:32767),true));
   postMessage({id,type:'audio',wav},[wav]);
  }catch(error){if(id===latest)postMessage({id,type:'error',message:error.message||'Không tải được mô hình.'});}
 });
};
