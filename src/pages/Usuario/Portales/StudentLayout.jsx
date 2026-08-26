import './student.css'

export default function StudentLayout({ children }) {
  return (
    <div className="student-shell">
      <header className="student-header">Estudiante</header>
      <main className="student-main">{children}</main>
    </div>
  )
}
