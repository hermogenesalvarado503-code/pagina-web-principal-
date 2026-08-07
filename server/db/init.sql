CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'student', 'teacher')),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'inquiry',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gallery_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  news TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE,
  event_time TIME,
  image_url TEXT,
  location TEXT,
  map_iframe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email, role, password_salt, password_hash)
VALUES
  ('Administrador DRHGA', 'admin@drhga.edu.sv', 'admin', '90c436599b118c9ef52a836852684341', 'f699c9a5c87c8505735256e2f3b9d292d6d9640636abce2d7fe60155c64cfbefce68059b7820492cdf86f98a9bdd1d509ec55b77928e79a423f0e1a7b60129eb'),
  ('Usuario Demo', 'user@drhga.edu.sv', 'user', '3f340bda0054dbf668b5e08bec63a75c', 'cfe759ad7571a6fc781f7ecdf267408d4d0a264d1c1bf3594166d24c7c1cc776e10a1717317bd888055a079740453dce1c458c9ba6a9a8b7dd213d2bcca50fb5'),
  ('Estudiante Demo', 'estudiante@drhga.edu.sv', 'student', '22833ab7538c913ff15640e5346caec2', '6f97addd2199969e08d33f3127aa68c9764c36a40ef63370b059ca77fdbbcf53e83706455d1bcc47f5902d78635e7cb9a7412ad1e390b2b1c43acbed3f4d713f'),
  ('Docente Demo', 'docente@drhga.edu.sv', 'teacher', '62713d96c4d93c27f7272c47fc508913', '5080f51f8772adf14fe18fcddf2dade97e335eb2a252c8afabb87c536306e6950dfa8408337d52a97759f61adaea2897b218a27bc571eb7a229a2dfa7f6cb5fd')
ON CONFLICT (email) DO NOTHING;

INSERT INTO reviews (name, email, role, rating, comment)
SELECT 'Maria Garcia', 'maria@example.com', 'Madre de familia', 5, 'Excelente institucion. Mi hijo ha mejorado academica y socialmente.'
WHERE NOT EXISTS (SELECT 1 FROM reviews);

INSERT INTO messages (name, email, phone, subject, category, message)
SELECT 'Familia Ramirez', 'familia@example.com', '23304037', 'Consulta de admisiones', 'admissions', 'Deseamos informacion sobre requisitos de matricula.'
WHERE NOT EXISTS (SELECT 1 FROM messages);

INSERT INTO gallery_items (title, description, image_url, sort_order)
SELECT * FROM (VALUES
  ('Alumnos de escuela', 'Participacion estudiantil en actividades escolares.', '/img/alumnos.jpeg', 1),
  ('Dia del arbol', 'Jornada educativa de conciencia ambiental.', '/img/arbol.jpeg', 2),
  ('Cancha deportiva', 'Espacio para actividades deportivas.', '/img/cancha.jpeg', 3),
  ('Kinder', 'Ambiente inicial para los mas pequenos.', '/img/kinder.jpeg', 4),
  ('Acto civico', 'Participacion civica de estudiantes.', '/img/actocivico.jpeg', 5),
  ('Formacion', 'Momentos de organizacion escolar.', '/img/form.jpeg', 6)
) AS seed(title, description, image_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM gallery_items);

INSERT INTO events (title, news, description, event_date, event_time, image_url, location, map_iframe)
SELECT * FROM (VALUES
  ('Inauguracion del nuevo laboratorio', 'Nuevo laboratorio escolar', 'Se inauguro oficialmente el nuevo laboratorio de computacion, con planes para activarlo como apoyo tecnologico.', DATE '2024-05-15', TIME '09:00', '/img/DrH.png', 'Centro Escolar Dr. Hermogenes Alvarado', ''),
  ('Campeonato deportivo escolar', 'Campeonato regional', 'Estudiantes participaron exitosamente en actividades deportivas regionales.', DATE '2024-05-22', TIME '08:00', '/img/cancha.jpeg', 'Cancha deportiva', ''),
  ('Graduacion promocion 2024', 'Ceremonia de graduacion', 'La ceremonia de graduacion reunio a familias, docentes y estudiantes.', DATE '2024-05-30', TIME '14:00', '/img/form.jpeg', 'Salon escolar', '')
) AS seed(title, news, description, event_date, event_time, image_url, location, map_iframe)
WHERE NOT EXISTS (SELECT 1 FROM events);
