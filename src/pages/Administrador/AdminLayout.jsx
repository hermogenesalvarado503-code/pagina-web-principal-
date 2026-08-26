import { useState } from 'react'
import './admin.css'

const sections = [
  { id: 'overview', label: 'Dashboard', icon: '▦' },
  { id: 'users', label: 'Usuarios', icon: '◌' },
  { id: 'gallery', label: 'Galería', icon: '▧' },
  { id: 'events', label: 'Noticias', icon: '✧' },
  { id: 'messages', label: 'Mensajes', icon: '✉' },
  { id: 'reviews', label: 'Reseñas', icon: '★' },
  { id: 'profile', label: 'Perfil', icon: '◉' },
]

export default function AdminLayout({ children, activeSection, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(section) {
    onNavigate(section)
    setMenuOpen(false)
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-brand"><span aria-hidden="true">◈</span> Administración</div>
          <button className={`admin-menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" aria-label={menuOpen ? 'Cerrar menú administrativo' : 'Abrir menú administrativo'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
        </div>
        <a className="admin-public-link" href="/" aria-label="Ver sitio público">
          <span className="admin-public-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path d="M7 3.5h8.5A2.5 2.5 0 0 1 18 6v12.5a1 1 0 0 1-1.56.83L12 17.75l-4.44 1.58A1 1 0 0 1 6 17.5V6a2.5 2.5 0 0 1 1-1.8A2.5 2.5 0 0 1 7 3.5Zm1.5 3.3v8.7l3.44-1.23a1.2 1.2 0 0 1 .56 0L15.5 15.5V6.8a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1Zm4.5 2.2h1.2v2.5H13zm-2.6 0h1.2v2.5H10.4z" />
            </svg>
          </span>
          <span>Ver sitio público</span>
        </a>
        <nav className={menuOpen ? 'open' : ''}>
          {sections.map((section) => (
            <button key={section.id} type="button" className={activeSection === section.id ? 'active' : ''} onClick={() => navigate(section.id)}>
              <span aria-hidden="true">{section.icon}</span>{section.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
