import { designerProfile, services } from "../data/portfolio";

function toParagraphs(content) {
  if (Array.isArray(content)) {
    return content.filter(Boolean);
  }

  return content ? [content] : [];
}

function normalizeService(service, index) {
  if (typeof service === "string") {
    return {
      key: service,
      title: service,
      description: "",
      deliverables: [],
      number: String(index + 1).padStart(2, "0"),
    };
  }

  return {
    key: service.id || service.title || index,
    title: service.title || service.name,
    description: service.description || service.summary || "",
    deliverables: Array.isArray(service.deliverables)
      ? service.deliverables
      : Array.isArray(service.items)
        ? service.items
        : [],
    number: service.number || String(index + 1).padStart(2, "0"),
  };
}

export default function AboutServices() {
  const biography = toParagraphs(
    designerProfile.biography || designerProfile.bio
  );
  const approach = toParagraphs(designerProfile.approach);
  const statistics = Array.isArray(designerProfile.stats)
    ? designerProfile.stats
    : Array.isArray(designerProfile.statistics)
      ? designerProfile.statistics
      : [];
  const serviceList = Array.isArray(services)
    ? services.map(normalizeService)
    : [];

  return (
    <section
      className="about-services section"
      id="about"
      aria-labelledby="about-title"
    >
      <div className="section-shell">
        <header className="section-heading">
          <p className="section-kicker">About the studio</p>
          <h2 id="about-title">
            Visual identities built to sound as distinctive as the music.
          </h2>
        </header>

        <div className="about-grid">
          <div className="about-introduction">
            <p className="about-label">Biography</p>
            <div className="about-copy">
              {biography.map((paragraph, index) => (
                <p key={`${paragraph}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </div>

          <aside className="approach-panel" aria-labelledby="approach-title">
            <p className="about-label">Creative approach</p>
            <h3 id="approach-title">
              Strategy, culture, and image working in rhythm.
            </h3>
            <div className="approach-copy">
              {approach.map((paragraph, index) => (
                <p key={`${paragraph}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </aside>
        </div>

        {statistics.length > 0 && (
          <dl className="experience-stats" aria-label="Selected experience">
            {statistics.map((statistic, index) => {
              const value =
                typeof statistic === "string"
                  ? statistic
                  : statistic.value || statistic.metric;
              const label =
                typeof statistic === "string"
                  ? "Selected experience"
                  : statistic.label || statistic.title;

              return (
                <div
                  className="experience-stat"
                  key={`${label || "stat"}-${index}`}
                >
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              );
            })}
          </dl>
        )}

        <div
          className="services-section"
          id="services"
          aria-labelledby="services-title"
        >
          <header className="services-heading">
            <div>
              <p className="section-kicker">Services</p>
              <h2 id="services-title">Design support across every release.</h2>
            </div>
            <p>
              Flexible creative direction and design systems for artists,
              labels, festivals, and music-led brands.
            </p>
          </header>

          <ol className="services-list">
            {serviceList.map((service) => (
              <li className="service-item" key={service.key}>
                <span className="service-number" aria-hidden="true">
                  {service.number}
                </span>

                <div className="service-content">
                  <h3>{service.title}</h3>
                  {service.description && <p>{service.description}</p>}

                  {service.deliverables.length > 0 && (
                    <ul
                      className="service-deliverables"
                      aria-label={`${service.title} deliverables`}
                    >
                      {service.deliverables.map((deliverable) => (
                        <li key={deliverable}>{deliverable}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}