import crypto from 'node:crypto'
import http from 'node:http'
import { URL } from 'node:url'
import pg from 'pg'

const { Pool } = pg

const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || 'drhga-dev-secret-change-me'
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://drhga:drhga@localhost:5432/drhga'
const COOKIE_NAME = 'drhga_session'

const pool = new Pool({ connectionString: DATABASE_URL })
const roles = ['admin', 'user', 'student', 'teacher']

function getAllowOrigin(origin) {
  const configured = process.env.CORS_ORIGIN || '*'
  if (configured === '*') return origin || '*'
  const allowed = configured.split(',').map((item) => item.trim()).filter(Boolean)
  if (origin && allowed.includes(origin)) return origin
  return allowed[0] || '*'
}

function json(req, res, status, payload) {
  const body = status === 204 ? '' : JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': getAllowOrigin(req.headers.origin),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  })
  res.end(body)
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  if (options.secure) parts.push('Secure')
  if (options.httpOnly) parts.push('HttpOnly')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || ''
  const cookies = cookieHeader.split(';').map((item) => item.trim())
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=')
    if (key === name) return rest.join('=').trim()
  }
  return null
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
}

function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

function verifyToken(token) {
  if (!token) return null
  const [header, payload, signature] = token.split('.')
  if (!header || !payload || !signature) return null

  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (data.exp < Math.floor(Date.now() / 1000)) return null
  return data
}

function getAuth(req) {
  const header = req.headers.authorization || ''
  const bearerUser = verifyToken(header.replace(/^Bearer\s+/i, ''))
  if (bearerUser) return bearerUser
  const token = getCookie(req, COOKIE_NAME)
  return verifyToken(token)
}

function requireAuth(req, res) {
  const user = getAuth(req)
  if (!user) {
    json(req, res, 401, { error: 'No autorizado' })
    return null
  }
  return user
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res)
  if (!user) return null
  if (user.role !== 'admin') {
    json(req, res, 403, { error: 'Acceso solo para administrador' })
    return null
  }
  return user
}

async function seedAnalyticsData() {
  const existing = await pool.query('SELECT COUNT(*)::int AS total FROM page_views')
  if (Number(existing.rows[0].total) > 0) return

  const routes = ['/', '/nosotros', '/servicios', '/galeria', '/noticias', '/contacto']
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge']
  const devices = ['Desktop', 'Mobile', 'Tablet']
  const operatingSystems = ['Windows', 'macOS', 'Android', 'iOS']
  const referrers = ['Directo', 'Google', 'Facebook', 'Instagram', 'WhatsApp']
  const rows = []

  for (let index = 0; index < 260; index += 1) {
    const createdAt = new Date(Date.now() - ((index % 180) * 24 * 60 * 60 * 1000) - ((index % 12) * 60 * 60 * 1000))
    const route = routes[index % routes.length]
    const browser = browsers[index % browsers.length]
    const device = devices[index % devices.length]
    const os = operatingSystems[(index + 2) % operatingSystems.length]
    const referrer = referrers[index % referrers.length]
    rows.push([
      route,
      referrer === 'Directo' ? '' : referrer,
      `Mozilla/5.0 (${os}; ${device}) ${browser}/1.0`,
      browser,
      os,
      device,
      createdAt.toISOString(),
    ])
  }

  const placeholders = rows.map((_, index) => `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`).join(', ')
  const flatRows = rows.flat()

  await pool.query(`
    INSERT INTO page_views (path, referrer, user_agent, browser, os, device, created_at)
    VALUES ${placeholders}
  `, flatRows)
}

async function migrate() {
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'student', 'teacher'));

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'inquiry',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      news TEXT NOT NULL,
      description TEXT NOT NULL,
      event_date DATE,
      event_time TIME,
      image_url TEXT,
      location TEXT,
      map_iframe TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await seedAnalyticsData()

  await pool.query(`
    INSERT INTO users (name, email, role, password_salt, password_hash)
    VALUES
      ('Administrador DRHGA', 'admin@drhga.edu.sv', 'admin', '90c436599b118c9ef52a836852684341', 'c220d2f2d17c3ca4a83ba08375254d0a520f5a607ff98529a321c1143270aaec3c77c141ec895f354ee2d1bdc1bec02d0c278e5f0341c560d00ca64f375c9046'),
      ('Usuario Demo', 'user@drhga.edu.sv', 'user', '3f340bda0054dbf668b5e08bec63a75c', '045833106931bb121a349651bf43c49bedf2300eb72296310d69548a453eacac5aa2ce1866c1202cd797813b224d6a50de1456b30c24b15a078655ea63511a90'),
      ('Estudiante Demo', 'estudiante@drhga.edu.sv', 'student', '22833ab7538c913ff15640e5346caec2', '2f3ef945c4ecbc3d7e0975d0bdeab0ddc90b5cc219be51afd40d8602c2db6e73dcd1e7210ce6186e6cd42282a9d6a4f04d47fd35249e41942872d04369f2af52'),
      ('Docente Demo', 'docente@drhga.edu.sv', 'teacher', '62713d96c4d93c27f7272c47fc508913', '477c5619244f9d91729b7aef7d440a09400b2c3d163c0dd89dccf26cb584ae3f2366fc08e305984ee7be304e5b8fe1afc2286bafa7057e2533b847e76e8a31a5')
    ON CONFLICT (email) DO UPDATE SET
      role = EXCLUDED.role,
      password_salt = EXCLUDED.password_salt,
      password_hash = EXCLUDED.password_hash;

    INSERT INTO reviews (name, email, role, rating, comment)
    SELECT 'Maria Garcia', 'maria@example.com', 'Madre de familia', 5, 'Excelente institucion. Mi hijo ha mejorado academica y socialmente.'
    WHERE NOT EXISTS (SELECT 1 FROM reviews);

    INSERT INTO messages (name, email, phone, subject, category, message)
    SELECT 'Familia Ramirez', 'familia@example.com', '23304037', 'Consulta de admisiones', 'admissions', 'Deseamos informacion sobre requisitos de matricula.'
    WHERE NOT EXISTS (SELECT 1 FROM messages);

    INSERT INTO gallery_items (title, description, image_url, sort_order)
    SELECT * FROM (VALUES
      ('Alumnos de escuela', 'Participacion estudiantil en actividades escolares.', '/img/alumnos.jpeg', 1),
      ('Dia del arbol', 'Jornada educativa de conciencia ambiental.', '/img/arbol.jpeg', 2),
      ('Cancha deportiva', 'Espacio para actividades deportivas.', '/img/cancha.jpeg', 3),
      ('Kinder', 'Ambiente inicial para los mas pequenos.', '/img/kinder.jpeg', 4),
      ('Acto civico', 'Participacion civica de estudiantes.', '/img/actocivico.jpeg', 5),
      ('Formacion', 'Momentos de organizacion escolar.', '/img/form.jpeg', 6)
    ) AS seed(title, description, image_url, sort_order)
    WHERE NOT EXISTS (SELECT 1 FROM gallery_items);

    INSERT INTO events (title, news, description, event_date, event_time, image_url, location, map_iframe)
    SELECT * FROM (VALUES
      ('Inauguracion del nuevo laboratorio', 'Nuevo laboratorio escolar', 'Se inauguro oficialmente el nuevo laboratorio de computacion, con planes para activarlo como apoyo tecnologico.', DATE '2024-05-15', TIME '09:00', '/img/DrH.png', 'Centro Escolar Dr. Hermogenes Alvarado', ''),
      ('Campeonato deportivo escolar', 'Campeonato regional', 'Estudiantes participaron exitosamente en actividades deportivas regionales.', DATE '2024-05-22', TIME '08:00', '/img/cancha.jpeg', 'Cancha deportiva', ''),
      ('Graduacion promocion 2024', 'Ceremonia de graduacion', 'La ceremonia de graduacion reunio a familias, docentes y estudiantes.', DATE '2024-05-30', TIME '14:00', '/img/form.jpeg', 'Salon escolar', '')
    ) AS seed(title, news, description, event_date, event_time, image_url, location, map_iframe)
    WHERE NOT EXISTS (SELECT 1 FROM events);
  `)
}

function idFromPath(path) {
  return Number(path.split('/').pop())
}

async function upsertGallery(req, res, id = null) {
  const body = await readBody(req)
  const values = [
    body.title,
    body.description || '',
    body.image_url,
    Number(body.sort_order || 0),
  ]
  const result = id
    ? await pool.query(
      `UPDATE gallery_items
       SET title = $1, description = $2, image_url = $3, sort_order = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [...values, id],
    )
    : await pool.query(
      'INSERT INTO gallery_items (title, description, image_url, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      values,
    )

  return json(req, res, id ? 200 : 201, result.rows[0])
}

async function upsertEvent(req, res, id = null) {
  const body = await readBody(req)
  const values = [
    body.title,
    body.news,
    body.description,
    body.event_date || null,
    body.event_time || null,
    body.image_url || '',
    body.location || '',
    body.map_iframe || '',
  ]
  const result = id
    ? await pool.query(
      `UPDATE events
       SET title = $1, news = $2, description = $3, event_date = $4, event_time = $5,
           image_url = $6, location = $7, map_iframe = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [...values, id],
    )
    : await pool.query(
      `INSERT INTO events (title, news, description, event_date, event_time, image_url, location, map_iframe)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      values,
    )

  return json(req, res, id ? 200 : 201, result.rows[0])
}

async function getAnalyticsData() {
  const summary = await pool.query(`
    SELECT
      COUNT(*)::int AS total_visits,
      COUNT(DISTINCT DATE(created_at))::int AS active_days
    FROM page_views
  `)

  const topPage = await pool.query(`
    SELECT path, COUNT(*)::int AS visits
    FROM page_views
    GROUP BY path
    ORDER BY visits DESC, path ASC
    LIMIT 1
  `)

  const totalMobile = await pool.query(`
    SELECT COALESCE(ROUND((COUNT(*) * 100.0) / NULLIF((SELECT COUNT(*) FROM page_views), 0), 0), 0)::int AS mobile_share
    FROM page_views
    WHERE device = 'Mobile'
  `)

  const monthlyTrend = await pool.query(`
    SELECT
      to_char(date_trunc('month', created_at), 'Mon') AS month,
      COUNT(*)::int AS visits
    FROM page_views
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  `)

  const dailyTraffic = await pool.query(`
    SELECT
      CASE EXTRACT(DOW FROM created_at)
        WHEN 0 THEN 'Dom'
        WHEN 1 THEN 'Lun'
        WHEN 2 THEN 'Mar'
        WHEN 3 THEN 'Mié'
        WHEN 4 THEN 'Jue'
        WHEN 5 THEN 'Vie'
        ELSE 'Sáb'
      END AS label,
      COUNT(*)::int AS value
    FROM page_views
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY EXTRACT(DOW FROM created_at)
    ORDER BY EXTRACT(DOW FROM created_at)
  `)

  const hourlyTraffic = await pool.query(`
    SELECT
      LPAD(EXTRACT(HOUR FROM created_at)::int::text, 2, '0') || ':00' AS hour,
      COUNT(*)::int AS value
    FROM page_views
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY EXTRACT(HOUR FROM created_at)
  `)

  const deviceStats = await pool.query(`
    SELECT
      device AS label,
      ROUND((COUNT(*) * 100.0) / NULLIF((SELECT COUNT(*) FROM page_views), 0), 0)::int AS value
    FROM page_views
    GROUP BY device
    ORDER BY value DESC
  `)

  const topPages = await pool.query(`
    SELECT path AS label, COUNT(*)::int AS value
    FROM page_views
    GROUP BY path
    ORDER BY value DESC, label ASC
    LIMIT 5
  `)

  const trafficSources = await pool.query(`
    SELECT
      COALESCE(NULLIF(referrer, ''), 'Directo') AS name,
      ROUND((COUNT(*) * 100.0) / NULLIF((SELECT COUNT(*) FROM page_views), 0), 0)::int AS share
    FROM page_views
    GROUP BY referrer
    ORDER BY share DESC
    LIMIT 4
  `)

  return {
    summary: {
      totalVisits: Number(summary.rows[0]?.total_visits || 0),
      activeDays: Number(summary.rows[0]?.active_days || 0),
      topPage: topPage.rows[0]?.path || 'Sin datos',
      topPageVisits: Number(topPage.rows[0]?.visits || 0),
      mobileShare: Number(totalMobile.rows[0]?.mobile_share || 0),
    },
    monthlyTrend: monthlyTrend.rows.map((row) => ({
      month: row.month,
      visits: Number(row.visits || 0),
      trend: Number(row.visits || 0),
    })),
    dailyTraffic: dailyTraffic.rows.map((row) => ({
      label: row.label,
      value: Number(row.value || 0),
    })),
    hourlyTraffic: hourlyTraffic.rows.map((row) => ({
      hour: row.hour,
      value: Number(row.value || 0),
    })),
    deviceStats: deviceStats.rows.map((row) => ({
      label: row.label,
      value: Number(row.value || 0),
      color: row.label === 'Mobile' ? '#10b981' : row.label === 'Desktop' ? '#3b82f6' : '#f59e0b',
    })),
    topPages: topPages.rows.map((row) => ({
      label: row.label,
      value: Number(row.value || 0),
    })),
    trafficSources: trafficSources.rows.map((row) => ({
      name: row.name,
      share: Number(row.share || 0),
    })),
  }
}

async function router(req, res) {
  if (req.method === 'OPTIONS') return json(req, res, 204, {})

  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  try {
    if (req.method === 'GET' && path === '/api/health') {
      return json(req, res, 200, { ok: true, roles })
    }

    if (req.method === 'GET' && path === '/api-docs') {
      const docs = {
        openapi: '3.0.0',
        info: { title: 'DRHGA API', version: '1.0.0' },
        paths: {
          '/api/health': { get: { summary: 'Health check' } },
          '/api/auth/login': { post: { summary: 'Login with email and password' } },
          '/api/auth/logout': { post: { summary: 'Logout' } },
          '/api/me': { get: { summary: 'Get current user' } },
          '/api/gallery': { get: { summary: 'List gallery' }, post: { summary: 'Add gallery (admin)' } },
          '/api/gallery/{id}': { put: { summary: 'Update gallery (admin)' }, delete: { summary: 'Delete gallery (admin)' } },
          '/api/events': { get: { summary: 'List events' }, post: { summary: 'Add event (admin)' } },
          '/api/events/{id}': { put: { summary: 'Update event (admin)' }, delete: { summary: 'Delete event (admin)' } },
          '/api/messages': { post: { summary: 'Send message' }, get: { summary: 'List messages (admin)' } },
          '/api/messages/{id}': { delete: { summary: 'Delete message (admin)' } },
          '/api/me/messages': { get: { summary: 'Get my messages' } },
          '/api/reviews': { get: { summary: 'List reviews' }, post: { summary: 'Add review' } },
          '/api/reviews/{id}': { delete: { summary: 'Delete review (admin)' } },
        },
      }
      return json(req, res, 200, docs)
    }

    if (req.method === 'GET' && path === '/') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': getAllowOrigin(req.headers.origin),
      })
      res.end(`<!DOCTYPE html>
<html>
<head>
  <title>DRHGA API</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css">
  <style>html{height:100%}body{height:100%;margin:0}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api-docs',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout"
    })
  </script>
</body>
</html>`)
      return
    }

    if (req.method === 'GET' && path === '/api/me') {
      const auth = getAuth(req)
      if (!auth) return json(req, res, 401, { error: 'No autorizado' })
      const safeUser = { id: auth.sub, name: auth.name, email: auth.email, role: auth.role }
      return json(req, res, 200, { user: safeUser })
    }

    if (req.method === 'POST' && path === '/api/auth/login') {
      const { email, password } = await readBody(req)
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
      const user = result.rows[0]
      if (!user || !verifyPassword(password || '', user.password_salt, user.password_hash)) {
        return json(req, res, 401, { error: 'Credenciales invalidas' })
      }

      const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role }
      const token = signToken(safeUser)
      setCookie(res, COOKIE_NAME, token, {
        path: '/',
        maxAge: 60 * 60 * 8,
        httpOnly: true,
        sameSite: 'Lax',
      })
      return json(req, res, 200, { user: safeUser })
    }

    if (req.method === 'POST' && path === '/api/auth/logout') {
      setCookie(res, COOKIE_NAME, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'Lax' })
      return json(req, res, 200, { ok: true })
    }

    if (req.method === 'GET' && path === '/api/gallery') {
      const result = await pool.query('SELECT * FROM gallery_items ORDER BY sort_order, id')
      return json(req, res, 200, result.rows)
    }

    if (req.method === 'POST' && path === '/api/gallery') {
      if (!requireAdmin(req, res)) return
      return upsertGallery(req, res)
    }

    if (req.method === 'PUT' && path.startsWith('/api/gallery/')) {
      if (!requireAdmin(req, res)) return
      return upsertGallery(req, res, idFromPath(path))
    }

    if (req.method === 'DELETE' && path.startsWith('/api/gallery/')) {
      if (!requireAdmin(req, res)) return
      await pool.query('DELETE FROM gallery_items WHERE id = $1', [idFromPath(path)])
      return json(req, res, 200, { ok: true })
    }

    if (req.method === 'GET' && path === '/api/events') {
      const result = await pool.query('SELECT * FROM events ORDER BY event_date DESC NULLS LAST, id DESC')
      return json(req, res, 200, result.rows)
    }

    if (req.method === 'POST' && path === '/api/events') {
      if (!requireAdmin(req, res)) return
      return upsertEvent(req, res)
    }

    if (req.method === 'PUT' && path.startsWith('/api/events/')) {
      if (!requireAdmin(req, res)) return
      return upsertEvent(req, res, idFromPath(path))
    }

    if (req.method === 'DELETE' && path.startsWith('/api/events/')) {
      if (!requireAdmin(req, res)) return
      await pool.query('DELETE FROM events WHERE id = $1', [idFromPath(path)])
      return json(req, res, 200, { ok: true })
    }

    if (req.method === 'POST' && path === '/api/analytics/page-view') {
      const body = await readBody(req)
      const normalizedPath = String(body.path || '/').trim() || '/'
      const browser = String(body.browser || '').trim() || 'Other'
      const os = String(body.os || '').trim() || 'Other'
      const device = String(body.device || '').trim() || 'Desktop'
      const userAgent = String(body.userAgent || '').trim() || ''
      const referrer = String(body.referrer || '').trim()

      await pool.query(
        'INSERT INTO page_views (path, referrer, user_agent, browser, os, device, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [normalizedPath, referrer, userAgent, browser, os, device],
      )

      return json(req, res, 201, { ok: true })
    }

    if (req.method === 'GET' && path === '/api/analytics') {
      const analytics = await getAnalyticsData()
      return json(req, res, 200, analytics)
    }

    if (req.method === 'GET' && path === '/api/reviews') {
      const result = await pool.query('SELECT id, name, email, role, rating, comment, created_at FROM reviews WHERE approved = TRUE ORDER BY created_at DESC')
      return json(req, res, 200, result.rows)
    }

    if (req.method === 'DELETE' && path.startsWith('/api/reviews/')) {
      const auth = getAuth(req)
      const reviewId = idFromPath(path)
      const reviewResult = await pool.query('SELECT email FROM reviews WHERE id = $1', [reviewId])
      const review = reviewResult.rows[0]

      if (!auth) {
        return json(req, res, 403, { error: 'No autorizado' })
      }

      const isAdmin = auth.role === 'admin'
      const isOwner = !!review && !!auth.email && String(review.email).toLowerCase() === String(auth.email).toLowerCase()

      if (!isAdmin && !isOwner) {
        return json(req, res, 403, { error: 'No puedes eliminar esta reseña' })
      }

      await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId])
      return json(req, res, 200, { ok: true })
    }

    if (req.method === 'POST' && path === '/api/reviews') {
      const body = await readBody(req)
      const result = await pool.query(
        'INSERT INTO reviews (name, email, role, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, role, rating, comment, created_at',
        [body.name, body.email, body.role, Number(body.rating), body.comment],
      )
      return json(req, res, 201, result.rows[0])
    }

    if (req.method === 'POST' && path === '/api/messages') {
      const body = await readBody(req)
      const auth = getAuth(req)
      const category = String(body.category || 'consulta-general')
      const result = await pool.query(
        'INSERT INTO messages (user_id, name, email, phone, subject, category, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [auth?.sub || null, body.name, body.email, body.phone || '', body.subject, category, body.message],
      )
      return json(req, res, 201, result.rows[0])
    }

    if (req.method === 'GET' && path === '/api/messages') {
      if (!requireAdmin(req, res)) return
      const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC')
      return json(req, res, 200, result.rows)
    }

    if (req.method === 'GET' && path === '/api/me/messages') {
      const auth = requireAuth(req, res)
      if (!auth) return
      const result = await pool.query(
        'SELECT * FROM messages WHERE user_id = $1 OR email = $2 ORDER BY created_at DESC',
        [auth.sub, auth.email],
      )
      return json(req, res, 200, result.rows)
    }

    if (req.method === 'DELETE' && path.startsWith('/api/messages/')) {
      if (!requireAdmin(req, res)) return
      await pool.query('DELETE FROM messages WHERE id = $1', [idFromPath(path)])
      return json(req, res, 200, { ok: true })
    }

    return json(req, res, 404, { error: 'Ruta no encontrada' })
  } catch (error) {
    console.error(error)
    return json(req, res, 500, { error: 'Error interno del servidor' })
  }
}

await migrate()

http.createServer(router).listen(PORT, () => {
  console.log(`DRHGA API escuchando en http://localhost:${PORT}`)
})

