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
  if (!env.DB) {
    return json({ error: 'Database binding unavailable' }, 503, { 'access-control-allow-origin': origin });
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

  try {
    await env.DB.prepare(
      'INSERT INTO events (client_id, event_name, week, version, device, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(clientId, eventName, week, version, device, payload).run();
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin } });
  } catch (err) {
    return json({ error: (err && err.message) || 'DB insert failed' }, 500, { 'access-control-allow-origin': origin });
  }
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

const STATS_COOLDOWN_SEC = 300;

async function ensureSnapshotTable(db) {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS stats_snapshot (key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)'
  ).run();
}

function getSnapshotKey(url, f, withRet) {
  const hasExplicit = url.searchParams.has('period') || url.searchParams.has('date') || url.searchParams.has('month') || url.searchParams.has('slot') || url.searchParams.has('ret');
  if (!hasExplicit) return 'main';
  const dVal = f.period === 'day' ? (url.searchParams.get('date') || 'today') : f.period === 'month' ? (url.searchParams.get('month') || 'cur') : 'all';
  const wibToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (f.period === 'day' && (dVal === 'today' || dVal === wibToday) && f.slot === 'all' && !withRet) return 'main';
  return `${f.period}:${dVal}:${f.slot}:${withRet ? 1 : 0}`;
}

async function computeStats(env, url, f, withRet) {
  const timelineExpr = f.period === 'day'
    ? "strftime('%H', wib_dt)"
    : f.period === 'month'
      ? 'date(wib_dt)'
      : "strftime('%Y-%m', wib_dt)";

  const retentionSql = f.where
    ? `
      WITH scoped AS (
        SELECT DISTINCT client_id FROM events ${f.where}
      ),
      per_player AS (
        SELECT
          e.client_id,
          MIN(date(datetime(e.created_at, '+7 hours'))) AS first_day,
          MAX(date(datetime(e.created_at, '+7 hours'))) AS last_day,
          COUNT(DISTINCT date(datetime(e.created_at, '+7 hours'))) AS active_days,
          GROUP_CONCAT(DISTINCT date(datetime(e.created_at, '+7 hours'))) AS days_csv
        FROM events e
        WHERE e.client_id IN (SELECT client_id FROM scoped)
        GROUP BY e.client_id
      )
      SELECT
        COUNT(*) AS totalScoped,
        SUM(CASE WHEN active_days >= 2 THEN 1 ELSE 0 END) AS returningPlayers,
        SUM(CASE WHEN active_days = 1 THEN 1 ELSE 0 END) AS singleDayPlayers,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-1 day') THEN 1 ELSE 0 END) AS d1Eligible,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-1 day') AND instr(days_csv, date(first_day, '+1 day')) > 0 THEN 1 ELSE 0 END) AS d1Retained,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-7 days') THEN 1 ELSE 0 END) AS d7Eligible,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-7 days') AND last_day >= date(first_day, '+7 days') THEN 1 ELSE 0 END) AS d7Retained
      FROM per_player
    `
    : `
      WITH per_player AS (
        SELECT
          client_id,
          MIN(date(${WIB_EXPR})) AS first_day,
          MAX(date(${WIB_EXPR})) AS last_day,
          COUNT(DISTINCT date(${WIB_EXPR})) AS active_days,
          GROUP_CONCAT(DISTINCT date(${WIB_EXPR})) AS days_csv
        FROM events
        GROUP BY client_id
      )
      SELECT
        COUNT(*) AS totalScoped,
        SUM(CASE WHEN active_days >= 2 THEN 1 ELSE 0 END) AS returningPlayers,
        SUM(CASE WHEN active_days = 1 THEN 1 ELSE 0 END) AS singleDayPlayers,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-1 day') THEN 1 ELSE 0 END) AS d1Eligible,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-1 day') AND instr(days_csv, date(first_day, '+1 day')) > 0 THEN 1 ELSE 0 END) AS d1Retained,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-7 days') THEN 1 ELSE 0 END) AS d7Eligible,
        SUM(CASE WHEN first_day <= date('now', '+7 hours', '-7 days') AND last_day >= date(first_day, '+7 days') THEN 1 ELSE 0 END) AS d7Retained
      FROM per_player
    `;

  const [baseRows, tutorial, weeklyFunnel, eventChoices, shares, endings, feedbacks, timeSlots, retention, maxWeeks] = await Promise.all([
    bind(env.DB.prepare(`
      WITH base AS (
        SELECT client_id, event_name, device, version, ${WIB_EXPR} AS wib_dt
        FROM events ${f.where}
      )
      SELECT
        'sum' AS grp,
        '' AS k1,
        COUNT(*) AS v1,
        COUNT(DISTINCT client_id) AS v2,
        COUNT(DISTINCT CASE WHEN event_name = 'game_start' THEN client_id END) AS v3,
        COUNT(DISTINCT CASE WHEN event_name = 'game_ending' THEN client_id END) AS v4,
        SUM(CASE WHEN event_name = 'share_click' THEN 1 ELSE 0 END) AS v5,
        SUM(CASE WHEN event_name = 'trakteer_click' THEN 1 ELSE 0 END) AS v6
      FROM base
      UNION ALL
      SELECT 'dev' AS grp, COALESCE(device, 'unknown') AS k1, COUNT(DISTINCT client_id) AS v1, COUNT(*) AS v2, 0, 0, 0, 0 FROM base GROUP BY k1
      UNION ALL
      SELECT 'ver' AS grp, COALESCE(NULLIF(version, ''), 'unknown') AS k1, COUNT(DISTINCT client_id) AS v1, 0, 0, 0, 0, 0 FROM base GROUP BY k1
      UNION ALL
      SELECT 'tl' AS grp, ${timelineExpr} AS k1, COUNT(DISTINCT client_id) AS v1, COUNT(*) AS v2, 0, 0, 0, 0 FROM base GROUP BY k1
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
    withRet ? bind(env.DB.prepare(retentionSql), f.where ? f.params : []).first() : Promise.resolve(null),
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

  const rows = baseRows.results || [];
  const sumRow = rows.find(r => r.grp === 'sum') || {};
  const summary = {
    totalEvents: sumRow.v1 || 0,
    uniquePlayers: sumRow.v2 || 0,
    startedPlayers: sumRow.v3 || 0,
    completedPlayers: sumRow.v4 || 0,
    totalShares: sumRow.v5 || 0,
    trakteerClicks: sumRow.v6 || 0,
  };
  const devices = rows.filter(r => r.grp === 'dev').map(r => ({ device: r.k1, players: r.v1 })).sort((a, b) => b.players - a.players);
  const versions = rows.filter(r => r.grp === 'ver').map(r => ({ version: r.k1, players: r.v1 })).sort((a, b) => b.players - a.players);
  const timeline = rows.filter(r => r.grp === 'tl').map(r => ({ label: r.k1, players: r.v1, events: r.v2 })).sort((a, b) => String(a.label).localeCompare(String(b.label)));

  return {
    filter: { period: f.period, slot: f.slot },
    summary,
    devices,
    tutorial: tutorial.results || [],
    weeklyFunnel: weeklyFunnel.results || [],
    eventChoices: eventChoices.results || [],
    shares: shares.results || [],
    endings: endings.results || [],
    feedbacks: feedbacks.results || [],
    timeSlots: timeSlots.results || [],
    timeline,
    versions,
    retention: retention || null,
    avgMaxWeek: maxWeeks && maxWeeks.avgMaxWeek ? Math.round(maxWeeks.avgMaxWeek * 10) / 10 : 0,
  };
}

async function handleStats(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return json({ error: 'ADMIN_TOKEN not configured' }, 503);
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${token}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env.DB) return json({ error: 'Database binding unavailable' }, 503);

  try {
    const url = new URL(request.url);
    const f = buildTimeFilter(url);
    const withRet = url.searchParams.get('ret') === '1';
    const forceRefresh = (request.method === 'POST' && url.pathname === '/api/stats/refresh')
      || url.searchParams.get('refresh') === '1'
      || url.searchParams.get('fresh') === '1';
    const key = getSnapshotKey(url, f, withRet);
    const nowSec = Math.floor(Date.now() / 1000);

    let snap = null;
    try {
      snap = await env.DB.prepare('SELECT data, updated_at FROM stats_snapshot WHERE key = ?1').bind(key).first();
    } catch {
      await ensureSnapshotTable(env.DB);
    }

    if (!forceRefresh && snap) {
      const parsed = JSON.parse(snap.data);
      const retryAfter = Math.max(0, STATS_COOLDOWN_SEC - (nowSec - snap.updated_at));
      return json(
        { ...parsed, updatedAt: snap.updated_at, cooldownSeconds: STATS_COOLDOWN_SEC, retryAfter, throttled: false },
        200,
        { 'x-snapshot': 'HIT' }
      );
    }

    if (forceRefresh && snap && (nowSec - snap.updated_at) < STATS_COOLDOWN_SEC) {
      const parsed = JSON.parse(snap.data);
      const retryAfter = STATS_COOLDOWN_SEC - (nowSec - snap.updated_at);
      return json(
        { ...parsed, updatedAt: snap.updated_at, cooldownSeconds: STATS_COOLDOWN_SEC, retryAfter, throttled: true },
        200,
        { 'x-snapshot': 'COOLDOWN' }
      );
    }

    const data = await computeStats(env, url, f, withRet);
    const dataStr = JSON.stringify(data);
    try {
      await env.DB.prepare('INSERT OR REPLACE INTO stats_snapshot (key, data, updated_at) VALUES (?1, ?2, ?3)')
        .bind(key, dataStr, nowSec).run();
    } catch {
      await ensureSnapshotTable(env.DB);
      await env.DB.prepare('INSERT OR REPLACE INTO stats_snapshot (key, data, updated_at) VALUES (?1, ?2, ?3)')
        .bind(key, dataStr, nowSec).run();
    }

    return json(
      { ...data, updatedAt: nowSec, cooldownSeconds: STATS_COOLDOWN_SEC, retryAfter: STATS_COOLDOWN_SEC, throttled: false },
      200,
      { 'x-snapshot': 'RECOMPUTED' }
    );
  } catch (err) {
    return json({ error: (err && err.message) || 'Stats query error' }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
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
      if (request.method === 'GET') return handleStats(request, env, ctx);
      return json({ error: 'Method not allowed' }, 405);
    }

    if (url.pathname === '/api/stats/refresh') {
      if (request.method === 'POST') return handleStats(request, env, ctx);
      return json({ error: 'Method not allowed' }, 405);
    }

    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env) {
    await env.DB.batch([
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_events_client ON events (client_id)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_events_name_created ON events (event_name, created_at)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS stats_snapshot (key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)'),
    ]);
  },
};
