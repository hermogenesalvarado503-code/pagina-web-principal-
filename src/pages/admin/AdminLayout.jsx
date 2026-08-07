import './admin.css'

export default function AdminLayout({ children, activeSection, onNavigate }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">Admin</div>
        <nav>
          <button type="button" className={activeSection === 'overview' ? 'active' : ''} onClick={() => onNavigate('overview')}>Dashboard</button>
          <button type="button" className={activeSection === 'users' ? 'active' : ''} onClick={() => onNavigate('users')}>Usuarios</button>
          <button type="button" className={activeSection === 'gallery' ? 'active' : ''} onClick={() => onNavigate('gallery')}>Galería</button>
          <button type="button" className={activeSection === 'events' ? 'active' : ''} onClick={() => onNavigate('events')}>Noticias</button>
          <button type="button" className={activeSection === 'reviews' ? 'active' : ''} onClick={() => onNavigate('reviews')}>Reseñas</button>
        </nav>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
