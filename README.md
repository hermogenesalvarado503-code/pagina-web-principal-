# Sitio Web DRHGA

Proyecto fusionado del sitio HTML original con React, API Node y PostgreSQL en Docker.

## Ejecutar con Docker

```bash
docker compose up -d --build
```

URLs:

- Web: http://localhost:5174
- API: http://localhost:4000/api/health
- PostgreSQL: localhost:5432

## Configuración local

Asegúrate de tener el archivo `.env` en este directorio con estos valores:

```env
API_PORT=4000
DATABASE_URL=postgres://drhga:drhga@postgres:5432/drhga
JWT_SECRET=cambia-este-secreto-en-produccion
CORS_ORIGIN=http://localhost:5174
VITE_API_URL=http://localhost:4000
WEB_PORT=5174
POSTGRES_DB=drhga
POSTGRES_USER=drhga
POSTGRES_PASSWORD=drhga
```

## Usuarios de prueba

- Administrador: `admin@drhga.edu.sv` / `admin123`
- Usuario: `user@drhga.edu.sv` / `usuario123`
- Estudiante: `estudiante@drhga.edu.sv` / `estudiante123`
- Docente: `docente@drhga.edu.sv` / `docente123`

## Que incluye

- Sitio publico en React con Inicio, Nosotros, Servicios, Galeria, Noticias y Contacto.
- Footer, botones flotantes de Facebook y WhatsApp e imagenes copiadas del sitio HTML.
- Dashboard para administrador con mensajes recibidos y eliminacion.
- Dashboard para usuario con historial de mensajes.
- API con login, roles, mensajes y resenas.
- PostgreSQL con tablas y datos iniciales en `server/db/init.sql`.

## Comandos utiles

```bash
docker compose ps
docker compose logs -f api
docker compose down
```
