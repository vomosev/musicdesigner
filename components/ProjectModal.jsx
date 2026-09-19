'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const trimmed = value.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Treat non-JSON content as a human-readable list.
    }
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeArtwork(project) {
  const cover =
    project.coverUrl ||
    project.cover_url ||
    project.coverImage ||
    project.cover_image_url ||
    null;

  const gallery = toArray(
    project.gallery || project.galleryUrls || project.gallery_urls || project.images
  );

  const items = [];

  if (cover) {
    items.push({
      url: typeof cover === 'string' ? cover : cover.url || cover.src,
      alt:
        typeof cover === 'object' && cover.alt
          ? cover.alt
          : `${project.title} cover artwork`,
      caption:
        typeof cover === 'object' && cover.caption ? cover.caption : 'Cover artwork',
    });
  }

  gallery.forEach((item, index) => {
    if (typeof item === 'string') {
      items.push({
        url: item,
        alt: `${project.title} artwork ${index + 1}`,
        caption: '',
      });
      return;
    }

    if (item && typeof item === 'object') {
      items.push({
        url: item.url || item.src || item.image,
        alt: item.alt || `${project.title} artwork ${index + 1}`,
        caption: item.caption || '',
      });
    }
  });

  const seen = new Set();

  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) {
      return false;
    }

    seen.add(item.url);
    return true;
  });
}

function normalizeCredits(credits) {
  if (!credits) {
    return [];
  }

  if (Array.isArray(credits)) {
    return credits.flatMap((credit) => normalizeCredits(credit));
  }

  if (typeof credits === 'object') {
    if (credits.role || credits.label) {
      return [
        {
          label: credits.role || credits.label,
          value: credits.name || credits.value || credits.credit || '',
        },
      ].filter((credit) => credit.value);
    }

    return Object.entries(credits)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([label, value]) => ({
        label,
        value: Array.isArray(value) ? value.join(', ') : String(value),
      }));
  }

  if (typeof credits === 'string') {
    const trimmed = credits.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return normalizeCredits(JSON.parse(trimmed));
      } catch {
        // Continue with plain-text parsing.
      }
    }

    return trimmed.split(/\r?\n/).filter(Boolean).map((line) => {
      const separatorIndex = line.indexOf(':');

      if (separatorIndex > 0) {
        return {
          label: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim(),
        };
      }

      return { label: 'Credit', value: line.trim() };
    });
  }

  return [];
}

function textParagraphs(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return value ? [String(value)] : [];
  }

  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default function ProjectModal({ project, onClose }) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const summaryId = useId();
  const isOpen = Boolean(project);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isOpen) {
      return undefined;
    }

    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      const currentPadding =
        parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else {
        dialogRef.current?.focus();
      }
    });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(FOCUSABLE_ELEMENTS)
      ).filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-hidden') !== 'true' &&
          element.getClientRects().length > 0
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !dialogRef.current.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;

      if (
        previousActiveElement instanceof HTMLElement &&
        document.contains(previousActiveElement)
      ) {
        previousActiveElement.focus();
      }
    };
  }, [mounted, isOpen]);

  const artwork = useMemo(
    () => (project ? normalizeArtwork(project) : []),
    [project]
  );
  const services = useMemo(
    () => (project ? toArray(project.services) : []),
    [project]
  );
  const credits = useMemo(
    () =>
      project
        ? normalizeCredits(project.credits || project.projectCredits)
        : [],
    [project]
  );
  const description = useMemo(
    () => (project ? textParagraphs(project.description) : []),
    [project]
  );

  if (!mounted || !project) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onCloseRef.current?.();
    }
  };

  const category = project.category || 'Selected work';
  const client = project.client || project.clientName || project.client_name;
  const year = project.year || project.projectYear || project.project_year;
  const summary = project.summary || '';

  return createPortal(
    <div
      className="modal-backdrop project-modal-backdrop"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <article
        ref={dialogRef}
        className="modal project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={summary ? summaryId : undefined}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="project-modal__header modal-header">
          <div className="project-modal__heading">
            <div className="project-modal__eyebrow">
              <span>{category}</span>
              {year ? <span aria-label={`Project year ${year}`}>{year}</span> : null}
            </div>
            <h2 id={titleId}>{project.title}</h2>
            {summary ? (
              <p id={summaryId} className="project-modal__summary">
                {summary}
              </p>
            ) : null}
          </div>

          <button
            ref={closeButtonRef}
            className="modal-close project-modal__close"
            type="button"
            onClick={() => onCloseRef.current?.()}
            aria-label={`Close ${project.title} case study`}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="project-modal__body modal-content">
          <section
            className={`project-modal__gallery modal-gallery ${
              artwork.length === 1 ? 'project-modal__gallery--single' : ''
            }`}
            aria-label={`${project.title} artwork gallery`}
          >
            {artwork.length > 0 ? (
              artwork.map((item, index) => (
                <figure
                  className={`project-modal__artwork ${
                    index === 0 ? 'project-modal__artwork--primary' : ''
                  }`}
                  key={item.url}
                >
                  <img
                    src={item.url}
                    alt={item.alt}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              ))
            ) : (
              <div className="project-modal__artwork-placeholder" aria-hidden="true">
                <span>{project.title}</span>
              </div>
            )}
          </section>

          <div className="project-modal__case-study">
            <div className="project-modal__description">
              <p className="section-kicker">Case study</p>
              {description.length > 0 ? (
                description.map((paragraph, index) => (
                  <p key={`${project.id || project.slug || project.title}-description-${index}`}>
                    {paragraph}
                  </p>
                ))
              ) : summary ? (
                <p>{summary}</p>
              ) : (
                <p>
                  A focused visual system created to give the music a distinct,
                  memorable identity across its key release touchpoints.
                </p>
              )}
            </div>

            <aside
              className="project-modal__details"
              aria-label={`${project.title} project details`}
            >
              {(client || year) && (
                <dl className="project-modal__metadata">
                  {client ? (
                    <div>
                      <dt>Client</dt>
                      <dd>{client}</dd>
                    </div>
                  ) : null}
                  {year ? (
                    <div>
                      <dt>Year</dt>
                      <dd>{year}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Discipline</dt>
                    <dd>{category}</dd>
                  </div>
                </dl>
              )}

              {services.length > 0 ? (
                <section className="project-modal__services" aria-labelledby={`${titleId}-services`}>
                  <h3 id={`${titleId}-services`}>Services</h3>
                  <ul>
                    {services.map((service, index) => {
                      const label =
                        typeof service === 'object'
                          ? service.name || service.label || service.title
                          : service;

                      return label ? (
                        <li key={`${String(label)}-${index}`}>{label}</li>
                      ) : null;
                    })}
                  </ul>
                </section>
              ) : null}

              {credits.length > 0 ? (
                <section className="project-modal__credits" aria-labelledby={`${titleId}-credits`}>
                  <h3 id={`${titleId}-credits`}>Credits</h3>
                  <dl>
                    {credits.map((credit, index) => (
                      <div key={`${credit.label}-${credit.value}-${index}`}>
                        <dt>{credit.label}</dt>
                        <dd>{credit.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </article>
    </div>,
    document.body
  );
}