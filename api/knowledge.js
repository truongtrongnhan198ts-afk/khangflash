module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ ok: true, guest: false, entries: [] });
};
