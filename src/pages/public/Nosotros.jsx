import { useState } from 'react'
import { Page } from './PageLayout'

const demoReviews = [
  { name: 'María García', role: 'Madre de familia', rating: 5, comment: 'Excelente institución. Mi hijo ha mejorado académica y socialmente.' },
  { name: 'Juan Rodríguez', role: 'Padre de familia', rating: 5, comment: 'La disciplina es firme, pero justa, y el ambiente es sano.' },
]

export default function Nosotros({ t, reviews, session, onReview, onDeleteReview }) {
  const [showAllReviews, setShowAllReviews] = useState(false)
  const allReviews = [...reviews, ...demoReviews]
  const visibleReviews = showAllReviews ? allReviews : allReviews.slice(0, 3)
  const hasMoreReviews = allReviews.length > visibleReviews.length
  const currentUserEmail = session?.user?.email?.toLowerCase?.() ?? ''

  return (
    <Page title={t.pages.aboutTitle} intro={t.pages.aboutIntro}>
      <div className="content-grid">
        <article data-reveal>
          <h3>Nuestra historia</h3>
          <p>Fundada con el propósito de ofrecer educación de calidad, la escuela mantiene su compromiso con la excelencia académica.</p>
          <img className="wide-image" src="/img/DrH.png" alt="Imagen historica de la escuela" />
        </article>
        <article>
          <h3>Nuestro equipo</h3>
          <p>Contamos con profesionales capacitados y comprometidos con la enseñanza de calidad.</p>
          <h3>Infraestructura</h3>
          <p>Instalaciones pensadas para facilitar el aprendizaje integral.</p>
        </article>
      </div>
      <section className="subsection">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">Reseñas</p>
          <h2>Lo que dicen padres y estudiantes</h2>
        </div>
        <div className="reviews-grid">
          {visibleReviews.map((review, index) => {
            const isOwner = !!review.email && currentUserEmail && review.email.toLowerCase() === currentUserEmail
            const canDelete = !!session?.user && (session.user.role === 'admin' || isOwner)

            return (
              <article className="review-card" data-reveal key={`${review.name}-${index}`}>
                <div className="stars">{'*'.repeat(review.rating)}{'-'.repeat(5 - review.rating)}</div>
                <p>{review.comment}</p>
                <div className="review-author">
                  <strong>{review.name}</strong>
                  <small>{review.role}</small>
                </div>
                {canDelete && (
                  <button className="btn danger" type="button" onClick={() => onDeleteReview?.(review.id)}>
                    Eliminar
                  </button>
                )}
              </article>
            )
          })}
        </div><br></br>
        {hasMoreReviews && (
          <div className="reviews-footer">
            <button className="btn secondary" type="button" onClick={() => setShowAllReviews((current) => !current)}>
              {showAllReviews ? 'Ver menos reseñas' : 'Ver más reseñas'}
            </button>
          </div>
        )}
          <form className="panel-form" data-reveal onSubmit={onReview}>
 
          <h3>Comparte tu experiencia</h3>
          <input name="name" placeholder={t.forms.name} required />
          <input name="email" type="email" placeholder={t.forms.email} required />
          <select name="role" defaultValue="Padre de familia" required>
            <option>Padre de familia</option>
            <option>Estudiante</option>
            <option>Docente</option>
          </select>
          <select name="rating" defaultValue="5" required>
            <option value="5">5 estrellas</option>
            <option value="4">4 estrellas</option>
            <option value="3">3 estrellas</option>
          </select>
          <textarea name="comment" placeholder="Tu reseña" required />
          <button className="btn primary" type="submit">{t.forms.save}</button>
        </form>
      </section>
    </Page>
  )
}
