module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({
    ok: true,
    guest: false,
    accountKey: 'khangflash-local',
    today: new Date().toISOString().slice(0, 10),
    questions: [],
    errors: [],
    attempts: [],
    values: [],
    entries: [],
    articles: []
  });
};
