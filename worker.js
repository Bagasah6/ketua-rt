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

const SLOT_RANGES = {
  dinihari: ['00:00', '06:00'],
  pagi: ['06:01', '11:00'],
  siang: ['11:01', '15:00'],
  sore: ['15:01', '18:00'],
  malam: ['18:01', '23:59'],
};

const WIB_EXPR = "datetime(created_at, '+7 hours')";

function buildTimeFilter(url) {
  const periodParam = url.searchParams.get('period') || 'all';
  const period = periodParam === 'day' || periodParam === 'month' ? periodParam : 'all';
  const dateParam = url.searchParams.get('date') || '';
  const monthParam = url.searchParams.get('month') || '';
  const slotParam = url.searchParams.get('slot') || 'all';
  const slot = SLOT_RANGES[slotParam] ? slotParam : 'all';

  const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
  const defaultDate = wibNow.toISOString().slice(0, 10);
  const defaultMonth = defaultDate.slice(0, 7);

  const clauses = [];
  const params = [];
  const periodClauses = [];
  const periodParams = [];

  if (period === 'day') {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : defaultDate;
    periodClauses.push("created_at >= datetime(? || ' 00:00:00', '-7 hours') AND created_at < datetime(? || ' 00:00:00', '+1 day', '-7 hours')");
    periodParams.push(d, d);
  } else if (period === 'month') {
    const m = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : defaultMonth;
    periodClauses.push("created_at >= datetime(? || '-01 00:00:00', '-7 hours') AND created_at < datetime(? || '-01 00:00:00', '+1 month', '-7 hours')");
    periodParams.push(m, m);
  }

  clauses.push(...periodClauses);
  params.push(...periodParams);

  if (slot !== 'all') {
    const [startT, endT] = SLOT_RANGES[slot];
    clauses.push(`strftime('%H:%M', ${WIB_EXPR}) BETWEEN ? AND ?`);
    params.push(startT, endT);
  }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const andWhere = clauses.length ? 'AND ' + clauses.join(' AND ') : '';
  const periodWhere = periodClauses.length ? 'WHERE ' + periodClauses.join(' AND ') : '';
  return { period, slot, where, andWhere, params, periodWhere, periodParams };
}

function bind(stmt, params) {
  return params.length ? stmt.bind(...params) : stmt;
}

async function handleStats(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return json({ error: 'ADMIN_TOKEN not configured' }, 503);
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${token}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const f = buildTimeFilter(url);
  const timelineExpr = f.period === 'day'
    ? `strftime('%H', ${WIB_EXPR})`
    : f.period === 'month'
      ? `date(${WIB_EXPR})`
      : `strftime('%Y-%m', ${WIB_EXPR})`;

  const [summary, devices, tutorial, weeklyFunnel, eventChoices, shares, endings, feedbacks, timeSlots, timeline, versions, retention, maxWeeks] = await Promise.all([
    bind(env.DB.prepare(`
      SELECT
        COUNT(*) AS totalEvents,
        COUNT(DISTINCT client_id) AS uniquePlayers,
        COUNT(DISTINCT CASE WHEN event_name = 'game_start' THEN client_id END) AS startedPlayers,
        COUNT(DISTINCT CASE WHEN event_name = 'game_ending' THEN client_id END) AS completedPlayers,
        SUM(CASE WHEN event_name = 'share_click' THEN 1 ELSE 0 END) AS totalShares,
        SUM(CASE WHEN event_name = 'trakteer_click' THEN 1 ELSE 0 END) AS trakteerClicks
      FROM events ${f.where}
    `), f.params).first(),
    bind(env.DB.prepare(`
      SELECT COALESCE(device, 'unknown') AS device, COUNT(DISTINCT client_id) AS players
      FROM events ${f.where} GROUP BY device ORDER BY players DESC
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT COALESCE(json_extract(payload, '$.status'), 'unknown') AS status, COUNT(*) AS count
      FROM events WHERE event_name = 'tutorial_end' ${f.andWhere} GROUP BY status
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT week, COUNT(DISTINCT client_id) AS players
      FROM events WHERE event_name = 'week_end' AND week IS NOT NULL ${f.andWhere}
      GROUP BY week ORDER BY week ASC
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT
        json_extract(payload, '$.eventId') AS eventId,
        json_extract(payload, '$.choiceId') AS choiceId,
        COUNT(*) AS count
      FROM events WHERE event_name = 'event_choice' ${f.andWhere}
      GROUP BY eventId, choiceId ORDER BY count DESC LIMIT 20
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT
        COALESCE(json_extract(payload, '$.platform'), 'unknown') AS platform,
        COALESCE(json_extract(payload, '$.type'), 'game') AS type,
        COUNT(*) AS count
      FROM events WHERE event_name = 'share_click' ${f.andWhere}
      GROUP BY platform, type ORDER BY count DESC
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT COALESCE(json_extract(payload, '$.endingId'), 'unknown') AS endingId, COUNT(*) AS count
      FROM events WHERE event_name = 'game_ending' ${f.andWhere}
      GROUP BY endingId ORDER BY count DESC
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT
        id,
        COALESCE(device, 'unknown') AS device,
        COALESCE(version, '') AS version,
        COALESCE(json_extract(payload, '$.category'), 'Umum') AS category,
        COALESCE(json_extract(payload, '$.message'), '') AS message,
        ${WIB_EXPR} AS created_at
      FROM events WHERE event_name = 'dev_feedback' ${f.andWhere}
      ORDER BY id DESC LIMIT 50
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT
        CASE
          WHEN strftime('%H:%M', ${WIB_EXPR}) BETWEEN '00:00' AND '06:00' THEN 'dinihari'
          WHEN strftime('%H:%M', ${WIB_EXPR}) BETWEEN '06:01' AND '11:00' THEN 'pagi'
          WHEN strftime('%H:%M', ${WIB_EXPR}) BETWEEN '11:01' AND '15:00' THEN 'siang'
          WHEN strftime('%H:%M', ${WIB_EXPR}) BETWEEN '15:01' AND '18:00' THEN 'sore'
          ELSE 'malam'
        END AS slot,
        COUNT(DISTINCT client_id) AS players,
        COUNT(*) AS events
      FROM events ${f.periodWhere}
      GROUP BY slot
    `), f.periodParams).all(),
    bind(env.DB.prepare(`
      SELECT ${timelineExpr} AS label, COUNT(DISTINCT client_id) AS players, COUNT(*) AS events
      FROM events ${f.where}
      GROUP BY label ORDER BY label ASC
    `), f.params).all(),
    bind(env.DB.prepare(`
      SELECT COALESCE(NULLIF(version, ''), 'unknown') AS version, COUNT(DISTINCT client_id) AS players
      FROM events ${f.where}
      GROUP BY version ORDER BY players DESC
    `), f.params).all(),
    bind(env.DB.prepare(`
      WITH firsts AS (
        SELECT client_id, MIN(date(${WIB_EXPR})) AS first_day, COUNT(DISTINCT date(${WIB_EXPR})) AS active_days
        FROM events GROUP BY client_id
      ),
      cohort AS (
        SELECT
          fr.client_id,
          fr.first_day,
          fr.active_days,
          MAX(CASE WHEN date(datetime(e.created_at, '+7 hours')) = date(fr.first_day, '+1 day') THEN 1 ELSE 0 END) AS d1,
          MAX(CASE WHEN date(datetime(e.created_at, '+7 hours')) >= date(fr.first_day, '+7 days') THEN 1 ELSE 0 END) AS d7_plus
        FROM firsts fr
        JOIN events e ON e.client_id = fr.client_id
        GROUP BY fr.client_id, fr.first_day, fr.active_days
      ),
      scoped AS (
        SELECT DISTINCT client_id FROM events ${f.where}
      )
      SELECT
        COUNT(*) AS totalScoped,
        SUM(CASE WHEN c.active_days >= 2 THEN 1 ELSE 0 END) AS returningPlayers,
        SUM(CASE WHEN c.active_days = 1 THEN 1 ELSE 0 END) AS singleDayPlayers,
        SUM(CASE WHEN c.first_day <= date('now', '+7 hours', '-1 day') THEN 1 ELSE 0 END) AS d1Eligible,
        SUM(CASE WHEN c.first_day <= date('now', '+7 hours', '-1 day') AND c.d1 = 1 THEN 1 ELSE 0 END) AS d1Retained,
        SUM(CASE WHEN c.first_day <= date('now', '+7 hours', '-7 days') THEN 1 ELSE 0 END) AS d7Eligible,
        SUM(CASE WHEN c.first_day <= date('now', '+7 hours', '-7 days') AND c.d7_plus = 1 THEN 1 ELSE 0 END) AS d7Retained
      FROM scoped s
      JOIN cohort c ON c.client_id = s.client_id
    `), f.params).first(),
    bind(env.DB.prepare(`
      SELECT AVG(max_w) AS avgMaxWeek
      FROM (
        SELECT client_id, MAX(week) AS max_w
        FROM events
        WHERE event_name = 'week_end' AND week IS NOT NULL ${f.andWhere}
        GROUP BY client_id
      )
    `), f.params).first(),
  ]);

  return json({
    filter: { period: f.period, slot: f.slot },
    summary: summary || {},
    devices: devices.results || [],
    tutorial: tutorial.results || [],
    weeklyFunnel: weeklyFunnel.results || [],
    eventChoices: eventChoices.results || [],
    shares: shares.results || [],
    endings: endings.results || [],
    feedbacks: feedbacks.results || [],
    timeSlots: timeSlots.results || [],
    timeline: timeline.results || [],
    versions: versions.results || [],
    retention: retention || {},
    avgMaxWeek: maxWeeks && maxWeeks.avgMaxWeek ? Math.round(maxWeeks.avgMaxWeek * 10) / 10 : 0,
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
