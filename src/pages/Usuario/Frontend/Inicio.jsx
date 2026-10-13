import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const stats = [
  ['500+', 'Estudiantes'],
  ['30+', 'Docentes capacitados'],
  ['15', 'Años de trayectoria'],
  ['98%', 'Satisfacción de padres'],
]

export default function Inicio({ t, goTo, heroImage, events = [] }) {
  const heroRef = useRef(null)
  const eyebrowRef = useRef(null)
  const titleRef = useRef(null)
  const textRef = useRef(null)
  const actionsRef = useRef(null)
  const mediaRef = useRef(null)
  const statsRef = useRef(null) 
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: 20 },
        
        { opacity: 1, y: 0, duration: 0.6 }
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.2'
        )
        .fromTo(
          textRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.25'
        )
        .fromTo(
          actionsRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.2'
        )
        .fromTo(
          mediaRef.current,
          { opacity: 0, x: 24, scale: 0.97 },
          { opacity: 1, x: 0, scale: 1, duration: 0.9 },
          '-=0.4'
        )

      gsap.fromTo(
        statsRef.current?.children || [],
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 85%',
          },
        }
      )

      gsap.to(mediaRef.current, {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      gsap.to([eyebrowRef.current, titleRef.current, textRef.current, actionsRef.current], {
        yPercent: -3,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      const media = mediaRef.current
      const image = media?.querySelector('img')
      if (media && image) {
        media.addEventListener('mousemove', (event) => {
          const rect = media.getBoundingClientRect()
          const x = (event.clientX - rect.left) / rect.width - 0.5
          const y = (event.clientY - rect.top) / rect.height - 0.5
          gsap.to(image, { rotateY: x * 8, rotateX: -y * 8, scale: 1.03, duration: 0.35, ease: 'power2.out' })
        })

        media.addEventListener('mouseleave', () => {
          gsap.to(image, { rotateY: 0, rotateX: 0, scale: 1, duration: 0.35, ease: 'power2.out' })
        })
      }
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <>
      <section className="home-hero" ref={heroRef}>
        <div className="hero-copy">
          <p className="eyebrow" ref={eyebrowRef}>{t.home.eyebrow}</p>
          <h1 className="home-title" ref={titleRef}>{t.home.title}</h1>
          <p className="home-text" ref={textRef}>{t.home.text}</p>
          <div className="hero-actions" ref={actionsRef}>
            <button className="btn primary" type="button" onClick={() => goTo('contacto')}>
              {t.home.ctaInfo}
            </button>
            <button className="btn light" type="button" onClick={() => goTo('nosotros')}>
              {t.home.ctaSchool}
            </button>
          </div>
        </div>
        <div className="hero-media" ref={mediaRef}>
          <img src={heroImage || '/img/hermogenes.jpeg'} alt="Imagen principal del Centro Escolar" />
        </div>
      </section>

      {events.some((event) => event.is_important || event.isImportant) && (
        <section className="section notice-board" aria-labelledby="notice-board-title">
          <div className="section-heading">
            <p className="eyebrow">Comunicados</p>
            <h2 id="notice-board-title">Avisos importantes</h2>
          </div>
          <div className="important-notices">
            {events.filter((event) => event.is_important || event.isImportant).slice(0, 3).map((event) => (
              <article className="important-notice" key={event.id}>
                {event.image_url && <img src={event.image_url} alt="" />}
                <div>
                  <small>{event.event_date ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString('es-SV') : 'Comunicado escolar'}</small>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  {event.location && <small>📍 {event.location}</small>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="hero-info">
        <span>📍 Avenida El Progreso No. 2, Barrio San Juan, Santiago Nonualco</span>
        <span>📞 +503 2330-4037</span>
        <span>✉️ escuela.342@clases.edu.sv</span>
      </section>

      <section className="section intro">
        <p className="eyebrow">{t.home.commitment}</p>
        <h2>{t.home.commitmentTitle}</h2>
        <p>{t.home.commitmentText}</p>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow"></p>
          <h2>{t.home.statsTitle}</h2>
        </div>
        <div className="stats-grid" ref={statsRef}>
          {stats.map(([number, label]) => (
            <article className="stat-card" key={label}>
              <strong>{number}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
        <div className="descripcion escolar">
          <h1></h1>
        </div>
      </section>

      <section className="section grades-section">
        <div className="section-heading">
          <p className="eyebrow">Oferta académica</p>
          <h2>Grados que acompañamos</h2>
          <p>Una trayectoria escolar organizada por ciclos, desde primer grado hasta noveno.</p>
        </div>
        <div className="grade-cycles">
          <article><h3>Primer ciclo</h3><p>1.º · 2.º · 3.º grado</p></article>
          <article><h3>Segundo ciclo</h3><p>4.º · 5.º · 6.º grado</p></article>
          <article><h3>Tercer ciclo</h3><p>7.º · 8.º · 9.º grado</p></article>
        </div>
      </section>
     
    </>
  )
}
