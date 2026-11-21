const ALLOWED_EVENTS = new Set([
  'game_start',
  'tutorial_end',
  'week_end',
  'event_choice',
  'share_click',
  'game_ending',
  'dev_feedback',
  'trakteer_click',
]);

const ALLOWED_DEVICES = new Set(['mobile', 'tablet', 'desktop']);
const MAX_BODY_BYTES = 2048;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && (u.hostname === 'ketua-rt.mbagasah.workers.dev' || u.hostname.endsWith('-ketua-rt.mbagasah.workers.dev'))) {
      return true;
    }
    if ((u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return true;
    }
  } catch {}
  return false;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  });
}

async function handleTrack(request, env) {
  const origin = request.headers.get('origin') || '';
  if (!isAllowedOrigin(origin)) {
    return json({ error: 'Forbidden origin' }, 403);
  }
  const cl = Number(request.headers.get('content-length') || 0);
  if (cl > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large' }, 413);
  }
  const raw = await request.text();
  if (!raw || raw.length > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large or empty' }, raw ? 413 : 400);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const eventName = typeof body.event_name === 'string' ? body.event_name.trim() : '';
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
  if (!ALLOWED_EVENTS.has(eventName) || !clientId || clientId.length > 64) {
    return json({ error: 'Invalid event or client_id' }, 400);
  }

  const week = Number.isInteger(body.week) && body.week >= 0 && body.week <= 100 ? body.week : null;
  const version = typeof body.version === 'string' ? body.version.slice(0, 16) : null;
  const device = ALLOWED_DEVICES.has(body.device) ? body.device : 'desktop';
  let cleanPayload = body.payload && typeof body.payload === 'object' ? body.payload : null;
  if (eventName === 'dev_feedback' && cleanPayload) {
    const allowedCats = new Set(['Saran Fitur', 'Lapor Bug', 'Kritik']);
    const category = allowedCats.has(cleanPayload.category) ? cleanPayload.category : 'Kritik';
    const message = typeof cleanPayload.message === 'string' ? cleanPayload.message.trim().slice(0, 400) : '';
    if (!message) return json({ error: 'Empty feedback' }, 400);
    cleanPayload = { category, message };
  }
  const payloadStr = cleanPayload ? JSON.stringify(cleanPayload) : null;
  const payload = payloadStr && payloadStr.length <= 1024 ? payloadStr : (payloadStr ? JSON.stringify({ truncated: true }) : null);

  await env.DB.prepare(
    'INSERT INTO events (client_id, event_name, week, version, device, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  ).bind(clientId, eventName, week, version, device, payload).run();

  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin } });
}

async function handleStats(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return json({ error: 'ADMIN_TOKEN not configured' }, 503);
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${token}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const [summary, devices, tutorial, weeklyFunnel, eventChoices, shares, endings, feedbacks] = await Promise.all([
    env.DB.prepare(`
      SELECT
        COUNT(*) AS totalEvents,
        COUNT(DISTINCT client_id) AS uniquePlayers,
        COUNT(DISTINCT CASE WHEN event_name = 'game_start' THEN client_id END) AS startedPlayers,
        COUNT(DISTINCT CASE WHEN event_name = 'game_ending' THEN client_id END) AS completedPlayers,
        SUM(CASE WHEN event_name = 'share_click' THEN 1 ELSE 0 END) AS totalShares,
        SUM(CASE WHEN event_name = 'trakteer_click' THEN 1 ELSE 0 END) AS trakteerClicks
      FROM events
    `).first(),
    env.DB.prepare(`
      SELECT COALESCE(device, 'unknown') AS device, COUNT(DISTINCT client_id) AS players
      FROM events GROUP BY device ORDER BY players DESC
    `).all(),
    env.DB.prepare(`
      SELECT COALESCE(json_extract(payload, '$.status'), 'unknown') AS status, COUNT(*) AS count
      FROM events WHERE event_name = 'tutorial_end' GROUP BY status
    `).all(),
    env.DB.prepare(`
      SELECT week, COUNT(DISTINCT client_id) AS players
      FROM events WHERE event_name = 'week_end' AND week IS NOT NULL
      GROUP BY week ORDER BY week ASC
    `).all(),
    env.DB.prepare(`
      SELECT
        json_extract(payload, '$.eventId') AS eventId,
        json_extract(payload, '$.choiceId') AS choiceId,
        COUNT(*) AS count
      FROM events WHERE event_name = 'event_choice'
      GROUP BY eventId, choiceId ORDER BY count DESC LIMIT 20
    `).all(),
    env.DB.prepare(`
      SELECT
        COALESCE(json_extract(payload, '$.platform'), 'unknown') AS platform,
        COALESCE(json_extract(payload, '$.type'), 'game') AS type,
        COUNT(*) AS count
      FROM events WHERE event_name = 'share_click'
      GROUP BY platform, type ORDER BY count DESC
    `).all(),
    env.DB.prepare(`
      SELECT COALESCE(json_extract(payload, '$.endingId'), 'unknown') AS endingId, COUNT(*) AS count
      FROM events WHERE event_name = 'game_ending'
      GROUP BY endingId ORDER BY count DESC
    `).all(),
    env.DB.prepare(`
      SELECT
        id,
        COALESCE(device, 'unknown') AS device,
        COALESCE(version, '') AS version,
        COALESCE(json_extract(payload, '$.category'), 'Umum') AS category,
        COALESCE(json_extract(payload, '$.message'), '') AS message,
        created_at
      FROM events WHERE event_name = 'dev_feedback'
      ORDER BY id DESC LIMIT 50
    `).all(),
  ]);

  return json({
    summary: summary || {},
    devices: devices.results || [],
    tutorial: tutorial.results || [],
    weeklyFunnel: weeklyFunnel.results || [],
    eventChoices: eventChoices.results || [],
    shares: shares.results || [],
    endings: endings.results || [],
    feedbacks: feedbacks.results || [],
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/track') {
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('origin') || '';
        if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': origin,
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'content-type',
            'access-control-max-age': '86400',
          },
        });
      }
      if (request.method === 'POST') return handleTrack(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/stats') {
      if (request.method === 'GET') return handleStats(request, env);
      return json({ error: 'Method not allowed' }, 405);
    }

    return env.ASSETS.fetch(request);
  },
};
