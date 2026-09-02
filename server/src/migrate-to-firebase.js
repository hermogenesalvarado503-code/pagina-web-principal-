import admin from 'firebase-admin'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { Pool } = pg

// Leer credenciales del archivo JSON
const credPath = '/app/pagina-web-principal-76c12-firebase-adminsdk-fbsvc-64b91edd28.json'
const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'))

// Inicializar Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  })
}
const db = admin.firestore()

// Conectar a PostgreSQL - usar hostname del servicio en docker-compose
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'drhga',
  user: 'drhga',
  password: 'drhga'
})

async function migrateUsers() {
  console.log('📦 Migrando usuarios...')
  const result = await pool.query('SELECT * FROM users')
  const users = result.rows

  for (const user of users) {
    await db.collection('users').doc(String(user.id)).set({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordSalt: user.password_salt,
      passwordHash: user.password_hash,
      createdAt: user.created_at,
    })
  }

  console.log(`✅ ${users.length} usuarios migrados`)
}

async function migrateMessages() {
  console.log('📦 Migrando mensajes...')
  const result = await pool.query('SELECT * FROM messages')
  const messages = result.rows

  for (const msg of messages) {
    await db.collection('messages').doc(String(msg.id)).set({
      id: msg.id,
      userId: msg.user_id,
      name: msg.name,
      email: msg.email,
      phone: msg.phone,
      subject: msg.subject,
      category: msg.category,
      message: msg.message,
      status: msg.status,
      createdAt: msg.created_at,
    })
  }

  console.log(`✅ ${messages.length} mensajes migrados`)
}

async function migrateReviews() {
  console.log('📦 Migrando reseñas...')
  const result = await pool.query('SELECT * FROM reviews')
  const reviews = result.rows

  for (const review of reviews) {
    await db.collection('reviews').doc(String(review.id)).set({
      id: review.id,
      name: review.name,
      email: review.email,
      role: review.role,
      rating: review.rating,
      comment: review.comment,
      approved: review.approved,
      createdAt: review.created_at,
    })
  }

  console.log(`✅ ${reviews.length} reseñas migradas`)
}

async function migrateGallery() {
  console.log('📦 Migrando galería...')
  const result = await pool.query('SELECT * FROM gallery_items ORDER BY sort_order')
  const items = result.rows

  for (const item of items) {
    await db.collection('gallery').doc(String(item.id)).set({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.image_url,
      sortOrder: item.sort_order,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })
  }

  console.log(`✅ ${items.length} imágenes de galería migradas`)
}

async function migrateEvents() {
  console.log('📦 Migrando eventos/noticias...')
  const result = await pool.query('SELECT * FROM events ORDER BY event_date DESC NULLS LAST')
  const events = result.rows

  for (const event of events) {
    await db.collection('events').doc(String(event.id)).set({
      id: event.id,
      title: event.title,
      news: event.news,
      description: event.description,
      eventDate: event.event_date,
      eventTime: event.event_time,
      imageUrl: event.image_url,
      location: event.location,
      mapIframe: event.map_iframe,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    })
  }

  console.log(`✅ ${events.length} eventos migrados`)
}

async function runMigration() {
  try {
    console.log('\n🚀 Iniciando migración PostgreSQL → Firestore...\n')

    await migrateUsers()
    await migrateMessages()
    await migrateReviews()
    await migrateGallery()
    await migrateEvents()

    console.log('\n✨ Migración completada exitosamente!\n')
  } catch (error) {
    console.error('❌ Error en la migración:', error)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

runMigration()
