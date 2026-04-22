import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../../shared/config/routes.js'
import './Footer.css'

const IconFacebook = () => (
  <svg className="site-footer__social-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconTwitter = () => (
  <svg className="site-footer__social-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const IconInstagram = () => (
  <svg className="site-footer__social-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" stroke="currentColor" strokeWidth="2" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="currentColor" strokeWidth="2" />
    <path d="M17.5 6.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const IconYoutube = () => (
  <svg className="site-footer__social-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="m10 15 5-3-5-3z" fill="currentColor" />
  </svg>
)

export const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="site-footer__container">
        <div className="site-footer__grid">
          <div>
            <div className="site-footer__brand-row">
              <div className="site-footer__logo-mark" aria-hidden="true">
                <span>T</span>
              </div>
              <span className="site-footer__brand-text">TechStore</span>
            </div>
            <p className="site-footer__lead">
              Your trusted destination for premium electronics and tech accessories. Quality products, competitive
              prices, exceptional service.
            </p>
            <div className="site-footer__socials">
              <a href="#" className="site-footer__social" aria-label="Facebook">
                <IconFacebook />
              </a>
              <a href="#" className="site-footer__social" aria-label="Twitter">
                <IconTwitter />
              </a>
              <a href="#" className="site-footer__social" aria-label="Instagram">
                <IconInstagram />
              </a>
              <a href="#" className="site-footer__social" aria-label="YouTube">
                <IconYoutube />
              </a>
            </div>
          </div>

          <div>
            <h3 className="site-footer__heading">Quick Links</h3>
            <ul className="site-footer__list">
              <li>
                <Link className="site-footer__link" to={APP_ROUTES.catalog}>
                  Shop All Products
                </Link>
              </li>
              <li>
                <Link className="site-footer__link" to={APP_ROUTES.deals}>
                  Special Deals
                </Link>
              </li>
              <li>
                <span className="site-footer__link site-footer__link--muted">About Us</span>
              </li>
              <li>
                <span className="site-footer__link site-footer__link--muted">Contact Support</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="site-footer__heading">Customer Service</h3>
            <ul className="site-footer__list">
              <li>
                <a href="#" className="site-footer__link">
                  Shipping Information
                </a>
              </li>
              <li>
                <a href="#" className="site-footer__link">
                  Returns &amp; Exchanges
                </a>
              </li>
              <li>
                <a href="#" className="site-footer__link">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="site-footer__link">
                  Track Order
                </a>
              </li>
            </ul>
            <div className="site-footer__support">
              <p className="site-footer__support-label">Customer Support:</p>
              <p className="site-footer__support-phone">1-800-TECH-SHOP</p>
              <p className="site-footer__support-email">support@techstore.com</p>
            </div>
          </div>

          <div>
            <h3 className="site-footer__heading">Newsletter</h3>
            <p className="site-footer__newsletter-text">Subscribe to get special offers, free giveaways, and updates.</p>
            <form
              className="site-footer__form"
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <input type="email" placeholder="Enter your email" className="site-footer__input" />
              <button type="submit" className="site-footer__submit">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>© 2026 TechStore. All rights reserved.</p>
          <div className="site-footer__legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
