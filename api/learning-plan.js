module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  let plan = null;
  if (req.method === 'POST' && req.body) {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    plan = body.plan || null;
  }
  return res.status(200).json({ ok: true, guest: false, plan });
};
