import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import admin from 'firebase-admin'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { signToken, verifyToken } from './auth/token.js'
const app = express()

// Inicializar Firebase
function getFirebaseApp() {
  if (admin.apps.length) return admin.app()

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim()
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim()
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    .replace(/^"|"$/g, '')
    .trim()

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY')
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  })
}

try {
  getFirebaseApp()
} catch (err) {
  console.error('Firebase init error:', err.message)
  throw err
}

const db = admin.firestore()

// Vercel puede entregar a Express la ruta con o sin el prefijo /api.
if (process.env.VERCEL) {
  app.use((req, res, next) => {
    if (req.url === '/') req.url = '/api'
    else if (!req.url.startsWith('/api/')) req.url = `/api${req.url}`
    next()
  })
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', firebaseProject: process.env.FIREBASE_PROJECT_ID })
})
app.get('/health', (req, res) => {
  res.json({ status: 'OK', firebaseProject: process.env.FIREBASE_PROJECT_ID })
})

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
app.use(express.json({ limit: '1mb' }))

// Función para crear hash de contraseña
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function verifyPassword(password, userData) {
  const sha256Hash = hashPassword(password)
  if (userData.passwordHash === sha256Hash) return true

  if (userData.passwordSalt && userData.passwordHash) {
    const derivedHash = crypto
      .pbkdf2Sync(password, userData.passwordSalt, 120000, 64, 'sha512')
      .toString('hex')
    return crypto.timingSafeEqual(
      Buffer.from(derivedHash, 'hex'),
      Buffer.from(userData.passwordHash, 'hex'),
    )
  }

  return false
}

function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  const decoded = verifyToken(token)

  if (!decoded?.uid) {
    return res.status(401).json({ error: 'No token or invalid token' })
  }

  req.user = decoded
  req.userId = decoded.uid
  next()
}

// Verificar rol admin
async function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token' })
    }
    
    const decoded = verifyToken(token)
    if (!decoded?.uid) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const userDoc = await db.collection('users').doc(decoded.uid).get()
    const userData = userDoc.data()
    
    if (userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin required' })
    }
    
    req.userId = decoded.uid
    req.userRole = userData.role
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ==================== AUTH ====================

async function loginHandler(req, res) {
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
    if (!verifyPassword(password, userData)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken({ id: userDoc.id, email: userData.email, role: userData.role })

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
}

app.post('/api/auth/login', loginHandler)
app.post('/auth/login', loginHandler)

app.get('/api/me', authenticateUser, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()
    res.json({
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
      },
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

    const decoded = verifyToken(token)
    if (!decoded) return res.status(401).json({ error: 'Invalid token' })
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
    const { title, description, location, sort_order, sortOrder } = req.body
    const eventDate = req.body.event_date || req.body.eventDate || ''
    const eventTime = req.body.event_time || req.body.eventTime || ''
    const imageUrl = req.body.image_url || req.body.imageUrl || ''
    const item = {
      title, description, location: location || '', eventDate, eventTime, imageUrl,
      sortOrder: parseInt(sort_order ?? sortOrder, 10) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    const docRef = await db.collection('gallery').add(item)
    res.status(201).json({ id: docRef.id, title, description, location: location || '', eventDate, eventTime, imageUrl, sortOrder: item.sortOrder, message: 'Gallery item created' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/gallery/:id', requireAdmin, async (req, res) => {
  try {
    const { title, description, location, sort_order, sortOrder } = req.body
    const eventDate = req.body.event_date || req.body.eventDate || ''
    const eventTime = req.body.event_time || req.body.eventTime || ''
    const imageUrl = req.body.image_url || req.body.imageUrl || ''
    const item = {
      title, description, location: location || '', eventDate, eventTime, imageUrl,
      sortOrder: parseInt(sort_order ?? sortOrder, 10) || 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    await db.collection('gallery').doc(req.params.id).update(item)
    res.json({ id: req.params.id, title, description, location: location || '', eventDate, eventTime, imageUrl, sortOrder: item.sortOrder })
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
    const { title, news, topic, description, location } = req.body
    const eventDate = req.body.event_date || req.body.eventDate || ''
    const eventTime = req.body.event_time || req.body.eventTime || ''
    const imageUrl = req.body.image_url || req.body.imageUrl || ''
    const mapIframe = req.body.map_iframe || req.body.mapIframe || ''
    const event = {
      title, news: Boolean(news), topic: topic || '', description, eventDate, eventTime, imageUrl, location, mapIframe,
      isImportant: Boolean(req.body.is_important ?? req.body.isImportant),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    const docRef = await db.collection('events').add(event)
    res.status(201).json({
      id: docRef.id, title, news: event.news, topic: event.topic, description, eventDate, eventTime,
      imageUrl, location, mapIframe, isImportant: event.isImportant, message: 'Event created',
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/events/:id', requireAdmin, async (req, res) => {
  try {
    const { title, news, topic, description, location } = req.body
    const eventDate = req.body.event_date || req.body.eventDate || ''
    const eventTime = req.body.event_time || req.body.eventTime || ''
    const imageUrl = req.body.image_url || req.body.imageUrl || ''
    const mapIframe = req.body.map_iframe || req.body.mapIframe || ''
    const event = {
      title, news: Boolean(news), topic: topic || '', description, eventDate, eventTime, imageUrl, location, mapIframe,
      isImportant: Boolean(req.body.is_important ?? req.body.isImportant),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    await db.collection('events').doc(req.params.id).update(event)
    res.json({
      id: req.params.id, title, news: event.news, topic: event.topic, description, eventDate, eventTime,
      imageUrl, location, mapIframe, isImportant: event.isImportant,
    })
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

app.get('/api/site-settings', async (req, res) => {
  try {
    const snapshot = await db.collection('siteSettings').doc('public').get()
    res.json({ heroImageUrl: snapshot.data()?.heroImageUrl || '' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/api/site-settings', requireAdmin, async (req, res) => {
  try {
    const heroImageUrl = String(req.body.heroImageUrl || req.body.hero_image_url || '').trim()
    await db.collection('siteSettings').doc('public').set({
      heroImageUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    res.json({ heroImageUrl })
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
