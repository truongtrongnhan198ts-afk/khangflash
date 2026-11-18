export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    return res.status(200).json({
      ok: true,
      cards: (body.reviews || []).map(r => ({ card_id: r.id || r.card_id, status: r.status || 'known', reps: 1, interval: 1 })),
      activityDate: new Date().toISOString().split('T')[0],
      ...body
    });
  }
  return res.status(200).json({
    guest: false,
    accountKey: 'khangflash-user',
    today: new Date().toISOString().split('T')[0],
    cards: [],
    settings: { band: 9, daily_goal: 20, exam_date: '' },
    history: [],
    activity: []
  });
}
