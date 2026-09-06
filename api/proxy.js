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
      // read raw body (Vercel may parse as object)
      let raw='';
      if(typeof req.body === 'string') raw=req.body;
      else if(req.body && typeof req.body==='object') raw=Object.entries(req.body).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
      if(!raw){
        const chunks=[]; for await (const c of req) chunks.push(c);
        raw = Buffer.concat(chunks).toString();
      }
      // fix double-encoded? ensure not
      const r = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', 'Accept':'text/html', 'Referer':'https://docs.google.com/' },
        body: raw,
        redirect: 'manual'
      });
      const text = await r.text();
      const loc = r.headers.get('location')||'';
      // Google redirects to viewform?viewscore on success (302)
      const ok = (r.status>=200 && r.status<400) || loc.includes('viewform');
      return res.status(200).json({ status: r.status, location: loc.slice(0,300), ok, body: text.slice(0,1200) });
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
