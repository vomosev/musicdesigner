import * as portfolioData from "../data/portfolio";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function asText(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

function normalizeEmail(value) {
  if (typeof value === "string") {
    const email = value.trim();
    return {
      address: email.replace(/^mailto:/i, "").split("?")[0],
      href: email.startsWith("mailto:") ? email : `mailto:${email}`,
    };
  }

  const email = asObject(value);
  const address = asText(email.address || email.email || email.value);
  const href = asText(email.href) || (address ? `mailto:${address}` : "");

  return {
    address: address || href.replace(/^mailto:/i, "").split("?")[0],
    href,
  };
}

function normalizeSocialLinks(value) {
  const entries = Array.isArray(value)
    ? value
    : Object.entries(asObject(value)).map(([label, link]) =>
        typeof link === "string" ? { label, href: link } : { label, ...link },
      );

  return entries
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          label: `Social profile ${index + 1}`,
          href: item,
          handle: "",
        };
      }

      const social = asObject(item);
      return {
        label: asText(
          social.label || social.name || social.platform || social.title,
        ),
        href: asText(social.href || social.url || social.link),
        handle: asText(social.handle || social.username),
      };
    })
    .filter((social) => social.label && social.href);
}

export default function ContactSection() {
  const profile = asObject(
    portfolioData.designerProfile || portfolioData.profile,
  );
  const profileContact = asObject(profile.contact);
  const contact = {
    ...profileContact,
    ...asObject(
      portfolioData.contactDetails ||
        portfolioData.contactInfo ||
        portfolioData.contact,
    ),
  };

  const email = normalizeEmail(
    contact.email || profile.email || portfolioData.email,
  );
  const socialLinks = normalizeSocialLinks(
    contact.socials ||
      contact.socialLinks ||
      contact.links ||
      portfolioData.socialLinks ||
      portfolioData.socials ||
      profile.socials,
  );

  const availabilityValue =
    contact.availability || profile.availability || profile.status;
  const availability =
    typeof availabilityValue === "boolean"
      ? availabilityValue
        ? "Available for selected projects"
        : "Currently booking future projects"
      : asText(
          availabilityValue?.label ||
            availabilityValue?.text ||
            availabilityValue,
        );

  const location = asText(contact.location || profile.location);
  const contactNote = asText(
    contact.note || contact.description || contact.inquiryNote,
  );

  return (
    <section
      id="contact"
      className="section contact-section"
      aria-labelledby="contact-heading"
    >
      <div className="container section-shell contact-inner">
        <div className="contact-copy">
          <p className="eyebrow section-kicker">Start a project</p>
          <h2 id="contact-heading">
            Have a release, tour, or artist world in motion?
          </h2>
          <p className="contact-intro">
            Let’s turn the sound into a visual language people remember. Share
            the music, timeline, and ambition behind your next project.
          </p>

          {(availability || location) && (
            <div className="contact-meta" aria-label="Availability details">
              {availability && (
                <p className="availability">
                  <span className="availability-dot" aria-hidden="true" />
                  <span>{availability}</span>
                </p>
              )}
              {location && <p className="contact-location">{location}</p>}
            </div>
          )}

          {contactNote && <p className="contact-note">{contactNote}</p>}
        </div>

        <div className="contact-actions">
          {email.href && email.address && (
            <a
              className="contact-email button button-primary"
              href={email.href}
              aria-label={`Email ${email.address}`}
            >
              <span>Start a conversation</span>
              <span className="contact-email-address">{email.address}</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}

          {socialLinks.length > 0 && (
            <nav className="contact-socials" aria-label="Social profiles">
              <p className="contact-socials-label">Follow the work</p>
              <ul className="social-links">
                {socialLinks.map(({ label, href, handle }, index) => {
                  const isExternal = /^https?:\/\//i.test(href);

                  return (
                    <li key={`${label}-${href}-${index}`}>
                      <a
                        href={href}
                        {...(isExternal
                          ? {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                        aria-label={
                          handle
                            ? `Visit ${label}, ${handle}`
                            : `Visit ${label}`
                        }
                      >
                        <span>{label}</span>
                        {handle && <span>{handle}</span>}
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}