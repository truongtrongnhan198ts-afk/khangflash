'use strict';
const Parser=require('rss-parser');
const parser=new Parser();
const sources={
 news:[
  {source:'BBC',url:'https://feeds.bbci.co.uk/news/rss.xml',topics:['world']},
  {source:'The Guardian',url:'https://www.theguardian.com/international/rss',topics:['world']},
  {source:'Al Jazeera',url:'https://www.aljazeera.com/xml/rss/all.xml',topics:['world']},
  {source:'VOA Learning English',url:'https://learningenglish.voanews.com/api/zkm-ql-vomx-tpej-rqi',topics:['language','education']},
  {source:'VnExpress International',url:'https://e.vnexpress.net/rss/news.rss',topics:['vietnam']}
 ],
 podcasts:[
  {source:'NPR',show:'NPR News Now',url:'https://feeds.npr.org/500005/podcast.xml',topics:['world']},
  {source:'The Guardian',show:'Today in Focus',url:'https://www.theguardian.com/news/series/todayinfocus/podcast.xml',topics:['world','society']},
  {source:'VOA Learning English',show:'As It Is',url:'https://learningenglish.voanews.com/podcast/?zoneId=3521',topics:['english','education']}
 ]
};
const groups={politics:'world',conflict:'world',society:'world',history:'world',economy:'business',finance:'business',work:'business',ai:'technology',digital:'technology',space:'science',climate:'science_and_environment',nature:'science_and_environment',medicine:'health',psychology:'health',fitness:'health',relationships:'life',food:'life',travel:'life',language:'education',arts:'culture',media:'culture',football:'sport','other-sports':'sport','english-skills':'english'};
const bbc={world:'world',business:'business',technology:'technology',science:'science_and_environment',science_and_environment:'science_and_environment',health:'health',education:'education',culture:'entertainment_and_arts',sport:null};
const hints={politics:/election|president|government|minister/i,conflict:/war\b|military|attack|peace/i,business:/economy|economic|market|business|trade/i,technology:/technology|digital|artificial intelligence|\bAI\b|software/i,health:/health|medical|medicine|hospital/i,science:/science|research|space|scientist/i,climate:/climate|emissions|warming/i,education:/education|school|student|university/i,culture:/culture|museum|music|film|art\b/i,sport:/football|soccer|sport|match/i};
const clean=s=>String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[x])).replace(/\s+/g,' ').trim();
const webUrl=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
function createService(fetcher=fetch){
 const cache=new Map();
 async function getText(url,allowed){
  for(let redirects=0;redirects<4;redirects++){
   const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||!allowed.has(u.hostname))throw Error('Nguồn không được hỗ trợ.');
   const r=await fetcher(u.href,{redirect:'manual',signal:AbortSignal.timeout(6500),headers:{'User-Agent':'KhangFlash/1.0 (+https://khangflash.vercel.app)','Accept':'application/rss+xml, application/xml, text/xml, text/html;q=0.8'}});
   if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),u).href;continue;}
   if(!r.ok)throw Error('Nguồn trả lỗi '+r.status);const text=await r.text();if(text.length>4000000)throw Error('Nội dung nguồn quá lớn.');return text;
  }
  throw Error('Nguồn chuyển hướng quá nhiều.');
 }
 async function feed(config){
  const previous=cache.get(config.url);if(previous&&Date.now()-previous.at<300000)return previous.items;
  const xml=await getText(config.url,new Set([new URL(config.url).hostname])),parsed=await parser.parseString(xml);
  const items=(parsed.items||[]).map(item=>{
   const title=clean(item.title),url=webUrl(item.link),date=new Date(item.isoDate||item.pubDate),audio=webUrl(item.enclosure?.url);
   if(!title||!url||!Number.isFinite(date.getTime()))return null;
   const articleTopics=Object.entries(hints).filter(([,rx])=>rx.test(title)).map(([key])=>key),fullText=new URL(url).hostname==='learningenglish.voanews.com'&&/^\/a\/[^/]+\/\d+\.html$/.test(new URL(url).pathname);
   return{title,url,date:date.toISOString(),source:config.source,intro:clean(item.contentSnippet||item.summary||item.content).slice(0,900),topic:config.topics[0],sectionTopics:config.topics,articleTopics,fullText,audio,show:config.show||parsed.title||'',duration:item.itunes?.duration||'',programTopics:config.topics,episodeTopics:articleTopics,transcript:fullText};
  }).filter(Boolean);cache.set(config.url,{at:Date.now(),items});return items;
 }
 async function list(kind,query={}){
  const selected=String(query.source||'all'),topic=String(query.topic||'all'),group=groups[topic]||topic;
  const configs=sources[kind].filter(s=>selected==='all'||s.source===selected).map(s=>s.source==='BBC'&&topic!=='all'&&bbc[group]?{...s,url:'https://feeds.bbci.co.uk/news/'+bbc[group]+'/rss.xml',topics:[topic,group]}:s);
  if(!configs.length)return{items:[],unavailable:[selected],updated:new Date().toISOString()};
  const results=await Promise.allSettled(configs.map(feed)),unavailable=[],byUrl=new Map();let success=0;
  results.forEach((result,i)=>{if(result.status==='rejected'){unavailable.push(configs[i].source);return;}success++;for(const item of result.value){if(kind==='podcasts'&&!item.audio)continue;const tags=[...item.sectionTopics,...item.articleTopics];if(topic!=='all'&&!tags.includes(topic)&&!tags.includes(group))continue;if(kind==='news'&&String(query.full)==='1'&&!item.fullText)continue;byUrl.set(item.url,item);}});
  if(!success)throw Error('Chưa tải được các nguồn tin. Thử lại sau; dữ liệu học đã lưu vẫn được giữ.');
  return{items:[...byUrl.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100),unavailable,updated:new Date().toISOString()};
 }
 async function article(raw){
  let u;try{u=new URL(raw);}catch{throw Error('URL bài viết không hợp lệ.');}
  if(u.protocol!=='https:'||u.hostname!=='learningenglish.voanews.com'||u.port||u.username||u.password||!/^\/a\/(?:[^/]+\/)?\d+\.html$/.test(u.pathname))throw Error('Chỉ hỗ trợ bài VOA Learning English.');
  u.search='';u.hash='';const html=await getText(u.href,new Set(['learningenglish.voanews.com']));
  const start=html.search(/<div\b[^>]*class="[^"]*\bwsw\b/i);if(start<0)throw Error('Chưa tách được toàn văn. Hãy mở bài gốc.');
  const body=html.slice(start).split(/<div\b[^>]*class="[^"]*(?:related|author|comments|social)/i)[0];
  const paragraphs=[...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>clean(x[1])).filter(x=>x.length>15).slice(0,120);
  if(!paragraphs.length)throw Error('Nguồn chưa có toàn văn dạng chữ. Hãy mở bài gốc.');
  return{url:u.href,paragraphs};
 }
 return{list,article};
}
module.exports={createService,clean,sources};
