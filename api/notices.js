const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const raw = await kv.lrange('notices', 0, 29);
      const notices = raw.map(n => typeof n === 'string' ? JSON.parse(n) : n);
      return res.json(notices);
    } catch (e) {
      return res.json([]);
    }
  }

  if (req.method === 'POST') {
    const { name, message } = req.body;
    if (!name || !message) return res.status(400).json({ error: 'Missing fields' });
    const notice = { id: Date.now(), name, message, time: new Date().toISOString() };
    await kv.lpush('notices', JSON.stringify(notice));
    await kv.ltrim('notices', 0, 29);
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    const raw = await kv.lrange('notices', 0, -1);
    const filtered = raw.filter(n => {
      try { return String(JSON.parse(n).id) !== String(id); } catch { return true; }
    });
    await kv.del('notices');
    for (const n of filtered.reverse()) await kv.rpush('notices', n);
    return res.json({ ok: true });
  }

  res.status(405).end();
};
