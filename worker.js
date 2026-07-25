/**
 * Cloudflare Worker — CORS proxy per 10eLotto
 *
 * Setup (5 minuti, gratis):
 * 1. Vai su https://dash.cloudflare.com → Workers & Pages → Create → Create Worker
 * 2. Incolla questo codice nell'editor, clicca Deploy
 * 3. Copia l'URL del worker (es. https://10elotto-proxy.TUONOME.workers.dev)
 * 4. Incollalo nella variabile PROXY_URL dentro index.html
 *
 * Limite piano free: 100.000 richieste/giorno → più che sufficiente.
 */

const ALLOWED_HOSTS = ['lottologia.com', '10elotto5minuti.com'];

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response('Parametro ?url mancante', { status: 400 });
    }

    // Security: only allow our known hosts
    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response('URL non valido', { status: 400 });
    }

    const isAllowed = ALLOWED_HOSTS.some(h => targetUrl.hostname === h || targetUrl.hostname.endsWith('.' + h));
    if (!isAllowed) {
      return new Response('Host non consentito: ' + targetUrl.hostname, { status: 403 });
    }

    // Fetch the target page pretending to be a normal browser
    const resp = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.5',
        'Referer': 'https://www.google.com/',
      },
    });

    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=240', // cache 4 min lato CF
      },
    });
  },
};
