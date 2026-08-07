import './teacher.css'

export default function TeacherLayout({ children }) {
  return (
    <div className="teacher-shell">
      <header className="teacher-header">Docente</header>
      <main className="teacher-main">{children}</main>
    </div>
  )
}
