import * as portfolioData from "../data/portfolio";

const SITE_URL = "https://musicdesigner.geo-drops.com";

const navigationLinks = [
  { href: "/#work", label: "Work" },
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/#contact", label: "Contact" },
];

function normalizeSocialLinks(source) {
  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (typeof item === "string") {
          return { label: "Social profile", href: item };
        }

        return {
          label: item?.label || item?.name || item?.platform,
          href: item?.href || item?.url,
        };
      })
      .filter((item) => item.label && item.href);
  }

  if (source && typeof source === "object") {
    return Object.entries(source)
      .map(([label, value]) => {
        if (typeof value === "string") {
          return { label, href: value };
        }

        return {
          label: value?.label || value?.name || label,
          href: value?.href || value?.url,
        };
      })
      .filter((item) => item.label && item.href);
  }

  return [];
}

function collectSocialLinks(contact, profile) {
  const explicitSocials =
    contact.socials ||
    contact.socialLinks ||
    contact.social ||
    profile.socials ||
    profile.socialLinks ||
    portfolioData.socialLinks ||
    portfolioData.socials;

  const normalized = normalizeSocialLinks(explicitSocials);

  if (normalized.length > 0) {
    return normalized;
  }

  const knownPlatforms = [
    ["Instagram", contact.instagram || profile.instagram],
    ["Behance", contact.behance || profile.behance],
    ["Dribbble", contact.dribbble || profile.dribbble],
    ["LinkedIn", contact.linkedin || profile.linkedin],
    ["Are.na", contact.arena || profile.arena],
    ["SoundCloud", contact.soundcloud || profile.soundcloud],
  ];

  return knownPlatforms
    .filter(([, href]) => typeof href === "string" && href)
    .map(([label, href]) => ({ label, href }));
}

export default function SiteFooter() {
  const profile =
    portfolioData.designerProfile || portfolioData.profile || {};
  const contact =
    portfolioData.contactDetails || portfolioData.contact || {};

  const email =
    contact.email ||
    profile.email ||
    profile.contact?.email ||
    "";
  const socialLinks = collectSocialLinks(contact, profile);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a className="footer-wordmark" href="/" aria-label="musicdesigner home">
            musicdesigner
          </a>
          <p>
            Independent graphic design and art direction for music, artists,
            and culture.
          </p>
        </div>

        <nav className="footer-navigation" aria-label="Footer navigation">
          <p className="footer-heading">Navigate</p>
          <ul>
            {navigationLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-contact">
          <p className="footer-heading">Connect</p>
          <ul>
            {email ? (
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            ) : null}
            {socialLinks.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.label} (opens in a new tab)`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {currentYear} musicdesigner. All rights reserved.</p>
        <a href={SITE_URL} aria-label="Visit the canonical musicdesigner website">
          musicdesigner.geo-drops.com
        </a>
        <a href="#top" aria-label="Back to the top of the page">
          Back to top
        </a>
      </div>
    </footer>
  );
}