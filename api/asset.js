export const config = { runtime: 'edge' };

const SUPA = 'https://kvkodidoedcdwtuahgkf.supabase.co/storage/v1/object/public';
const BUCKETS = new Set(['game-assets', 'cards']);

export default async function handler(req) {
  const url = new URL(req.url);
  const bucket = url.searchParams.get('b') || 'game-assets';
  const path = url.searchParams.get('p') || '';
  if (!BUCKETS.has(bucket) || !path || path.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const target = `${SUPA}/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const range = req.headers.get('range');

  // كاش الحافة: نفس الملف يُخدم فوراً لكل الزوار بعد أول طلب
  const cache = caches.default;
  const cacheKey = new Request(url.origin + '/_a/' + bucket + '/' + path, { method: 'GET' });

  if (!range) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const h = new Headers(hit.headers);
      h.set('x-edge-cache', 'HIT');
      return new Response(hit.body, { status: hit.status, headers: h });
    }
  }

  const upstream = await fetch(target, {
    headers: range ? { range } : undefined,
    cf: { cacheEverything: true, cacheTtl: 31536000 },
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Not found', { status: upstream.status });
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
  const len = upstream.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  const cr = upstream.headers.get('content-range');
  if (cr) headers.set('Content-Range', cr);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Timing-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

  const ttl = bucket === 'cards' ? 'public, max-age=600, s-maxage=31536000, stale-while-revalidate=86400' : 'public, max-age=31536000, immutable';
  headers.set('Cache-Control', ttl);
  headers.set('CDN-Cache-Control', 'public, max-age=31536000');
  headers.set('Vercel-CDN-Cache-Control', 'public, max-age=31536000');
  headers.set('x-edge-cache', 'MISS');

  const res = new Response(upstream.body, { status: upstream.status, headers });
  if (!range && (upstream.status === 200)) {
    try { await cache.put(cacheKey, res.clone()); } catch (_) {}
  }
  return res;
}
