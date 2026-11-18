module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const reviews = body.reviews || [];
    const today = new Date().toISOString().split('T')[0];
    return res.status(200).json({
      ok: true,
      duplicate: false,
      cards: reviews.map(function(r) {
        return {
          card_id: r.id || r.card_id || '',
          status: r.status || 'known',
          reps: 1,
          interval: 1,
          updated_at: new Date().toISOString()
        };
      }),
      activityDate: today
    });
  }

  // GET — return a valid non-guest state so KStore.load() succeeds
  const today = new Date().toISOString().split('T')[0];
  return res.status(200).json({
    guest: false,
    accountKey: 'khangflash-local',
    today: today,
    cards: [],
    settings: { band: 9, daily_goal: 20, exam_date: '' },
    history: [],
    activity: [],
    learningActivity: []
  });
};
