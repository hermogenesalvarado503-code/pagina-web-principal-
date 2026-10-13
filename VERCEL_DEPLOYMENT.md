# 🚀 Guía de Despliegue a Vercel

## Pasos para Desplegar en Vercel

### 1. Instalar Vercel CLI
```bash
npm install -g vercel
```

### 2. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel (https://vercel.com/dashboard) o mediante CLI:

```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
vercel env add VITE_API_URL

vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY_ID
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add GMAIL_EMAIL
vercel env add GMAIL_APP_PASSWORD
vercel env add PASSWORD_CHANGE_EMAIL
```

### 3. Variables requeridas

Configura estos valores en Vercel usando los datos del proyecto Firebase `pagina-web-principal-76c12`.
No copies claves privadas, contraseñas ni tokens a este archivo ni al repositorio.

Variables públicas del frontend:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_API_URL
```

Variables privadas del backend:

```
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
GMAIL_EMAIL
GMAIL_APP_PASSWORD
PASSWORD_CHANGE_EMAIL
```

En `FIREBASE_PRIVATE_KEY`, conserva los saltos de línea como `\\n` al pegarla en Vercel.

### 4. Desplegar con Git

```bash
git add .
git commit -m "Firebase migration: Firestore + Vercel Functions"
git push
```

El proyecto ya está vinculado a Vercel, así que se desplegará automáticamente.

### 5. Verificar Despliegue

- Frontend: https://pagina-web-principal.vercel.app
- API: https://pagina-web-principal.vercel.app/api/health

### 6. Actualizar Firestore Security Rules en Firebase Console

Ve a: Firebase Console → pagina-web-principal-76c12 → Firestore → Rules

Copia el contenido de `firestore.rules` y pégalo en la consola.

## Estructura Desplegada

```
Frontend:
- Vite build en `/dist`
- Servido por Vercel

Backend:
- Express app en `/api`
- Vercel Functions convierte en serverless
- Conexión directa a Firestore

Base de Datos:
- Firestore (Cloud Firestore)
- Collections migradas desde PostgreSQL
```

## Testing Post-Despliegue

```bash
# Test API health
curl https://pagina-web-principal.vercel.app/api/health

# Test login
curl -X POST https://pagina-web-principal.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ejemplo.com","password":"password123"}'

# Test gallery (público)
curl https://pagina-web-principal.vercel.app/api/gallery
```

## Si Algo Falla

1. Verifica logs en Vercel Dashboard → Deployments → Logs
2. Verifica Firebase Console para errores de credenciales
3. Verifica que todas las env vars están configuradas
4. Revisa CORS settings en vercel.json

## ¡Listo!

Tu aplicación está en:
- **Frontend**: https://pagina-web-principal.vercel.app
- **Backend API**: https://pagina-web-principal.vercel.app/api
- **Base de datos**: Firebase Firestore ☁️
