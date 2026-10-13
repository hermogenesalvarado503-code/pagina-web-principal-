import crypto from 'node:crypto'
import process from 'node:process'
import { Buffer } from 'node:buffer'

function getSigningSecret() {
  const secret = (process.env.AUTH_TOKEN_SECRET || process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .trim()
  if (!secret) throw new Error('Authentication signing secret is not configured')
  return secret
}

export function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    uid: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  })).toString('base64url')
  const content = `${header}.${payload}`
  const signature = crypto.createHmac('sha256', getSigningSecret()).update(content).digest('base64url')
  return `${content}.${signature}`
}

export function verifyToken(token) {
  if (!token) return null

  try {
    const [header, payload, signature, extra] = token.split('.')
    if (!header || !payload || !signature || extra) return null

    const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))
    if (parsedHeader.alg !== 'HS256') return null

    const content = `${header}.${payload}`
    const expected = crypto.createHmac('sha256', getSigningSecret()).update(content).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!decoded.uid || !decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) return null
    return decoded
  } catch {
    return null
  }
}