import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.API_PORT || 4000

// Inicializar Firebase
let firebaseApp
try {
  let serviceAccount
  
  // Intentar leer del archivo primero (para desarrollo local)
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                   path.join(__dirname, '../../pagina-web-principal-76c12-firebase-adminsdk-fbsvc-64b91edd28.json')
  
  if (fs.existsSync(filePath)) {
    serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } else {
    // Si no existe archivo, construir desde variables de entorno
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    serviceAccount = {
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
  }
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  })
} catch (err) {
  console.error('Error initializing Firebase:', err.message)
  process.exit(1)
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

// Verificar token JWT
function verifyJWT(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64'))
    return decoded
  } catch (err) {
    return null
  }
}

// Middleware de autenticación
async function authenticateUser(req, res, next) {
  const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = await auth.verifyIdToken(token)
    req.user = decoded
    req.userId = decoded.uid
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Verificar rol admin
async function requireAdmin(req, res, next) {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get()
    const userData = userDoc.data()
    
    if (userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    
    req.userRole = userData.role
    next()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// ==================== AUTH ENDPOINTS ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Buscar usuario por email
    const usersSnap = await db.collection('users').where('email', '==', email).get()
    
    if (usersSnap.empty) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const userDoc = usersSnap.docs[0]
    const userData = userDoc.data()
    const passwordHash = hashPassword(password)

    // Verificar contraseña
    if (userData.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generar JWT token (temporal - en producción usar Firebase Auth)
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
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

// Cambiar contraseña - Generar OTP
app.post('/api/auth/change-password', authenticateUser, async (req, res) => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    // Generar OTP de 6 dígitos
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = hashPassword(otp)
    const tempKey = crypto.randomBytes(16).toString('hex')
    const newPasswordHash = hashPassword(newPassword)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutos

    // Guardar token temporal
    await db.collection('password_change_tokens').doc(tempKey).set({
      userId: req.userId,
      otpHash,
      newPasswordHash,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      used: false
    })

    // Obtener usuario para enviar email
    const userDoc = await db.collection('users').doc(req.userId).get()
    const userData = userDoc.data()

    // Enviar OTP por email
    await transporter.sendMail({
      from: process.env.PASSWORD_CHANGE_EMAIL,
      to: userData.email,
      subject: 'Código de verificación - Cambio de contraseña',
      html: `
        <h2>Cambio de Contraseña</h2>
        <p>Tu código de verificación es: <strong>${otp}</strong></p>
        <p>Este código expira en 5 minutos.</p>
        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
      `
    })

    res.json({
      message: 'OTP sent to email',
      token: tempKey,
      expiresIn: 300
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Validar OTP y cambiar contraseña
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

    // Verificar OTP
    if (tokenData.otpHash !== otpHash) {
      return res.status(400).json({ error: 'Invalid OTP' })
    }

    // Verificar expiración
    if (tokenData.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'OTP expired' })
    }

    if (tokenData.used) {
      return res.status(400).json({ error: 'Token already used' })
    }

    // Actualizar contraseña del usuario
    await db.collection('users').doc(tokenData.userId).update({
      passwordHash: tokenData.newPasswordHash,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Marcar token como usado
    await db.collection('password_change_tokens').doc(token).update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    // Guardar en historial
    await db.collection('password_change_history').add({
      userId: tokenData.userId,
      changedAt: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: req.ip || 'unknown'
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Validate OTP error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ==================== MESSAGES ENDPOINTS ====================

// Obtener todos los mensajes (solo admin)
app.get('/api/messages', authenticateUser, requireAdmin, async (req, res) => {
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

// Crear mensaje (contacto)
app.post('/api/messages', async (req, res) => {
  try {
    const { name, email, phone, subject, category, message } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message required' })
    }

    const docRef = await db.collection('messages').add({
      name,
      email,
      phone,
      subject,
      category,
      message,
      status: 'new',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.status(201).json({
      id: docRef.id,
      message: 'Message created successfully'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Eliminar mensaje (solo admin)
app.delete('/api/messages/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await db.collection('messages').doc(req.params.id).delete()
    res.json({ message: 'Message deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== REVIEWS ENDPOINTS ====================

// Obtener reseñas aprobadas (público)
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

// Crear reseña
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, email, role, rating, comment } = req.body

    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ error: 'Name, email, rating, and comment required' })
    }

    const docRef = await db.collection('reviews').add({
      name,
      email,
      role,
      rating: parseInt(rating),
      comment,
      approved: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.status(201).json({
      id: docRef.id,
      message: 'Review submitted for moderation'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Aprobar/rechazar reseña (solo admin)
app.patch('/api/reviews/:id', authenticateUser, requireAdmin, async (req, res) => {
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

// Eliminar reseña (solo admin)
app.delete('/api/reviews/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await db.collection('reviews').doc(req.params.id).delete()
    res.json({ message: 'Review deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== GALLERY ENDPOINTS ====================

// Obtener galería (público)
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

// Crear/actualizar galería (solo admin)
app.post('/api/gallery', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, description, imageUrl, sortOrder } = req.body

    const docRef = await db.collection('gallery').add({
      title,
      description,
      imageUrl,
      sortOrder: parseInt(sortOrder) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.status(201).json({
      id: docRef.id,
      message: 'Gallery item created'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Eliminar galería (solo admin)
app.delete('/api/gallery/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await db.collection('gallery').doc(req.params.id).delete()
    res.json({ message: 'Gallery item deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== EVENTS ENDPOINTS ====================

// Obtener eventos/noticias (público)
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

// Crear evento (solo admin)
app.post('/api/events', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, news, description, eventDate, eventTime, imageUrl, location, mapIframe } = req.body

    const docRef = await db.collection('events').add({
      title,
      news: Boolean(news),
      description,
      eventDate,
      eventTime,
      imageUrl,
      location,
      mapIframe,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.status(201).json({
      id: docRef.id,
      message: 'Event created'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Eliminar evento (solo admin)
app.delete('/api/events/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await db.collection('events').doc(req.params.id).delete()
    res.json({ message: 'Event deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== ANALYTICS ENDPOINTS ====================

// Estadísticas (solo admin)
app.get('/api/analytics', authenticateUser, requireAdmin, async (req, res) => {
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

// ==================== Health Check ====================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`)
  console.log(`📊 Firebase Project: ${firebaseApp.options.projectId}`)
})

export default app
