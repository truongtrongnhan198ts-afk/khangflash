const {createService}=require('../feed-service.cjs');
const service=createService();
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=300');
 if(req.method!=='GET')return res.status(405).json({error:'Chỉ hỗ trợ GET.'});
 try{const query=req.query||{},kind=query.kind||'news';if(!['news','podcasts','article'].includes(kind))return res.status(400).json({error:'Nguồn không hợp lệ.'});const data=kind==='article'?await service.article(query.url):await service.list(kind,query);return res.status(200).json(data);}catch(error){res.setHeader('Cache-Control','no-store');return res.status(502).json({error:error.message||'Nguồn tin tạm thời chưa sẵn sàng.'});}
};
