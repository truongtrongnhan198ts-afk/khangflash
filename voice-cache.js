/* Device-local audio reuse; keys include account, exact text, accent and speaker. */
window.KVoiceAudioStore=(()=>{
 const name='tidian-voice-audio-v1',ttl=7*86400000,maxBytes=24*1024*1024;
 async function open(){return window.caches?.open(name);}
 async function key(value){const bytes=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return new Request(new URL('/__tidian_voice_audio/'+Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),location.origin));}
 async function get(value){try{const cache=await open();if(!cache)return null;const req=await key(value),hit=await cache.match(req);if(!hit)return null;if(Date.now()-Number(hit.headers.get('x-created-at'))>ttl){await cache.delete(req);return null;}const data=await hit.json();return data?.mimeType==='audio/wav'&&typeof data.audio==='string'&&data.audio.length<5601000?data:null;}catch{return null;}}
 async function put(value,data){try{const cache=await open();if(!cache)return;const size=JSON.stringify(data).length;if(size>5602000)return;const req=await key(value);await cache.delete(req);await cache.put(req,new Response(JSON.stringify(data),{headers:{'content-type':'application/json','x-created-at':String(Date.now()),'x-audio-bytes':String(size)}}));const keys=await cache.keys();let bytes=0;const rows=[];for(const k of keys){const hit=await cache.match(k);const n=Number(hit?.headers.get('x-audio-bytes'))||0;bytes+=n;rows.push([k,n]);}while(rows.length>40||bytes>maxBytes){const [k,n]=rows.shift();await cache.delete(k);bytes-=n;}}catch{/* Playback remains available when browser storage is full or disabled. */}}
 return {get,put};
})();
