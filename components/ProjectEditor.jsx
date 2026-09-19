'use client';

import { useEffect, useId, useMemo, useState } from 'react';

const CURRENT_YEAR = new Date().getFullYear();
const MAX_PROJECT_YEAR = CURRENT_YEAR + 10;

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function normalizeList(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(/[\n,]+/);

  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeGallery(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(/\r?\n|,\s*(?=https?:\/\/)/i);

  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
}

function isValidWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function createFormState(project) {
  const source = project || {};

  return {
    title: source.title || '',
    slug: source.slug || '',
    category: source.category || '',
    summary: source.summary || '',
    description: source.description || '',
    client: source.client || '',
    year: String(source.year ?? source.projectYear ?? source.project_year ?? CURRENT_YEAR),
    services: normalizeList(source.services).join(', '),
    coverUrl:
      source.coverUrl ??
      source.cover_url ??
      source.coverImage ??
      source.cover_image ??
      '',
    gallery: normalizeGallery(
      source.gallery ?? source.galleryUrls ?? source.gallery_urls
    ).join('\n'),
    featured: Boolean(source.featured ?? source.is_featured),
    published:
      source.published === undefined && source.is_published === undefined
        ? true
        : Boolean(source.published ?? source.is_published),
    sortOrder: String(source.sortOrder ?? source.sort_order ?? 0),
  };
}

function validateForm(form) {
  const errors = {};
  const year = Number(form.year);
  const sortOrder = Number(form.sortOrder);
  const gallery = normalizeGallery(form.gallery);

  if (!form.title.trim()) {
    errors.title = 'Enter a project title.';
  }

  if (!form.slug.trim()) {
    errors.slug = 'Enter a project slug.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = 'Use lowercase letters, numbers, and single hyphens only.';
  }

  if (!form.category.trim()) {
    errors.category = 'Enter a project category.';
  }

  if (!form.summary.trim()) {
    errors.summary = 'Enter a short project summary.';
  }

  if (!form.description.trim()) {
    errors.description = 'Enter the case-study description.';
  }

  if (!form.year.trim()) {
    errors.year = 'Enter the project year.';
  } else if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > MAX_PROJECT_YEAR
  ) {
    errors.year = `Enter a year between 1900 and ${MAX_PROJECT_YEAR}.`;
  }

  if (!form.coverUrl.trim()) {
    errors.coverUrl = 'Enter a cover image URL.';
  } else if (!isValidWebUrl(form.coverUrl.trim())) {
    errors.coverUrl = 'Enter a complete HTTP or HTTPS URL.';
  }

  const invalidGalleryUrl = gallery.find((url) => !isValidWebUrl(url));
  if (invalidGalleryUrl) {
    errors.gallery = `Invalid gallery URL: ${invalidGalleryUrl}`;
  }

  if (
    form.sortOrder === '' ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  ) {
    errors.sortOrder = 'Enter a whole number of zero or greater.';
  }

  return errors;
}

export default function ProjectEditor({
  project = null,
  initialProject = null,
  onSubmit,
  onSave,
  onCancel,
  isSubmitting = false,
  saving = false,
  error: externalError = '',
}) {
  const sourceProject = project || initialProject;
  const idPrefix = useId();
  const [form, setForm] = useState(() => createFormState(sourceProject));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submittingLocally, setSubmittingLocally] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(sourceProject?.slug));

  const busy = Boolean(isSubmitting || saving || submittingLocally);
  const isEditing = Boolean(sourceProject?.id);

  useEffect(() => {
    setForm(createFormState(sourceProject));
    setErrors({});
    setSubmitError('');
    setSlugTouched(Boolean(sourceProject?.slug));
  }, [sourceProject]);

  const fieldId = (name) => `${idPrefix}-${name}`;

  const errorSummary = useMemo(
    () => Object.values(errors).filter(Boolean),
    [errors]
  );

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setSubmitError('');
  }

  function handleTitleChange(event) {
    const title = event.target.value;

    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));

    setErrors((current) => {
      if (!current.title && !current.slug) return current;
      const next = { ...current };
      delete next.title;
      delete next.slug;
      return next;
    });
    setSubmitError('');
  }

  function handleSlugChange(event) {
    setSlugTouched(true);
    updateField(
      'slug',
      event.target.value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-{2,}/g, '-')
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setSubmitError('');

    if (Object.keys(validationErrors).length > 0) {
      const firstInvalidField = Object.keys(validationErrors)[0];
      document.getElementById(fieldId(firstInvalidField))?.focus();
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      client: form.client.trim(),
      year: Number(form.year),
      services: normalizeList(form.services),
      coverUrl: form.coverUrl.trim(),
      gallery: normalizeGallery(form.gallery),
      featured: Boolean(form.featured),
      published: Boolean(form.published),
      sortOrder: Number(form.sortOrder),
    };

    const submitCallback = onSubmit || onSave;

    if (typeof submitCallback !== 'function') {
      setSubmitError('The project cannot be saved because no submit handler is available.');
      return;
    }

    setSubmittingLocally(true);

    try {
      await submitCallback(payload);
    } catch (error) {
      setSubmitError(
        error?.message || 'The project could not be saved. Please try again.'
      );
    } finally {
      setSubmittingLocally(false);
    }
  }

  return (
    <section className="project-editor" aria-labelledby={fieldId('heading')}>
      <div className="project-editor__header">
        <div>
          <p className="eyebrow">Portfolio management</p>
          <h2 id={fieldId('heading')}>
            {isEditing ? `Edit ${sourceProject.title || 'project'}` : 'Create project'}
          </h2>
        </div>
        {typeof onCancel === 'function' && (
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>

      <form className="project-editor__form" onSubmit={handleSubmit} noValidate>
        {(submitError || externalError) && (
          <div className="form-error" role="alert">
            {submitError || externalError}
          </div>
        )}

        {errorSummary.length > 0 && (
          <div className="form-error" role="alert">
            Please correct the highlighted fields before saving.
          </div>
        )}

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor={fieldId('title')}>Title</label>
            <input
              id={fieldId('title')}
              name="title"
              type="text"
              value={form.title}
              onChange={handleTitleChange}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? fieldId('title-error') : undefined}
              autoComplete="off"
              maxLength={180}
              required
              disabled={busy}
            />
            {errors.title && (
              <span id={fieldId('title-error')} className="field-error">
                {errors.title}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId('slug')}>Slug</label>
            <input
              id={fieldId('slug')}
              name="slug"
              type="text"
              value={form.slug}
              onChange={handleSlugChange}
              onBlur={() => updateField('slug', slugify(form.slug))}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={
                errors.slug ? fieldId('slug-error') : fieldId('slug-help')
              }
              autoCapitalize="none"
              autoComplete="off"
              spellCheck="false"
              maxLength={160}
              required
              disabled={busy}
            />
            <span id={fieldId('slug-help')} className="field-help">
              Used in the public project URL.
            </span>
            {errors.slug && (
              <span id={fieldId('slug-error')} className="field-error">
                {errors.slug}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId('category')}>Category</label>
            <input
              id={fieldId('category')}
              name="category"
              type="text"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={
                errors.category ? fieldId('category-error') : undefined
              }
              placeholder="Album artwork"
              autoComplete="off"
              maxLength={100}
              required
              disabled={busy}
            />
            {errors.category && (
              <span id={fieldId('category-error')} className="field-error">
                {errors.category}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId('client')}>Client</label>
            <input
              id={fieldId('client')}
              name="client"
              type="text"
              value={form.client}
              onChange={(event) => updateField('client', event.target.value)}
              autoComplete="organization"
              maxLength={180}
              disabled={busy}
            />
          </div>

          <div className="form-field">
            <label htmlFor={fieldId('year')}>Year</label>
            <input
              id={fieldId('year')}
              name="year"
              type="number"
              min="1900"
              max={MAX_PROJECT_YEAR}
              step="1"
              value={form.year}
              onChange={(event) => updateField('year', event.target.value)}
              aria-invalid={Boolean(errors.year)}
              aria-describedby={errors.year ? fieldId('year-error') : undefined}
              inputMode="numeric"
              required
              disabled={busy}
            />
            {errors.year && (
              <span id={fieldId('year-error')} className="field-error">
                {errors.year}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor={fieldId('sortOrder')}>Sort order</label>
            <input
              id={fieldId('sortOrder')}
              name="sortOrder"
              type="number"
              min="0"
              step="1"
              value={form.sortOrder}
              onChange={(event) => updateField('sortOrder', event.target.value)}
              aria-invalid={Boolean(errors.sortOrder)}
              aria-describedby={
                errors.sortOrder
                  ? fieldId('sortOrder-error')
                  : fieldId('sortOrder-help')
              }
              inputMode="numeric"
              required
              disabled={busy}
            />
            <span id={fieldId('sortOrder-help')} className="field-help">
              Lower numbers appear first.
            </span>
            {errors.sortOrder && (
              <span id={fieldId('sortOrder-error')} className="field-error">
                {errors.sortOrder}
              </span>
            )}
          </div>

          <div className="form-field form-field--full">
            <label htmlFor={fieldId('summary')}>Summary</label>
            <textarea
              id={fieldId('summary')}
              name="summary"
              rows="3"
              value={form.summary}
              onChange={(event) => updateField('summary', event.target.value)}
              aria-invalid={Boolean(errors.summary)}
              aria-describedby={
                errors.summary
                  ? fieldId('summary-error')
                  : fieldId('summary-help')
              }
              maxLength={500}
              required
              disabled={busy}
            />
            <span id={fieldId('summary-help')} className="field-help">
              A concise introduction shown on project cards.
            </span>
            {errors.summary && (
              <span id={fieldId('summary-error')} className="field-error">
                {errors.summary}
              </span>
            )}
          </div>

          <div className="form-field form-field--full">
            <label htmlFor={fieldId('description')}>Description</label>
            <textarea
              id={fieldId('description')}
              name="description"
              rows="8"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? fieldId('description-error') : undefined
              }
              maxLength={10000}
              required
              disabled={busy}
            />
            {errors.description && (
              <span id={fieldId('description-error')} className="field-error">
                {errors.description}
              </span>
            )}
          </div>

          <div className="form-field form-field--full">
            <label htmlFor={fieldId('services')}>Services</label>
            <textarea
              id={fieldId('services')}
              name="services"
              rows="3"
              value={form.services}
              onChange={(event) => updateField('services', event.target.value)}
              aria-describedby={fieldId('services-help')}
              placeholder="Art direction, Packaging, Typography"
              disabled={busy}
            />
            <span id={fieldId('services-help')} className="field-help">
              Separate services with commas or place one service on each line.
            </span>
          </div>

          <div className="form-field form-field--full">
            <label htmlFor={fieldId('coverUrl')}>Cover image URL</label>
            <input
              id={fieldId('coverUrl')}
              name="coverUrl"
              type="url"
              value={form.coverUrl}
              onChange={(event) => updateField('coverUrl', event.target.value)}
              aria-invalid={Boolean(errors.coverUrl)}
              aria-describedby={
                errors.coverUrl ? fieldId('coverUrl-error') : undefined
              }
              placeholder="https://example.com/project-cover.jpg"
              autoCapitalize="none"
              autoComplete="url"
              spellCheck="false"
              required
              disabled={busy}
            />
            {errors.coverUrl && (
              <span id={fieldId('coverUrl-error')} className="field-error">
                {errors.coverUrl}
              </span>
            )}
          </div>

          <div className="form-field form-field--full">
            <label htmlFor={fieldId('gallery')}>Gallery image URLs</label>
            <textarea
              id={fieldId('gallery')}
              name="gallery"
              rows="6"
              value={form.gallery}
              onChange={(event) => updateField('gallery', event.target.value)}
              aria-invalid={Boolean(errors.gallery)}
              aria-describedby={
                errors.gallery
                  ? fieldId('gallery-error')
                  : fieldId('gallery-help')
              }
              placeholder={'https://example.com/detail-1.jpg\nhttps://example.com/detail-2.jpg'}
              autoCapitalize="none"
              spellCheck="false"
              disabled={busy}
            />
            <span id={fieldId('gallery-help')} className="field-help">
              Enter one complete HTTP or HTTPS image URL per line.
            </span>
            {errors.gallery && (
              <span id={fieldId('gallery-error')} className="field-error">
                {errors.gallery}
              </span>
            )}
          </div>
        </div>

        <fieldset className="project-editor__status" disabled={busy}>
          <legend>Project status</legend>

          <label className="checkbox-field" htmlFor={fieldId('featured')}>
            <input
              id={fieldId('featured')}
              name="featured"
              type="checkbox"
              checked={form.featured}
              onChange={(event) => updateField('featured', event.target.checked)}
            />
            <span>
              <strong>Featured</strong>
              <small>Give this project priority in the public gallery.</small>
            </span>
          </label>

          <label className="checkbox-field" htmlFor={fieldId('published')}>
            <input
              id={fieldId('published')}
              name="published"
              type="checkbox"
              checked={form.published}
              onChange={(event) => updateField('published', event.target.checked)}
            />
            <span>
              <strong>Published</strong>
              <small>Make this project visible on the public portfolio.</small>
            </span>
          </label>
        </fieldset>

        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : 'Create project'}
          </button>

          {typeof onCancel === 'function' && (
            <button
              className="button button--secondary"
              type="button"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}