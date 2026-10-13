# Conectar Gmail con OAuth 2.0

Esta configuración sustituye las contraseñas de aplicación. El servidor guarda el token de renovación cifrado en PostgreSQL y lo utiliza para enviar los códigos OTP y las confirmaciones de contraseña.

## 1. Crear las credenciales en Google Cloud

1. Abra [Google Cloud Console](https://console.cloud.google.com/) y cree o seleccione un proyecto.
2. En **APIs y servicios**, habilite **Gmail API**.
3. Configure la **pantalla de consentimiento OAuth**. Si la aplicación está en modo de prueba, agregue `hermogenesalvarado503@gmail.com` como usuario de prueba.
4. Cree una credencial de tipo **ID de cliente OAuth** para **Aplicación web**.
5. Agregue esta URI de redirección autorizada para Docker local:

   ```
   http://localhost:4000/api/auth/gmail-oauth/callback
   ```

   En producción use la misma ruta con el dominio HTTPS real, por ejemplo `https://tu-dominio.com/api/auth/gmail-oauth/callback`.

## 2. Configurar el proyecto

En `.env`, complete los valores emitidos por Google:

```env
GMAIL_EMAIL=hermogenesalvarado503@gmail.com
PASSWORD_CHANGE_EMAIL=hermogenesalvarado503@gmail.com
GOOGLE_OAUTH_CLIENT_ID=tu_cliente.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=tu_secreto_de_cliente
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4000/api/auth/gmail-oauth/callback
OAUTH_TOKEN_ENCRYPTION_KEY=una_clave_aleatoria_larga
```

Para generar `OAUTH_TOKEN_ENCRYPTION_KEY` en PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

No publique ni comparta `.env`, el secreto OAuth ni la clave de cifrado.

## 3. Autorizar Gmail

1. Reconstruya los contenedores: `docker compose up -d --build`.
2. Entre a `http://localhost:5174/admin` y abra **Perfil**.
3. En **Conexión segura con Gmail**, seleccione **Conectar Gmail**.
4. Inicie sesión con `hermogenesalvarado503@gmail.com` y acepte el permiso solicitado.
5. Google volverá a la aplicación y mostrará **Gmail conectado**. Desde ese momento los códigos OTP y las confirmaciones se enviarán por OAuth 2.0.

La URI configurada en Google debe coincidir exactamente con `GOOGLE_OAUTH_REDIRECT_URI`.
