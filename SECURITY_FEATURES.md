# 🔐 Características de Seguridad Implementadas

Documento que describe todas las características de seguridad avanzada del sistema de administración.

## 1. Cambio de Contraseña con Validación de Fortaleza

### Requisitos Obligatorios
La nueva contraseña debe cumplir con:
- ✓ **Mínimo 8 caracteres**
- ✓ **Una letra mayúscula** (A-Z)
- ✓ **Una letra minúscula** (a-z)
- ✓ **Un número** (0-9)
- ✓ **Un carácter especial** (!@#$%^&* etc.)

### Validación en Dos Pasos con OTP

#### Paso 1: Solicitud
- El administrador ingresa su contraseña actual y la nueva contraseña
- El sistema valida la fortaleza de la nueva contraseña
- Se verifica que la contraseña actual sea correcta

#### Paso 2: Código OTP
- Se genera un código OTP de 6 dígitos
- El código se envía al email del administrador
- **Válido por 5 minutos únicamente**
- Si expira, el código se elimina automáticamente de la BD

#### Paso 3: Validación y Aplicación
- El administrador ingresa el código OTP
- Se verifica que sea válido y no haya expirado
- Se aplica el cambio de contraseña
- Se registra el cambio en el historial con detalles de ubicación
- Se envía email de confirmación

### API Endpoints

#### `POST /api/auth/change-password`
Solicita el cambio de contraseña y envía código OTP.

**Parámetros:**
```json
{
  "currentPassword": "MiContraseñaActual123!",
  "newPassword": "NuevaContraseña456!"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Código de validación enviado al email. Válido por 5 minutos.",
  "token": "hash_del_token"
}
```

#### `POST /api/auth/validate-password-change`
Valida el código OTP y aplica el cambio.

**Parámetros:**
```json
{
  "token": "hash_del_token",
  "otpCode": "123456"
}
```

**Respuesta:**
```json
{
  "ok": true,
  "message": "Contraseña actualizada correctamente. Confirma por email."
}
```

## 2. Historial de Cambios de Contraseña

### Información Registrada
Para cada cambio de contraseña se guarda:
- **Fecha y hora** del cambio
- **Dirección IP** del cliente
- **Navegador** (Chrome, Firefox, Safari, Edge, etc.)
- **Sistema Operativo** (Windows, macOS, Linux, Android, iOS)
- **Tipo de dispositivo** (Desktop, Móvil, Tablet)
- **User Agent** completo

### API Endpoint

#### `GET /api/auth/password-history`
Obtiene el historial de cambios de contraseña del usuario autenticado.

**Respuesta:**
```json
[
  {
    "id": 1,
    "changed_at": "2026-08-16T14:30:00Z",
    "ip_address": "192.168.1.100",
    "browser": "Chrome",
    "os": "Windows",
    "device": "Desktop"
  },
  {
    "id": 2,
    "changed_at": "2026-08-16T10:15:00Z",
    "ip_address": "203.45.67.89",
    "browser": "Safari",
    "os": "iOS",
    "device": "Móvil"
  }
]
```

## 3. Historial de Accesos a Administración

### Información Registrada
Para cada acceso al panel de administración se registra:
- **Fecha y hora** de acceso
- **Dirección IP** de origen
- **Navegador** utilizado
- **Sistema Operativo**
- **Tipo de dispositivo**
- **Acción realizada** (opcional)
- **Recurso accedido** (opcional)

### API Endpoint

#### `GET /api/auth/access-logs`
Obtiene el historial de accesos a administración (solo para administradores).

**Respuesta:**
```json
[
  {
    "id": 1,
    "accessed_at": "2026-08-16T14:45:00Z",
    "ip_address": "192.168.1.100",
    "browser": "Chrome",
    "os": "Windows",
    "device": "Desktop",
    "action": "Acceso"
  }
]
```

## 4. Notificaciones por Email

### Tipos de Notificaciones

#### 4.1 Solicitud de Cambio de Contraseña
Cuando se solicita un cambio, se envía un email con:
- Código OTP de 6 dígitos
- Tiempo de validez (5 minutos)
- Advertencia si no solicitó el cambio

#### 4.2 Confirmación de Cambio
Después de validar el OTP, se envía email con:
- Confirmación del cambio exitoso
- **Detalles de ubicación:**
  - Dirección IP
  - Navegador
  - Sistema Operativo
  - Tipo de dispositivo
  - Fecha y hora exacta
- Instrucción: "Si no realizaste este cambio, contacta al administrador"

### Configuración de Gmail

Para habilitar el envío de emails, configurar variables de entorno:

```bash
# Variables de entorno necesarias
GMAIL_EMAIL=tu-email@gmail.com
GMAIL_APP_PASSWORD=tu-app-password  # Generar en Google Account Security
```

**Pasos para obtener App Password en Gmail:**
1. Ir a myaccount.google.com
2. Seguridad → Contraseñas de aplicación
3. Seleccionar "Correo" y "Windows"
4. Copiar la contraseña generada

### Implementación Actual
En desarrollo, los emails se loguean en consola. Para producción, usar:

```javascript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD
  }
})
```

## 5. Validación y Expiración de Tokens OTP

### Reglas de Seguridad

1. **Duración**: 5 minutos exactos
2. **Invalidación automática**: Se elimina tras expirar
3. **Un solo uso**: Una vez validado, no se puede reutilizar
4. **Verificación de usuario**: Token vinculado al ID del usuario
5. **Token único**: Cada solicitud genera un token diferente

### Limpieza de BD

Los tokens expirados se limpian:
- Al validar (se verifica expiración)
- Automáticamente tras 5 minutos

```sql
-- Consulta para ver tokens pendientes
SELECT * FROM password_change_tokens 
WHERE user_id = 1 AND used = false AND expires_at > NOW();

-- Consulta para ver tokens expirados
SELECT * FROM password_change_tokens 
WHERE expires_at < NOW();
```

## 6. Base de Datos

### Tablas Relacionadas

#### `password_change_tokens`
```sql
CREATE TABLE password_change_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `password_change_history`
```sql
CREATE TABLE password_change_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device TEXT
);
```

#### `admin_access_logs`
```sql
CREATE TABLE admin_access_logs (
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
```

## 7. Flujo Completo del Usuario

### Paso a Paso en la Interfaz

1. **Ir a Perfil**
   - Hacer clic en "Perfil" en la barra lateral de administración

2. **Llenar Formulario Inicial**
   - Ingresar contraseña actual
   - Ingresar nueva contraseña
   - Confirmar nueva contraseña
   - Sistema muestra requisitos en tiempo real con indicadores ✓/✗

3. **Envío de Código**
   - Hacer clic en "Enviar código de validación"
   - Sistema genera OTP y lo envía al email
   - Transición a pantalla de validación OTP

4. **Validación con OTP**
   - Revisar email y copiar código de 6 dígitos
   - Ingresar código en la interfaz
   - Ver temporizador contando hacia atrás (5 minutos)
   - Hacer clic en "Validar código"

5. **Confirmación**
   - Si código es válido: "✅ Contraseña actualizada"
   - Se envía email de confirmación con detalles
   - Se retorna a formulario inicial automáticamente
   - Historial se actualiza con el nuevo cambio

### Pantalla de Perfil - Información Visible

#### Cambio de Contraseña
- Formulario para solicitar cambio
- Indicadores visuales de fortaleza
- Temporizador en pantalla de OTP

#### Historial de Cambios
- Tabla con últimos 10 cambios
- Para cada entrada:
  - Navegador y dispositivo
  - Fecha y hora
  - Dirección IP
  - Sistema operativo

#### Historial de Accesos
- Tabla con últimos 20 accesos
- Para cada entrada:
  - Navegador y dispositivo
  - Fecha y hora
  - Dirección IP
  - Tipo de acción

## 8. Recomendaciones de Seguridad

### Para el Administrador
- ✓ Usar contraseña fuerte con todos los requisitos
- ✓ Revisar regularmente el historial de cambios
- ✓ Verificar accesos no autorizados en el historial
- ✓ Si ve actividad sospechosa, cambiar contraseña inmediatamente
- ✓ No compartir código OTP con nadie

### Para el Sistema
- ✓ Implementar rate limiting en `/api/auth/change-password`
- ✓ Agregar alertas si se detectan múltiples intentos fallidos
- ✓ Usar HTTPS en producción
- ✓ Implementar 2FA adicional si es necesario
- ✓ Hacer backup regular de la BD

## 9. Troubleshooting

### "El código OTP ha expirado"
- Los códigos son válidos solo 5 minutos
- Solicitar un nuevo cambio si ha pasado el tiempo

### "Contraseña actual incorrecta"
- Verificar que se ingresó correctamente la contraseña actual
- Recordar que es case-sensitive

### "No cumple con requisitos"
- Verificar que tiene mínimo 8 caracteres
- Incluir al menos: Mayúscula, minúscula, número, símbolo
- Ver indicadores en pantalla para saber qué falta

### "Email no recibido"
- Revisar carpeta de spam/correo no deseado
- Verificar que el email en la cuenta es correcto
- En desarrollo, revisar logs de la consola del servidor

## 10. Mejoras Futuras

- [ ] Implementar 2FA con autenticador (Google Authenticator, Authy)
- [ ] Envío de notificaciones a dispositivos móviles
- [ ] Bloqueo de cuenta tras múltiples intentos fallidos
- [ ] Sesiones de administrador con registro de actividad
- [ ] Alertas en tiempo real de accesos sospechosos
- [ ] Recuperación de cuenta con verificación de identidad
- [ ] Integración con servicio de monitoreo de seguridad

---

**Última actualización:** 2026-08-16
**Versión:** 1.0
