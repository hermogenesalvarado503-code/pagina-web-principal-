import crypto from 'node:crypto'
import admin from 'firebase-admin'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { signToken } from './token.js'

function getFirebaseApp() {
  if (admin.apps.length) return admin.app()

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    .replace(/^"|"$/g, '')
    .trim()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase environment variables are incomplete')
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  })
}

function verifyPassword(password, userData) {
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex')
  if (userData.passwordHash === sha256Hash) return true

  if (!userData.passwordSalt || !userData.passwordHash) return false
  const derivedHash = crypto
    .pbkdf2Sync(password, userData.passwordSalt, 120000, 64, 'sha512')
    .toString('hex')

  return crypto.timingSafeEqual(
    Buffer.from(derivedHash, 'hex'),
    Buffer.from(userData.passwordHash, 'hex'),
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    getFirebaseApp()
    const usersSnap = await admin.firestore().collection('users').where('email', '==', email).get()
    if (usersSnap.empty) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const userDoc = usersSnap.docs[0]
    const userData = userDoc.data()
    if (!verifyPassword(password, userData)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken({ id: userDoc.id, email: userData.email, role: userData.role })

    return res.status(200).json({
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
