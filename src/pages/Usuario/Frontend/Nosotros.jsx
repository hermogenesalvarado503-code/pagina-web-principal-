import { useState } from 'react'
import { Page } from './PageLayout'

export default function Nosotros({ t, reviews, onReview }) {
  const [showAllReviews, setShowAllReviews] = useState(false)
  const allReviews = reviews.filter((review) => review?.comment && review?.name)
  const visibleReviews = showAllReviews ? allReviews : allReviews.slice(0, 3)
  const hasMoreReviews = allReviews.length > visibleReviews.length

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
          <p>Opiniones de nuestra comunidad educativa sobre su experiencia en el Centro Escolar.</p>
        </div>
        <div className="reviews-grid">
          {visibleReviews.length === 0 && <p>Aún no hay comentarios. ¡Sé el primero en compartir tu experiencia!</p>}
          {visibleReviews.map((review, index) => {
            const rating = Math.min(5, Math.max(0, Number(review.rating) || 0))

            return (
              <article className="review-card" data-reveal key={review.id || `${review.name}-${index}`}>
                <div className="stars" aria-label={`${rating} de 5 estrellas`}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</div>
                <p className="review-comment">“{review.comment}”</p>
                <div className="review-author">
                  <strong>{review.name}</strong>
                  <small>{review.role}</small>
                </div>
              </article>
            )
          })}
        </div>
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
            <option value="2">2 estrellas</option>
            <option value="1">1 estrella</option>
          </select>
          <textarea name="comment" placeholder="Tu reseña" required />
          <button className="btn primary" type="submit">{t.forms.save}</button>
        </form>
      </section>
    </Page>
  )
}
