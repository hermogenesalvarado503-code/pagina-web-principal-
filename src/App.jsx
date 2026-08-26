import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './App.css'
import AdminDashboard from './pages/Administrador/AdminDashboard'
import StudentDashboard from './pages/Usuario/Portales/StudentDashboard'
import TeacherDashboard from './pages/Usuario/Portales/TeacherDashboard'
import Inicio from './pages/Usuario/Frontend/Inicio'
import Nosotros from './pages/Usuario/Frontend/Nosotros'
import Servicios from './pages/Usuario/Frontend/Servicios'
import Galeria from './pages/Usuario/Frontend/Galeria'
import Noticias from './pages/Usuario/Frontend/Noticias'
import Contacto from './pages/Usuario/Frontend/Contacto'
import { Page } from './pages/Usuario/Frontend/PageLayout'
import { buildPublicTranslations } from './pages/Usuario/Frontend/content'

gsap.registerPlugin(ScrollTrigger)

const API_URL = import.meta.env.VITE_API_URL || ''
const SESSION_STORAGE_KEY = 'drhga-session'

const fallbackGallery = [
  { id: 'f1', title: 'Alumnos de escuela', description: 'Participacion estudiantil.', image_url: '/img/alumnos.jpeg', sort_order: 1 },
  { id: 'f2', title: 'Dia del arbol', description: 'Jornada ambiental.', image_url: '/img/arbol.jpeg', sort_order: 2 },
  { id: 'f3', title: 'Cancha deportiva', description: 'Espacio deportivo.', image_url: '/img/cancha.jpeg', sort_order: 3 },
]

const fallbackEvents = [
  {
    id: 'e1',
    title: 'Inauguracion del nuevo laboratorio',
    news: 'Nuevo laboratorio escolar',
    description: 'Se inauguro oficialmente el nuevo laboratorio de computacion.',
    event_date: '2024-05-15',
    event_time: '09:00',
    image_url: '/img/DrH.png',
    location: 'Centro Escolar Dr. Hermogenes Alvarado',
    map_iframe: '',
  },
]

const copy = {
  es: buildPublicTranslations('es'),
  en: buildPublicTranslations('en'),
}

const publicRouteMap = {
  inicio: '/',
  nosotros: '/nosotros',
  servicios: '/servicios',
  galeria: '/galeria',
  noticias: '/noticias',
  contacto: '/contacto',
}

const services = [
  ['Educación académica', 'Programas educativos rigurosos desde kínder hasta noveno grado.'],
  ['Actividades deportivas', 'Deporte y educación física para fomentar el trabajo en equipo.'],
  ['Artes y cultura', 'Música, arte y participación cívica.'],
  ['Consejería estudiantil', 'Orientación para estudiantes y familias.'],
]

const demoReviews = [
  { name: 'Maria Garcia', role: 'Madre de familia', rating: 5, comment: 'Excelente institucion. Mi hijo ha mejorado academica y socialmente.' },
  { name: 'Juan Rodriguez', role: 'Padre de familia', rating: 5, comment: 'La disciplina es firme pero justa, y el ambiente es sano.' },
]

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('drhga-lang') || 'es')
  const [page, setPage] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [dashboardTab, setDashboardTab] = useState('profile')
  const [messages, setMessages] = useState([])
  const [reviews, setReviews] = useState([])
  const [gallery, setGallery] = useState(fallbackGallery)
  const [events, setEvents] = useState(fallbackEvents)
  const [notice, setNotice] = useState('')

  const t = copy[lang]
  const pages = useMemo(() => [
    { id: 'inicio', label: t.nav.inicio, icon: '⌂' },
    { id: 'nosotros', label: t.nav.nosotros, icon: '◌' },
    { id: 'servicios', label: t.nav.servicios, icon: '✦' },
    { id: 'galeria', label: t.nav.galeria, icon: '▧' },
    { id: 'noticias', label: t.nav.noticias, icon: '✧' },
    { id: 'contacto', label: t.nav.contacto, icon: '✉' },
  ], [t])

  function changeLang(nextLang) {
    setLang(nextLang)
    localStorage.setItem('drhga-lang', nextLang)
  }

  async function loadPublicData() {
    const [reviewsResult, galleryResult, eventsResult] = await Promise.allSettled([
      fetch(`${API_URL}/api/reviews`).then((res) => res.ok ? res.json() : []),
      fetch(`${API_URL}/api/gallery`).then((res) => res.ok ? res.json() : fallbackGallery),
      fetch(`${API_URL}/api/events`).then((res) => res.ok ? res.json() : fallbackEvents),
    ])
    if (reviewsResult.status === 'fulfilled') setReviews(reviewsResult.value)
    if (galleryResult.status === 'fulfilled') setGallery(galleryResult.value)
    if (eventsResult.status === 'fulfilled') setEvents(eventsResult.value)
  }

  function detectBrowser(userAgent) {
    if (/EdgA?\//i.test(userAgent)) return 'Edge'
    if (/Chrome\//i.test(userAgent) && !/OPR\//i.test(userAgent)) return 'Chrome'
    if (/Firefox\//i.test(userAgent)) return 'Firefox'
    if (/Safari\//i.test(userAgent)) return 'Safari'
    return 'Other'
  }

  function detectOS(userAgent) {
    if (/Windows/i.test(userAgent)) return 'Windows'
    if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS'
    if (/Android/i.test(userAgent)) return 'Android'
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
    return 'Other'
  }

  function detectDevice(userAgent) {
    if (/iPhone|iPod/i.test(userAgent)) return 'Mobile'
    if (/iPad/i.test(userAgent)) return 'Tablet'
    if (/Android/i.test(userAgent)) return 'Mobile'
    if (/Windows|Macintosh|Linux/i.test(userAgent)) return 'Desktop'
    return 'Desktop'
  }

  useEffect(() => {
    const currentPath = publicRouteMap[page] || '/'
    if (!currentPath || currentPath === '/admin' || currentPath === '/login' || currentPath === '/portal') return

    const payload = {
      path: currentPath,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent,
      browser: detectBrowser(navigator.userAgent),
      os: detectOS(navigator.userAgent),
      device: detectDevice(navigator.userAgent),
    }

    fetch(`${API_URL}/api/analytics/page-view`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }, [page])

  useEffect(() => {
    loadPublicData()
  }, [])

  useEffect(() => {
    // Safely check if DOM is ready before querying elements
    if (!document.body) return
    
    const elements = Array.from(document.querySelectorAll('[data-reveal]'))
    if (!elements.length) return

    const ctx = gsap.context(() => {
      elements.forEach((element, index) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 32, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            delay: index * 0.04,
            scrollTrigger: {
              trigger: element,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          }
        )
      })
    })

    return () => ctx.revert()
  }, [page])

  useEffect(() => {
    async function restoreSession() {
      try {
        const data = await request('/api/me')
        if (data?.user) {
          setSession({ user: data.user })
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: data.user }))
          setDashboardTab(defaultTabForRole(data.user.role))
        }
      } catch (err) {
        // Silently handle 401 or missing session - this is expected for non-authenticated users
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (!session) return
    const endpoint = session.user.role === 'admin' ? '/api/messages' : '/api/me/messages'
    fetch(`${API_URL}${endpoint}`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : [])
      .then(setMessages)
      .catch(() => setMessages([]))
  }, [session])

  function goTo(nextPage) {
    if (nextPage === 'admin' || nextPage === 'dashboard') {
      window.location.assign(nextPage === 'admin' ? '/admin' : '/portal')
      return
    }
    if (nextPage === 'login') {
      window.location.assign('/login')
      return
    }
    setPage(nextPage)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
    if (!res.ok) {
      const text = await res.text()
      let message = text || 'Request failed'
      try {
        const json = JSON.parse(text)
        message = json.error || json.message || message
      } catch {
        // keep raw text when JSON parse fails
      }
      throw new Error(message)
    }
    return res.json()
  }

  async function handleContact(event) {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      await request('/api/messages', { method: 'POST', body: JSON.stringify(payload) })
      event.currentTarget.reset()
      setNotice(lang === 'es' ? 'Mensaje enviado correctamente.' : 'Message sent successfully.')
    } catch {
      setNotice(lang === 'es' ? 'No se pudo conectar con el API.' : 'Could not connect to the API.')
    }
  }

  async function handleReview(event) {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    payload.rating = Number(payload.rating)
    try {
      const created = await request('/api/reviews', { method: 'POST', body: JSON.stringify(payload) })
      setReviews((current) => [created, ...current])
      event.currentTarget.reset()
      setNotice(lang === 'es' ? 'Reseña enviada.' : 'Review submitted.')
    } catch {
      setNotice(lang === 'es' ? 'No se pudo enviar la reseña.' : 'Could not submit review.')
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) })
      setSession({ user: data.user })
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: data.user }))
      setDashboardTab(defaultTabForRole(data.user.role))
      if (data.user.role === 'admin') {
        goTo('admin')
      } else {
        setPage('dashboard')
      }
      setNotice(`${t.dashboard.active}: ${data.user.name}`)
    } catch (error) {
      const message = error?.message || ''
      if (message.includes('401') || message.toLowerCase().includes('credenciales') || message.toLowerCase().includes('invalid')) {
        setNotice(lang === 'es' ? 'Usuario o contraseña incorrectos.' : 'Invalid credentials.')
      } else {
        setNotice(lang === 'es' ? 'No se pudo conectar con el API. Verifica el puerto y la URL.' : 'Could not connect to the API. Check port and URL.')
      }
    }
  }

  function clearSessionAndRedirectHome() {
    try { localStorage.removeItem(SESSION_STORAGE_KEY) } catch (e) {}
    setSession(null)
    setMessages([])
    // use replace to avoid back navigation to protected pages
    try { window.location.replace('/') } catch (e) {}
  }

  async function logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout errors, still clear local UI state
    }
    try { localStorage.removeItem(SESSION_STORAGE_KEY) } catch (e) {}
    setSession(null)
    setMessages([])
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/portal')) {
      window.location.assign('/')
      return
    }
    setPage('inicio')
  }

  async function deleteMessage(id) {
    await request(`/api/messages/${id}`, { method: 'DELETE' })
    setMessages((current) => current.filter((message) => message.id !== id))
  }

  async function saveGalleryItem(payload, id) {
    const saved = await request(id ? `/api/gallery/${id}` : '/api/gallery', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    })
    setGallery((current) => id ? current.map((item) => item.id === id ? saved : item) : [...current, saved])
    setNotice(lang === 'es' ? 'Galeria actualizada.' : 'Gallery updated.')
  }

  async function deleteGalleryItem(id) {
    await request(`/api/gallery/${id}`, { method: 'DELETE' })
    setGallery((current) => current.filter((item) => item.id !== id))
  }

  async function saveEvent(payload, id) {
    const saved = await request(id ? `/api/events/${id}` : '/api/events', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    })
    setEvents((current) => id ? current.map((item) => item.id === id ? saved : item) : [saved, ...current])
    setNotice(lang === 'es' ? 'Evento actualizado.' : 'Event updated.')
  }

  async function deleteEvent(id) {
    await request(`/api/events/${id}`, { method: 'DELETE' })
    setEvents((current) => current.filter((item) => item.id !== id))
  }

  async function deleteReview(id) {
    await request(`/api/reviews/${id}`, { method: 'DELETE' })
    setReviews((current) => current.filter((review) => review.id !== id))
    setNotice(lang === 'es' ? 'Reseña eliminada.' : 'Review deleted.')
  }

  function RoleShell() {
    const path = window.location.pathname || '/'
    const [state, setState] = useState({ loading: false, ok: null, user: null })

    function parseTokenPayload(token) {
      try {
        const parts = String(token).split('.')
        if (parts.length < 2) return null
        const payload = parts[1]
        // base64url -> base64
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (payload.length % 4)) % 4)
        const json = JSON.parse(atob(b64))
        return json
      } catch (e) {
        return null
      }
    }

    useEffect(() => {
      let mounted = true
      async function validate() {
        if (!path.startsWith('/admin') && !path.startsWith('/portal') && !path.startsWith('/student') && !path.startsWith('/teacher')) return
        setState({ loading: true, ok: null, user: null })
        try {
          const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' })
          if (!mounted) return
          if (!res.ok) {
            if (res.status === 401) {
              clearSessionAndRedirectHome()
              return
            }
            setState({ loading: false, ok: false, user: null })
            return
          }
          const data = await res.json()
          setState({ loading: false, ok: true, user: data.user })
        } catch (e) {
          if (!mounted) return
          if (String(e?.name || '').toLowerCase() === 'aborterror') return
          setState({ loading: false, ok: false, user: null })
        }
      }
      validate()
      return () => { mounted = false }
    }, [path])

    if (!path.startsWith('/admin') && !path.startsWith('/portal') && !path.startsWith('/student') && !path.startsWith('/teacher')) return null

    if (state.loading) return <div style={{ padding: 24 }}>Validando sesión...</div>
    if (!state.ok) return (
      <div style={{ padding: 24 }}>
        <h2>No autorizado</h2>
        <p>Inicia sesión en la página principal para acceder.</p>
      </div>
    )

    if (path.startsWith('/admin')) {
      if (state.user.role !== 'admin') return (
        <div style={{ padding: 24 }}>
          <h2>No autorizado</h2>
          <p>Solo administradores pueden acceder.</p>
        </div>
      )
      return <AdminDashboard />
    }
    if (path.startsWith('/portal')) {
      if (state.user.role === 'admin') {
        window.location.replace('/admin')
        return null
      }
      return (
        <div className="private-portal">
          <header className="private-portal-header">
            <div><strong>Portal privado</strong><small>{state.user.name}</small></div>
            <button type="button" onClick={logout}>Salir</button>
          </header>
          <Dashboard
            t={t}
            session={{ user: state.user }}
            messages={messages}
            reviews={reviews}
            gallery={gallery}
            events={events}
            tab={dashboardTab}
            setTab={setDashboardTab}
            goTo={goTo}
            onDeleteMessage={deleteMessage}
            onSaveGallery={saveGalleryItem}
            onDeleteGallery={deleteGalleryItem}
            onSaveEvent={saveEvent}
            onDeleteEvent={deleteEvent}
            onDeleteReview={deleteReview}
          />
        </div>
      )
    }
    if (path.startsWith('/student')) {
      if (state.user.role !== 'student') return (
        <div style={{ padding: 24 }}>
          <h2>No autorizado</h2>
          <p>Solo estudiantes pueden acceder.</p>
        </div>
      )
      return <StudentDashboard />
    }
    if (path.startsWith('/teacher')) {
      if (state.user.role !== 'teacher') return (
        <div style={{ padding: 24 }}>
          <h2>No autorizado</h2>
          <p>Solo docentes pueden acceder.</p>
        </div>
      )
      return <TeacherDashboard />
    }
    return null
  }

  const rolePage = RoleShell()
  if (rolePage) return rolePage

  if (window.location.pathname === '/login') {
    return (
      <div className="login-portal">
        <a href="/" className="login-back">← Volver al sitio público</a>
        <Login t={t} onSubmit={handleLogin} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Header
        t={t}
        pages={pages}
        page={page}
        session={session}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        goTo={goTo}
        logout={logout}
      />

      {notice && (
        <button className="notice" type="button" onClick={() => setNotice('')}>
          {notice}
        </button>
      )}

      <main>
        {page === 'inicio' && <Inicio t={t} lang={lang} goTo={goTo} />}
        {page === 'nosotros' && <Nosotros t={t} lang={lang} reviews={reviews} session={session} onReview={handleReview} onDeleteReview={deleteReview} />}
        {page === 'servicios' && <Servicios t={t} lang={lang} goTo={goTo} />}
        {page === 'galeria' && <Galeria t={t} lang={lang} gallery={gallery} goTo={goTo} />}
        {page === 'noticias' && <Noticias t={t} lang={lang} events={events} goTo={goTo} />}
        {page === 'contacto' && <Contacto t={t} lang={lang} onSubmit={handleContact} />}
      </main>

      <Footer t={t} pages={pages} goTo={goTo} />
      <FloatingButtons />
    </div>
  )
}

function Header({ t, pages, page, session, menuOpen, setMenuOpen, goTo, logout }) {
  return (
    <header className="site-header">
      <div className="header-main">
        <button className="brand" type="button" onClick={() => goTo('inicio')}>
          <span className="brand-burst" aria-hidden="true">✦</span>
          <span className="brand-badge">
            <img src="/img/logo.jpeg" alt="Logo del Centro Escolar Dr. Hermogenes Alvarado" />
          </span>
          <span>
            <strong>Centro Escolar Dr. Hermogenes Alvarado</strong>
            <small>{t.home.text}</small>
          </span>
        </button>

        <div className="header-actions">
          <button className="ghost" type="button" onClick={() => goTo('login')}>{t.nav.ingresar}</button>
          <button className={`nav-toggle ${menuOpen ? 'is-open' : ''}`} type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && <button className="nav-scrim" type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <nav className={menuOpen ? 'nav-primary open' : 'nav-primary'} aria-label="Navegación principal">
        {pages.map((item) => (
          <button key={item.id} className={`${page === item.id ? 'active ' : ''}nav-item-${item.id}`} type="button" onClick={() => goTo(item.id)}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}


function Login({ t, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <section className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>{t.login.title}</h1>
        <p>{t.login.text}</p>
        <input name="email" type="email" autoComplete="username" placeholder={t.forms.email} required />
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t.login.password}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        <button className="btn primary" type="submit">{t.login.submit}</button>
        <small>Admin: admin@drhga.edu.sv / usalacontraseña</small>
      </form>
    </section>
  )
}

function Dashboard(props) {
  const { t, session, tab, setTab } = props
  if (!session) return <Login t={t} onSubmit={() => {}} />

  const role = session.user.role
  const tabs = tabsForRole(role, t)

  return (
    <Page title={dashboardTitle(role, t)} intro={`${t.dashboard.active}: ${session.user.name}`}>
      <div className="dashboard-tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} type="button" onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <article className="metric">
          <strong>{props.messages.length}</strong>
          <span>{t.dashboard.messages}</span>
        </article>
        <article className="metric">
          <strong>{props.gallery.length}</strong>
          <span>{t.dashboard.gallery}</span>
        </article>
        <article className="metric">
          <strong>{role}</strong>
          <span>{t.dashboard.role}</span>
        </article>
      </div>

      {tab === 'profile' && <ProfilePanel t={t} session={session} />}
      {tab === 'messages' && <MessagesPanel {...props} />}
      {tab === 'gallery' && role === 'admin' && <GalleryAdmin {...props} />}
      {tab === 'events' && role === 'admin' && <EventsAdmin {...props} />}
      {tab === 'reviews' && role === 'admin' && <ReviewsAdmin {...props} />}
      {tab === 'user' && role === 'user' && <UserPanel t={t} goTo={props.goTo} />}
      {tab === 'student' && role === 'student' && <StudentPanel t={t} goTo={props.goTo} />}
      {tab === 'teacher' && role === 'teacher' && <TeacherPanel t={t} events={props.events} />}
    </Page>
  )
}

function ProfilePanel({ t, session }) {
  return (
    <section className="subsection">
      <article className="contact-card">
        <h2>{t.dashboard.profile}</h2>
        <p><strong>{t.forms.name}:</strong> {session.user.name}</p>
        <p><strong>{t.forms.email}:</strong> {session.user.email}</p>
        <p><strong>{t.dashboard.role}:</strong> {session.user.role}</p>
      </article>
    </section>
  )
}

function MessagesPanel({ t, messages, session, goTo, onDeleteMessage }) {
  const isAdmin = session.user.role === 'admin'
  return (
    <section className="subsection">
      <div className="section-heading row">
        <div>
          <p className="eyebrow">{t.dashboard.messages}</p>
          <h2>{isAdmin ? t.dashboard.adminMessagesTitle : t.dashboard.userMessagesTitle}</h2>
        </div>
        {!isAdmin && <button className="btn secondary" type="button" onClick={() => goTo('contacto')}>{t.forms.send}</button>}
      </div>
      <div className="message-list">
        {messages.length === 0 && <p>{t.dashboard.noMessages}</p>}
        {messages.map((message) => (
          <article className="message-card" key={message.id}>
            <div>
              <strong>{message.name}</strong>
              <small>{message.email} {message.phone ? `- ${message.phone}` : ''}</small>
            </div>
            <h3>{message.subject}</h3>
            <p>{message.message}</p>
            <small>{message.category} - {new Date(message.created_at).toLocaleString()}</small>
            {isAdmin && <button className="danger" type="button" onClick={() => onDeleteMessage(message.id)}>{t.forms.delete}</button>}
          </article>
        ))}
      </div>
    </section>
  )
}

function GalleryAdmin({ t, gallery, onSaveGallery, onDeleteGallery }) {
  const [editing, setEditing] = useState(null)
  return (
    <section className="subsection">
      <div className="section-heading">
        <p className="eyebrow">{t.dashboard.gallery}</p>
        <h2>{t.dashboard.adminGalleryTitle}</h2>
      </div>
      <GalleryForm t={t} editing={editing} onCancel={() => setEditing(null)} onSave={async (payload) => {
        await onSaveGallery(payload, editing?.id)
        setEditing(null)
      }} />
      <div className="admin-list">
        {gallery.length === 0 ? (
          <p>{t.dashboard.noGalleryItems}</p>
        ) : gallery.map((item) => (
          <article className="message-card admin-item" key={item.id}>
            <img src={item.image_url} alt={item.title} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.image_url}</small>
            </div>
            <button className="btn secondary" type="button" onClick={() => setEditing(item)}>{t.forms.update}</button>
            <button className="danger" type="button" onClick={() => onDeleteGallery(item.id)}>{t.forms.delete}</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function GalleryForm({ t, editing, onCancel, onSave }) {
  return (
    <form className="panel-form" key={editing?.id || 'new-gallery'} onSubmit={(event) => {
      event.preventDefault()
      onSave(Object.fromEntries(new FormData(event.currentTarget).entries()))
      event.currentTarget.reset()
    }}>
      <h3>{editing ? 'Editar imagen' : 'Agregar imagen'}</h3>
      <input name="title" defaultValue={editing?.title || ''} placeholder={t.forms.title} required />
      <textarea name="description" defaultValue={editing?.description || ''} placeholder={t.forms.description} />
      <input name="image_url" defaultValue={editing?.image_url || ''} placeholder="/img/alumnos.jpeg o https://..." required />
      <input name="sort_order" type="number" defaultValue={editing?.sort_order || 0} placeholder={t.forms.order} />
      <div className="form-actions">
        <button className="btn primary" type="submit">{editing ? t.forms.update : t.forms.save}</button>
        {editing && <button className="btn secondary" type="button" onClick={onCancel}>{t.forms.cancel}</button>}
      </div>
    </form>
  )
}

function EventsAdmin({ t, events, onSaveEvent, onDeleteEvent }) {
  const [editing, setEditing] = useState(null)
  return (
    <section className="subsection">
      <div className="section-heading">
        <p className="eyebrow">{t.dashboard.events}</p>
        <h2>{t.dashboard.adminEventsTitle}</h2>
      </div>
      <EventForm t={t} editing={editing} onCancel={() => setEditing(null)} onSave={async (payload) => {
        await onSaveEvent(payload, editing?.id)
        setEditing(null)
      }} />
      <div className="admin-list">
        {events.length === 0 ? (
          <p>{t.dashboard.noEvents}</p>
        ) : events.map((event) => (
          <article className="message-card admin-item" key={event.id}>
            {event.image_url && <img src={event.image_url} alt={event.title} />}
            <div>
              <small>{formatEventDate(event)}</small>
              <h3>{event.title}</h3>
              <strong>{event.news}</strong>
              <p>{event.description}</p>
              <small>{event.location}</small>
            </div>
            <button className="btn secondary" type="button" onClick={() => setEditing(event)}>{t.forms.update}</button>
            <button className="danger" type="button" onClick={() => onDeleteEvent(event.id)}>{t.forms.delete}</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function ReviewsAdmin({ t, reviews, onDeleteReview }) {
  return (
    <section className="subsection">
      <div className="section-heading">
        <p className="eyebrow">{t.dashboard.reviews}</p>
        <h2>{t.dashboard.adminReviewsTitle}</h2>
      </div>
      <div className="message-list">
        {reviews.length === 0 ? (
          <p>{t.dashboard.noReviews}</p>
        ) : reviews.map((review) => (
          <article className="message-card" key={review.id}>
            <div>
              <strong>{review.name}</strong>
              <small>{review.role}</small>
            </div>
            <div className="review-content">
              <div className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
              <p>{review.comment}</p>
              <small>{new Date(review.created_at).toLocaleString()}</small>
            </div>
            <button className="danger" type="button" onClick={() => onDeleteReview(review.id)}>{t.forms.delete}</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function EventForm({ t, editing, onCancel, onSave }) {
  return (
    <form className="panel-form event-form" key={editing?.id || 'new-event'} onSubmit={(event) => {
      event.preventDefault()
      onSave(Object.fromEntries(new FormData(event.currentTarget).entries()))
      event.currentTarget.reset()
    }}>
      <h3>{editing ? 'Editar evento' : 'Agregar evento'}</h3>
      <input name="title" defaultValue={editing?.title || ''} placeholder={t.forms.title} required />
      <input name="news" defaultValue={editing?.news || ''} placeholder={t.forms.news} required />
      <textarea name="description" defaultValue={editing?.description || ''} placeholder={t.forms.description} required />
      <input name="event_date" type="date" defaultValue={dateInputValue(editing?.event_date)} />
      <input name="event_time" type="time" defaultValue={timeInputValue(editing?.event_time)} />
      <input name="image_url" defaultValue={editing?.image_url || ''} placeholder={t.forms.image} />
      <input name="location" defaultValue={editing?.location || ''} placeholder={t.forms.location} />
      <textarea name="map_iframe" defaultValue={editing?.map_iframe || ''} placeholder={t.forms.iframe} />
      <div className="form-actions">
        <button className="btn primary" type="submit">{editing ? t.forms.update : t.forms.save}</button>
        {editing && <button className="btn secondary" type="button" onClick={onCancel}>{t.forms.cancel}</button>}
      </div>
    </form>
  )
}

function UserPanel({ t, goTo }) {
  return (
    <section className="subsection">
      <article className="contact-card">
        <h2>{t.dashboard.userTab}</h2>
        <p>{t.dashboard.userHelp}</p>
        <button className="btn primary" type="button" onClick={() => goTo('contacto')}>{t.forms.send}</button>
      </article>
      <div className="content-grid" style={{ marginTop: '1rem' }}>
        <article className="card">
          <h3>{t.dashboard.messages}</h3>
          <p>{t.dashboard.userHelp}</p>
        </article>
        <article className="card">
          <h3>{t.dashboard.events}</h3>
          <p>{t.dashboard.userHelp}</p>
        </article>
      </div>
    </section>
  )
}

function StudentPanel({ t, goTo }) {
  return (
    <section className="subsection">
      <article className="contact-card">
        <h2>{t.dashboard.studentTab}</h2>
        <p>{t.dashboard.studentHelp}</p>
        <button className="btn primary" type="button" onClick={() => goTo('contacto')}>{t.forms.send}</button>
      </article>
    </section>
  )
}

function TeacherPanel({ t, events }) {
  return (
    <section className="subsection">
      <article className="contact-card">
        <h2>{t.dashboard.teacherTab}</h2>
        <p>{t.dashboard.teacherHelp}</p>
      </article>
      <div className="card-grid">
        {events.slice(0, 3).map((event) => (
          <article className="card" key={event.id}>
            <small>{formatEventDate(event)}</small>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Footer({ t, pages, goTo }) {
  return (
    <footer className="footer-main">
      <div>
      <h3>INSCRIPCIONES</h3>
      <h2>Forma parte de nuestra comunidad educativa</h2>
      <h6 className="footer-description home-text text-aling" type="text">
        Comunícate con nosotros para recibir orientación sobre los requisitos, horarios y procesos de admisión.
      </h6>
      <button className="btn secondary footer-contact-button" type="button" onClick={() => goTo('contacto')}>{t.forms.sending}</button>
        <h4>ACERCA DE LA ESCUELA</h4>
        <p>Centro Escolar Dr. Hermogenes Alvarado, dedicado a la formación integral de estudiantes.</p>
      </div>
      <div className="footer-nav">
        <h4>{t.nav.dashboard}</h4>
        {pages.slice(0, 6).map((item) => (
          <button key={item.id} type="button" onClick={() => goTo(item.id)}>{item.label}</button>
        ))}
      </div>
      <div>
        <h4>CONTACTO</h4>
        <p>+503 2330-4037<br /><br />escuela.342@clases.edu.sv<br /><br />Lunes a viernes: 7:00 AM - 4:00 PM</p>
      </div>
      <p className="copyright">2026 Centro Escolar Dr. Hermogenes Alvarado. Todos los derechos reservados.</p>
    </footer>
  )
}

function FloatingButtons() {
  const containerRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const buttons = containerRef.current?.querySelectorAll('a')
      if (!buttons?.length) return

      gsap.fromTo(
        buttons,
        { opacity: 0, y: 24, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.12, ease: 'power2.out' }
      )

      gsap.to(buttons, {
        yPercent: (index) => (index % 2 === 0 ? -8 : 8),
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="floating-actions" ref={containerRef} aria-label="Redes sociales">
      <a href="https://www.facebook.com/cehermogenes/?locale=es_LA" target="_blank" rel="noreferrer" aria-label="Facebook" data-tip="Contáctanos por Facebook">
        <span className="floating-tip">Contáctanos por Facebook</span>
        <img src="/img/Logo_de_Facebook.png" alt="" />
      </a>
      <a href="https://wa.me/50323304037" target="_blank" rel="noreferrer" aria-label="WhatsApp" data-tip="Escríbenos por WhatsApp">
        <span className="floating-tip">Escríbenos por WhatsApp</span>
        <img src="/img/WhatsAp.png" alt="" />
      </a>
      <a href="https://mail.google.com/mail/?view=cm&fs=1&to=escuela.342%40clases.edu.sv" target="_blank" rel="noreferrer" aria-label="Gmail" data-tip="Escríbenos por Gmail">
        <span className="floating-tip">Escríbenos por Gmail</span>
        <img src="/img/gmail.jpeg" alt="Logo de Gmail" />
      </a>
    </div>
  )
}

function dashboardTitle(role, t) {
  if (role === 'admin') return t.dashboard.admin
  if (role === 'student') return t.dashboard.student
  if (role === 'teacher') return t.dashboard.teacher
  return t.dashboard.user
}

function tabsForRole(role, t) {
  if (role === 'admin') {
    return [
      { id: 'profile', label: t.dashboard.profile },
      { id: 'messages', label: t.dashboard.messages },
      { id: 'gallery', label: t.dashboard.gallery },
      { id: 'events', label: t.dashboard.events },
      { id: 'reviews', label: t.dashboard.reviews },
    ]
  }
  if (role === 'student') {
    return [
      { id: 'profile', label: t.dashboard.profile },
      { id: 'messages', label: t.dashboard.messages },
      { id: 'student', label: t.dashboard.studentTab },
    ]
  }
  if (role === 'teacher') {
    return [
      { id: 'profile', label: t.dashboard.profile },
      { id: 'messages', label: t.dashboard.messages },
      { id: 'teacher', label: t.dashboard.teacherTab },
    ]
  }
  if (role === 'user') {
    return [
      { id: 'profile', label: t.dashboard.profile },
      { id: 'messages', label: t.dashboard.messages },
      { id: 'user', label: t.dashboard.userTab },
    ]
  }
  return [
    { id: 'profile', label: t.dashboard.profile },
    { id: 'messages', label: t.dashboard.messages },
  ]
}

function defaultTabForRole(role) {
  if (role === 'student') return 'student'
  if (role === 'teacher') return 'teacher'
  if (role === 'user') return 'user'
  return 'profile'
}

function formatEventDate(event) {
  const date = event.event_date ? new Date(event.event_date).toLocaleDateString() : 'Sin fecha'
  const time = event.event_time ? String(event.event_time).slice(0, 5) : ''
  return time ? `${date} - ${time}` : date
}

function dateInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function timeInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

export default App
