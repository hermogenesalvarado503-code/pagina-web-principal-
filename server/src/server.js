import dotenv from 'dotenv'
dotenv.config()
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

// Helper para obtener IP del cliente
function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '').split(',')[0].trim()
}

// Helper para parsear User Agent
function parseUserAgent(userAgent) {
  const ua = userAgent || ''
  let browser = 'Desconocido'
  let os = 'Desconocido'
  let device = 'Desktop'

  // Detectar navegador
  if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  else if (/Opera\//i.test(ua)) browser = 'Opera'

  // Detectar SO
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS'

  // Detectar dispositivo
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = 'Móvil'
  else if (/iPad|Tablet/i.test(ua)) device = 'Tablet'

  return { browser, os, device }
}

// Generar token de validación
function generateValidationToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Generar código OTP de 6 dígitos
function generateOTPCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

function hashOTP(otpCode) {
  return crypto.createHash('sha256').update(otpCode).digest('hex')
}

function safeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

// Helper para enviar emails (en prueba )
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: `"DRHGA" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error('Error enviando email:', error)
    return false
  }
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

    CREATE TABLE IF NOT EXISTS password_change_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      otp_hash TEXT,
      new_password_salt TEXT,
      new_password_hash TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE password_change_tokens
      ADD COLUMN IF NOT EXISTS otp_hash TEXT;
    ALTER TABLE password_change_tokens
      ADD COLUMN IF NOT EXISTS new_password_salt TEXT;
    ALTER TABLE password_change_tokens
      ADD COLUMN IF NOT EXISTS new_password_hash TEXT;

    CREATE TABLE IF NOT EXISTS password_change_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_access_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      action TEXT,
      resource TEXT,
      accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_password_change_tokens_expires ON password_change_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_admin_access_logs_user_id ON admin_access_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_change_history_user_id ON password_change_history(user_id);
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
          '/api/auth/change-password': { post: { summary: 'Change password (authenticated users)' } },
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

    if (req.method === 'POST' && path === '/api/auth/change-password') {
      const auth = requireAuth(req, res)
      if (!auth) return

      const { currentPassword, newPassword } = await readBody(req)

      // Validar que se proporcionen los datos
      if (!currentPassword || !newPassword) {
        return json(req, res, 400, { error: 'Faltan campos requeridos' })
      }

      // Validar fortaleza de la nueva contraseña
      const passwordRegex = {
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        lowercase: /[a-z]/.test(newPassword),
        number: /\d/.test(newPassword),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      }

      if (!Object.values(passwordRegex).every(Boolean)) {
        const missing = []
        if (!passwordRegex.length) missing.push('mínimo 8 caracteres')
        if (!passwordRegex.uppercase) missing.push('una letra mayúscula')
        if (!passwordRegex.lowercase) missing.push('una letra minúscula')
        if (!passwordRegex.number) missing.push('un número')
        if (!passwordRegex.special) missing.push('un carácter especial')
        return json(req, res, 400, { error: `La contraseña debe contener: ${missing.join(', ')}` })
      }

      // Verificar contraseña actual
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [auth.sub])
      const user = userResult.rows[0]
      if (!user || !verifyPassword(currentPassword, user.password_salt, user.password_hash)) {
        return json(req, res, 401, { error: 'Contraseña actual incorrecta' })
      }

      // Generar código OTP de 6 dígitos
      const otpCode = generateOTPCode()
      const otpHash = hashOTP(otpCode)
      const token = generateValidationToken()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos

      // Generar hash de la nueva contraseña
      const { salt, hash } = hashPassword(newPassword)

      // Guardar token en la BD
      await pool.query(
        'INSERT INTO password_change_tokens (user_id, token, otp_hash, new_password_salt, new_password_hash, expires_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [auth.sub, token, otpHash, salt, hash, expiresAt]
      )

      // Enviar email con código OTP
      const emailHtml = `
        <h2>Validación de cambio de contraseña</h2>
        <p>Hola ${user.name},</p>
        <p>Se solicitó un cambio de contraseña en tu cuenta de administrador.</p>
        <p><strong>Tu código de validación es:</strong></p>
        <h1 style="font-size: 32px; letter-spacing: 5px; font-family: monospace;">${otpCode}</h1>
        <p style="color: #666;">Este código expirará en 5 minutos.</p>
        <p><strong>Si no solicitaste este cambio, ignora este email.</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Centro Escolar Dr. Hermógenes Alvarado</p>
      `

      const passwordChangeEmail = process.env.PASSWORD_CHANGE_EMAIL || user.email
      const emailSent = await sendEmail(passwordChangeEmail, 'Validación de cambio de contraseña', emailHtml)
      if (!emailSent) {
        await pool.query('DELETE FROM password_change_tokens WHERE token = $1', [token])
        return json(req, res, 502, { error: 'No se pudo enviar el código al correo configurado' })
      }

      return json(req, res, 200, { 
        ok: true, 
        message: 'Código de validación enviado al email. Válido por 5 minutos.',
        token: token,
      })
    }

    // Endpoint para validar código OTP y aplicar cambio de contraseña
    if (req.method === 'POST' && path === '/api/auth/validate-password-change') {
      const auth = requireAuth(req, res)
      if (!auth) return

      const { token, otpCode } = await readBody(req)

      if (!token || !otpCode || !/^\d{6}$/.test(String(otpCode))) {
        return json(req, res, 400, { error: 'Faltan campos requeridos' })
      }

      // Verificar token
      const tokenResult = await pool.query(
        'SELECT * FROM password_change_tokens WHERE token = $1 AND user_id = $2 AND used = false',
        [token, auth.sub]
      )
      const tokenRecord = tokenResult.rows[0]

      if (!tokenRecord) {
        return json(req, res, 400, { error: 'Token inválido o expirado' })
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        await pool.query('DELETE FROM password_change_tokens WHERE id = $1', [tokenRecord.id])
        return json(req, res, 400, { error: 'El código de validación ha expirado' })
      }

      if (!tokenRecord.otp_hash || !safeEqualText(hashOTP(String(otpCode)), tokenRecord.otp_hash)) {
        return json(req, res, 401, { error: 'Código de validación incorrecto' })
      }

      if (!tokenRecord.new_password_salt || !tokenRecord.new_password_hash) {
        return json(req, res, 400, { error: 'Solicitud de cambio incompleta. Solicita un nuevo código.' })
      }

      // Aplicar cambio de contraseña
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [auth.sub])
      const user = userResult.rows[0]

      const ip = getClientIP(req)
      const ua = req.headers['user-agent'] || ''
      const { browser, os, device } = parseUserAgent(ua)

      // Actualizar contraseña
      await pool.query(
        'UPDATE users SET password_salt = $1, password_hash = $2 WHERE id = $3',
        [tokenRecord.new_password_salt, tokenRecord.new_password_hash, auth.sub]
      )

      // Registrar en historial
      await pool.query(
        'INSERT INTO password_change_history (user_id, ip_address, user_agent, browser, os, device) VALUES ($1, $2, $3, $4, $5, $6)',
        [auth.sub, ip, ua, browser, os, device]
      )

      // Marcar token como usado
      await pool.query('UPDATE password_change_tokens SET used = true WHERE id = $1', [tokenRecord.id])

      // Enviar email de confirmación
      const confirmEmail = `
        <h2>Contraseña cambiada exitosamente</h2>
        <p>Hola ${user.name},</p>
        <p>Tu contraseña ha sido cambiada exitosamente.</p>
        <p><strong>Detalles del cambio:</strong></p>
        <ul>
          <li>Dirección IP: ${ip}</li>
          <li>Navegador: ${browser}</li>
          <li>Sistema: ${os}</li>
          <li>Dispositivo: ${device}</li>
          <li>Hora: ${new Date().toLocaleString('es-SV')}</li>
        </ul>
        <p style="color: #ff6b6b;"><strong>Si no realizaste este cambio, contacta al administrador inmediatamente.</strong></p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Centro Escolar Dr. Hermógenes Alvarado</p>
      `

      await sendEmail(user.email, 'Contraseña cambiada exitosamente', confirmEmail)

      return json(req, res, 200, { 
        ok: true, 
        message: 'Contraseña actualizada correctamente. Confirma por email.',
      })
    }

    // Endpoint para obtener historial de cambios de contraseña
    if (req.method === 'GET' && path === '/api/auth/password-history') {
      const auth = requireAuth(req, res)
      if (!auth) return

      const result = await pool.query(
        'SELECT id, changed_at, ip_address, browser, os, device FROM password_change_history WHERE user_id = $1 ORDER BY changed_at DESC LIMIT 10',
        [auth.sub]
      )

      return json(req, res, 200, result.rows)
    }

    // Endpoint para obtener historial de accesos a administración
    if (req.method === 'GET' && path === '/api/auth/access-logs') {
      const auth = requireAdmin(req, res)
      if (!auth) return

      const result = await pool.query(
        'SELECT id, accessed_at, ip_address, browser, os, device, action FROM admin_access_logs WHERE user_id = $1 ORDER BY accessed_at DESC LIMIT 20',
        [auth.sub]
      )

      return json(req, res, 200, result.rows)
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

