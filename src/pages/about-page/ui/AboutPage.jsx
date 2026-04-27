import './AboutPage.css'

const IconMail = () => (
  <svg className="about-page__contact-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconPhone = () => (
  <svg className="about-page__contact-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconMapPin = () => (
  <svg className="about-page__contact-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const IconClock = () => (
  <svg className="about-page__contact-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const values = [
  {
    icon: '🎯',
    title: 'Quality First',
    text: 'We only stock products from trusted brands that meet our rigorous quality standards.',
  },
  {
    icon: '💯',
    title: 'Customer Satisfaction',
    text: "Your happiness is our priority. We're committed to providing exceptional service at every step.",
  },
  {
    icon: '⚡',
    title: 'Fast & Reliable',
    text: "Quick shipping, easy returns, and responsive support - we're here when you need us.",
  },
]

export const AboutPage = () => {
  return (
    <div className="about-page">
      <div className="about-page__container">
        <section className="about-page__hero">
          <h1 className="about-page__title">About TechStore</h1>
          <p className="about-page__subtitle">
            Your trusted destination for premium electronics and cutting-edge technology
          </p>
        </section>

        <section className="about-page__card">
          <h2 className="about-page__h2">Our Story</h2>
          <div className="about-page__text-block">
            <p>
              Founded in 2020, TechStore has grown to become one of the most trusted names in consumer electronics.
              We are passionate about bringing you the latest and greatest technology products at competitive prices.
            </p>
            <p>
              Our mission is simple: to provide exceptional products, outstanding customer service, and a seamless
              shopping experience. Whether you are a tech enthusiast or just looking for reliable electronics, we are
              here to help you find exactly what you need.
            </p>
            <p>
              With a carefully curated selection of premium brands and products, we ensure that every item in our
              catalog meets our high standards for quality and performance.
            </p>
          </div>
        </section>

        <section className="about-page__values">
          <h2 className="about-page__h2 about-page__h2--center">Our Values</h2>
          <div className="about-page__values-grid">
            {values.map((item) => (
              <article key={item.title} className="about-page__value-card">
                <div className="about-page__value-icon-wrap" aria-hidden="true">
                  <span className="about-page__value-icon">{item.icon}</span>
                </div>
                <h3 className="about-page__value-title">{item.title}</h3>
                <p className="about-page__value-text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-page__card">
          <h2 className="about-page__h2">Get in Touch</h2>
          <div className="about-page__contacts-grid">
            <article className="about-page__contact-item">
              <div className="about-page__contact-icon">
                <IconMail />
              </div>
              <div>
                <h3 className="about-page__contact-title">Email Us</h3>
                <p className="about-page__contact-text">support@techstore.com</p>
                <p className="about-page__contact-text">sales@techstore.com</p>
              </div>
            </article>

            <article className="about-page__contact-item">
              <div className="about-page__contact-icon">
                <IconPhone />
              </div>
              <div>
                <h3 className="about-page__contact-title">Call Us</h3>
                <p className="about-page__contact-text">1-800-TECH-SHOP</p>
                <p className="about-page__contact-text">(1-800-832-4746)</p>
              </div>
            </article>

            <article className="about-page__contact-item">
              <div className="about-page__contact-icon">
                <IconMapPin />
              </div>
              <div>
                <h3 className="about-page__contact-title">Visit Us</h3>
                <p className="about-page__contact-text">123 Tech Street</p>
                <p className="about-page__contact-text">San Francisco, CA 94105</p>
              </div>
            </article>

            <article className="about-page__contact-item">
              <div className="about-page__contact-icon">
                <IconClock />
              </div>
              <div>
                <h3 className="about-page__contact-title">Business Hours</h3>
                <p className="about-page__contact-text">Mon-Fri: 9AM - 6PM PST</p>
                <p className="about-page__contact-text">Sat-Sun: 10AM - 4PM PST</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  )
}
