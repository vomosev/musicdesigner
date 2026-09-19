'use client';

export default function ProjectCard({ project, onOpen }) {
  if (!project) {
    return null;
  }

  const {
    title = 'Untitled project',
    category = 'Music design',
    year,
    summary = '',
    featured = false,
  } = project;

  const coverUrl =
    project.coverUrl || project.cover_url || project.coverImage || '';

  const handleOpen = () => {
    if (typeof onOpen === 'function') {
      onOpen(project);
    }
  };

  return (
    <article
      className={`project-card${featured ? ' project-card--featured' : ''}`}
    >
      <button
        type="button"
        className="project-card__button"
        onClick={handleOpen}
        aria-label={`View details for ${title}`}
      >
        <div className="project-card__artwork">
          {coverUrl ? (
            <img
              className="project-card__image"
              src={coverUrl}
              alt={`${title} cover artwork`}
              loading={featured ? 'eager' : 'lazy'}
              decoding="async"
            />
          ) : (
            <div
              className="project-card__image project-card__image--placeholder"
              aria-hidden="true"
            >
              <span>{title.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {featured && (
            <span className="project-card__featured">Featured</span>
          )}

          <span className="project-card__view" aria-hidden="true">
            View project
          </span>
        </div>

        <div className="project-card__content">
          <div className="project-card__meta">
            <span>{category}</span>
            {year ? (
              <>
                <span aria-hidden="true">•</span>
                <span>{year}</span>
              </>
            ) : null}
          </div>

          <h3 className="project-card__title">{title}</h3>

          {summary ? (
            <p className="project-card__summary">{summary}</p>
          ) : null}
        </div>
      </button>
    </article>
  );
}