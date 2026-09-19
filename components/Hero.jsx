import * as portfolioData from "../data/portfolio";

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

export default function Hero() {
  const profile =
    portfolioData.designerProfile ??
    portfolioData.profile ??
    portfolioData.designer ??
    {};

  const identity =
    profile.identity && typeof profile.identity === "object"
      ? profile.identity
      : profile;

  const name =
    firstString(identity.name, profile.designerName, profile.brand) ??
    "musicdesigner";

  const positioning =
    firstString(
      profile.heroTitle,
      profile.headline,
      profile.positioning,
      profile.role,
      profile.title
    ) ?? "Art direction and graphic design for music that deserves to be seen.";

  const introduction =
    firstString(
      profile.heroText,
      profile.introduction,
      profile.tagline,
      profile.shortBio
    ) ??
    "Building distinct visual worlds for artists, labels, releases, and live experiences.";

  const availability =
    firstString(
      typeof profile.availability === "object"
        ? profile.availability.label
        : profile.availability,
      profile.availabilityStatus
    ) ?? "Available for selected collaborations";

  const location = firstString(profile.location, identity.location);

  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="hero__inner hero-grid container">
        <div className="hero__copy hero-copy">
          <div className="hero__meta">
            <p className="eyebrow hero__eyebrow">
              Independent music design studio
            </p>

            <p className="availability hero__availability">
              <span className="availability__dot" aria-hidden="true" />
              <span>{availability}</span>
              {location ? (
                <>
                  <span className="hero__meta-divider" aria-hidden="true">
                    /
                  </span>
                  <span>{location}</span>
                </>
              ) : null}
            </p>
          </div>

          <h1 className="hero__title" id="hero-title">
            <span className="hero__identity">{name}</span>
            <span className="hero__headline">{positioning}</span>
          </h1>

          <p className="hero__intro">{introduction}</p>

          <div className="hero__actions">
            <a
              className="button button--primary btn btn-primary"
              href="#portfolio"
            >
              Explore selected work
              <span aria-hidden="true">↘</span>
            </a>
            <a
              className="button button--secondary btn btn-secondary"
              href="#contact"
            >
              Start a project
            </a>
          </div>
        </div>

        <div
          className="hero__art hero-art"
          aria-hidden="true"
          role="presentation"
        >
          <div className="hero-art__orbit hero-art__orbit--outer" />
          <div className="hero-art__orbit hero-art__orbit--inner" />

          <div className="record-sleeve">
            <div className="record-sleeve__type">
              <span>VISUAL</span>
              <span>FREQUENCY</span>
            </div>
            <div className="record-sleeve__index">
              ART DIRECTION · IDENTITY · RELEASES
            </div>
          </div>

          <div className="vinyl-record">
            <div className="vinyl-record__grooves">
              {Array.from({ length: 7 }, (_, index) => (
                <span
                  className={`vinyl-record__groove vinyl-record__groove--${
                    index + 1
                  }`}
                  key={index}
                />
              ))}
            </div>
            <div className="vinyl-record__label">
              <span>MD</span>
              <small>33⅓</small>
            </div>
            <div className="vinyl-record__spindle" />
          </div>

          <div className="hero-art__catalog">CAT. NO. MD—001</div>
          <div className="hero-art__signal">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </div>
      </div>

      <a className="hero__scroll-cue" href="#portfolio">
        <span>Selected work</span>
        <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}