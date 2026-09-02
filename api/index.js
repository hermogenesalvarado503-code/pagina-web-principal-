import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// Inicializar Firebase
let firebaseApp
if (!admin.apps.length) {
  try {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: '105797166401629345813',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
    }
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    })
  } catch (err) {
    console.error('Firebase init error:', err.message)
  }
}

const db = admin.firestore()
const auth = admin.auth()

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json())

// Función para crear hash de contraseña
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Verificar rol admin
async function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token' })
    }
    
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64'))
    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const userData = userDoc.data()
    
    if (userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin required' })
    }
    
    req.userId = decoded.uid
    req.userRole = userData.role
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ==================== AUTH ====================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const usersSnap = await db.collection('users').where('email', '==', email).get()
    if (usersSnap.empty) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const userDoc = usersSnap.docs[0]
    const userData = userDoc.data()
    const passwordHash = hashPassword(password)

    if (userData.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = Buffer.from(JSON.stringify({
      uid: userDoc.id,
      email: userData.email,
      role: userData.role,
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64').replace(/=/g, '')

    res.json({
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      },
      token
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { newPassword } = req.body
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'No token' })
    }

    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64'))
    const userId = decoded.uid

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = hashPassword(otp)
    const tempKey = crypto.randomBytes(16).toString('hex')
    const newPasswordHash = hashPassword(newPassword)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await db.collection('password_change_tokens').doc(tempKey).set({
      userId,
      otpHash,
      newPasswordHash,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      used: false
    })

    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    await transporter.sendMail({
      from: process.env.PASSWORD_CHANGE_EMAIL,
      to: userData.email,
      subject: 'Código de verificación - Cambio de contraseña',
      html: `
        <h2>Cambio de Contraseña</h2>
        <p>Tu código de verificación es: <strong>${otp}</strong></p>
        <p>Este código expira en 5 minutos.</p>
      `
    })

    res.json({
      message: 'OTP sent to email',
      token: tempKey,
      expiresIn: 300
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/auth/validate-password-change', async (req, res) => {
  try {
    const { token, otpCode } = req.body

    if (!token || !otpCode) {
      return res.status(400).json({ error: 'Token and OTP required' })
    }

    const tokenDoc = await db.collection('password_change_tokens').doc(token).get()
    if (!tokenDoc.exists) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    const tokenData = tokenDoc.data()
    const otpHash = hashPassword(otpCode)

    if (tokenData.otpHash !== otpHash) {
      return res.status(400).json({ error: 'Invalid OTP' })
    }

    if (tokenData.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'OTP expired' })
    }

    if (tokenData.used) {
      return res.status(400).json({ error: 'Token already used' })
    }

    await db.collection('users').doc(tokenData.userId).update({
      passwordHash: tokenData.newPasswordHash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    await db.collection('password_change_tokens').doc(token).update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    await db.collection('password_change_history').add({
      userId: tokenData.userId,
      changedAt: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.ip || 'unknown'
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== MESSAGES ====================

app.get('/api/messages', requireAdmin, async (req, res) => {
  try {
    const messagesSnap = await db.collection('messages').get()
    const messages = messagesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/messages', async (req, res) => {
  try {
    const { name, email, phone, subject, category, message } = req.body
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message required' })
    }

    const docRef = await db.collection('messages').add({
      name, email, phone, subject, category, message,
      status: 'new',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.status(201).json({ id: docRef.id, message: 'Message created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/messages/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('messages').doc(req.params.id).delete()
    res.json({ message: 'Message deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== REVIEWS ====================

app.get('/api/reviews', async (req, res) => {
  try {
    const reviewsSnap = await db.collection('reviews').where('approved', '==', true).get()
    const reviews = reviewsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    res.json(reviews)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/reviews', async (req, res) => {
  try {
    const { name, email, role, rating, comment } = req.body
    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ error: 'Required fields missing' })
    }

    const docRef = await db.collection('reviews').add({
      name, email, role, rating: parseInt(rating), comment,
      approved: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.status(201).json({ id: docRef.id, message: 'Review submitted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const { approved } = req.body
    await db.collection('reviews').doc(req.params.id).update({
      approved: Boolean(approved),
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    res.json({ message: 'Review updated' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/reviews/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('reviews').doc(req.params.id).delete()
    res.json({ message: 'Review deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== GALLERY ====================

app.get('/api/gallery', async (req, res) => {
  try {
    const gallerySnap = await db.collection('gallery').orderBy('sortOrder').get()
    const gallery = gallerySnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    res.json(gallery)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/gallery', requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, sortOrder } = req.body
    const docRef = await db.collection('gallery').add({
      title, description, imageUrl,
      sortOrder: parseInt(sortOrder) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    res.status(201).json({ id: docRef.id, message: 'Gallery item created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('gallery').doc(req.params.id).delete()
    res.json({ message: 'Gallery item deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== EVENTS ====================

app.get('/api/events', async (req, res) => {
  try {
    const eventsSnap = await db.collection('events').orderBy('eventDate', 'desc').get()
    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/events', requireAdmin, async (req, res) => {
  try {
    const { title, news, description, eventDate, eventTime, imageUrl, location, mapIframe } = req.body
    const docRef = await db.collection('events').add({
      title, news: Boolean(news), description, eventDate, eventTime, imageUrl, location, mapIframe,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
    res.status(201).json({ id: docRef.id, message: 'Event created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/events/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('events').doc(req.params.id).delete()
    res.json({ message: 'Event deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== ANALYTICS ====================

app.get('/api/analytics', requireAdmin, async (req, res) => {
  try {
    const messagesSnap = await db.collection('messages').get()
    const reviewsSnap = await db.collection('reviews').get()
    const usersSnap = await db.collection('users').get()

    res.json({
      totalMessages: messagesSnap.size,
      totalReviews: reviewsSnap.size,
      approvedReviews: reviewsSnap.docs.filter(d => d.data().approved).length,
      totalUsers: usersSnap.size
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

export default app
