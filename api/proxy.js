export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'POST') {
    // proxy submit: POST /api/proxy?url=FORM_RESPONSE_URL
    const target = req.query.url;
    if (!target) return res.status(400).json({ error: 'missing ?url=' });
    try {
      const body = typeof req.body === 'string' ? req.body : new URLSearchParams(req.body).toString();
      // Vercel parses body; fallback read raw
      let raw = body;
      if (!raw) {
        const chunks=[]; for await (const c of req) chunks.push(c);
        raw = Buffer.concat(chunks).toString();
      }
      const r = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
        body: raw,
        redirect: 'manual'
      });
      const text = await r.text();
      return res.status(200).json({ status: r.status, ok: r.status>=200 && r.status<400, body: text.slice(0,2000) });
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'missing ?url=' });
  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const text = await r.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
