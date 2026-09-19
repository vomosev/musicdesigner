const { pool } = require('../config/db');

const SELECT_FIELDS = `
  id,
  title,
  slug,
  category,
  summary,
  description,
  client,
  project_year,
  services,
  cover_url,
  gallery,
  featured,
  published,
  sort_order,
  owner_id,
  created_at,
  updated_at
`;

const ALLOWED_FIELDS = new Set([
  'title',
  'slug',
  'category',
  'summary',
  'description',
  'client',
  'year',
  'services',
  'coverUrl',
  'gallery',
  'featured',
  'published',
  'sortOrder'
]);

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function validateRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !ALLOWED_FIELDS.has(field)
  );

  if (unknownFields.length > 0) {
    throw new ValidationError(
      `Unsupported project field${unknownFields.length === 1 ? '' : 's'}: ${unknownFields.join(', ')}.`
    );
  }
}

function normalizeString(value, field, options = {}) {
  const {
    required = false,
    nullable = false,
    maxLength = 255
  } = options;

  if (value === null) {
    if (nullable) {
      return null;
    }

    throw new ValidationError(`${field} cannot be null.`);
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    if (required) {
      throw new ValidationError(`${field} is required.`);
    }

    return nullable ? null : '';
  }

  if (normalized.length > maxLength) {
    throw new ValidationError(
      `${field} must not exceed ${maxLength} characters.`
    );
  }

  return normalized;
}

function normalizeSlug(value) {
  const slug = normalizeString(value, 'slug', {
    required: true,
    maxLength: 180
  }).toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ValidationError(
      'slug may contain only lowercase letters, numbers, and single hyphens.'
    );
  }

  return slug;
}

function normalizeYear(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError('year must be a four-digit year.');
  }

  const year = String(value).trim();

  if (!/^\d{4}$/.test(year)) {
    throw new ValidationError('year must be a four-digit year.');
  }

  const numericYear = Number(year);

  if (numericYear < 1901 || numericYear > 2155) {
    throw new ValidationError('year must be between 1901 and 2155.');
  }

  return year;
}

function normalizeBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${field} must be a boolean.`);
  }

  return value;
}

function normalizeSortOrder(value) {
  if (!Number.isInteger(value)) {
    throw new ValidationError('sortOrder must be an integer.');
  }

  if (value < -1000000 || value > 1000000) {
    throw new ValidationError(
      'sortOrder must be between -1000000 and 1000000.'
    );
  }

  return value;
}

function isValidArtworkUrl(value) {
  if (/^\/(?!\/)/.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeArtworkUrl(value, field, required = false) {
  const url = normalizeString(value, field, {
    required,
    maxLength: 2048
  });

  if (!url && !required) {
    return '';
  }

  if (!isValidArtworkUrl(url)) {
    throw new ValidationError(
      `${field} must be an HTTP(S) URL or a root-relative path.`
    );
  }

  return url;
}

function normalizeStringArray(value, field, options = {}) {
  const {
    maxItems = 50,
    maxItemLength = 255,
    validateUrl = false
  } = options;

  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array.`);
  }

  if (value.length > maxItems) {
    throw new ValidationError(
      `${field} must contain no more than ${maxItems} items.`
    );
  }

  const normalized = [];
  const seen = new Set();

  for (const item of value) {
    if (typeof item !== 'string') {
      throw new ValidationError(`${field} may contain only strings.`);
    }

    const trimmed = item.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.length > maxItemLength) {
      throw new ValidationError(
        `Each ${field} item must not exceed ${maxItemLength} characters.`
      );
    }

    if (validateUrl && !isValidArtworkUrl(trimmed)) {
      throw new ValidationError(
        `Each ${field} item must be an HTTP(S) URL or a root-relative path.`
      );
    }

    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

function normalizeProjectPayload(body, isCreate) {
  validateRequestBody(body);

  const project = {};

  if (hasOwn(body, 'title')) {
    project.title = normalizeString(body.title, 'title', {
      required: true,
      maxLength: 180
    });
  } else if (isCreate) {
    throw new ValidationError('title is required.');
  }

  if (hasOwn(body, 'slug')) {
    project.slug = normalizeSlug(body.slug);
  } else if (isCreate) {
    throw new ValidationError('slug is required.');
  }

  if (hasOwn(body, 'category')) {
    project.category = normalizeString(body.category, 'category', {
      required: true,
      maxLength: 100
    });
  } else if (isCreate) {
    throw new ValidationError('category is required.');
  }

  if (hasOwn(body, 'summary')) {
    project.summary = normalizeString(body.summary, 'summary', {
      required: true,
      maxLength: 1000
    });
  } else if (isCreate) {
    throw new ValidationError('summary is required.');
  }

  if (hasOwn(body, 'description')) {
    project.description = normalizeString(body.description, 'description', {
      required: true,
      maxLength: 50000
    });
  } else if (isCreate) {
    throw new ValidationError('description is required.');
  }

  if (hasOwn(body, 'client')) {
    project.client = normalizeString(body.client, 'client', {
      nullable: true,
      maxLength: 180
    });
  } else if (isCreate) {
    project.client = null;
  }

  if (hasOwn(body, 'year')) {
    project.project_year = normalizeYear(body.year);
  } else if (isCreate) {
    throw new ValidationError('year is required.');
  }

  if (hasOwn(body, 'services')) {
    project.services = normalizeStringArray(body.services, 'services', {
      maxItems: 30,
      maxItemLength: 120
    });
  } else if (isCreate) {
    project.services = [];
  }

  if (hasOwn(body, 'coverUrl')) {
    project.cover_url = normalizeArtworkUrl(
      body.coverUrl,
      'coverUrl',
      true
    );
  } else if (isCreate) {
    throw new ValidationError('coverUrl is required.');
  }

  if (hasOwn(body, 'gallery')) {
    project.gallery = normalizeStringArray(body.gallery, 'gallery', {
      maxItems: 50,
      maxItemLength: 2048,
      validateUrl: true
    });
  } else if (isCreate) {
    project.gallery = [];
  }

  if (hasOwn(body, 'featured')) {
    project.featured = normalizeBoolean(body.featured, 'featured');
  } else if (isCreate) {
    project.featured = false;
  }

  if (hasOwn(body, 'published')) {
    project.published = normalizeBoolean(body.published, 'published');
  } else if (isCreate) {
    project.published = false;
  }

  if (hasOwn(body, 'sortOrder')) {
    project.sort_order = normalizeSortOrder(body.sortOrder);
  } else if (isCreate) {
    project.sort_order = 0;
  }

  if (!isCreate && Object.keys(project).length === 0) {
    throw new ValidationError('At least one project field must be provided.');
  }

  return project;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(
      Buffer.isBuffer(value) ? value.toString('utf8') : String(value)
    );

    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function serializeDate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function serializeProject(row) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    description: row.description,
    client: row.client,
    year: String(row.project_year),
    services: parseJsonArray(row.services),
    coverUrl: row.cover_url,
    gallery: parseJsonArray(row.gallery),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    sortOrder: Number(row.sort_order),
    ownerId:
      row.owner_id === null || row.owner_id === undefined
        ? null
        : Number(row.owner_id),
    createdAt: serializeDate(row.created_at),
    updatedAt: serializeDate(row.updated_at)
  };
}

function normalizeProjectId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ValidationError('Project id must be a positive integer.');
  }

  return id;
}

async function ensureSlugIsUnique(slug, excludedId = null) {
  let query = 'SELECT id FROM projects WHERE slug = ?';
  const params = [slug];

  if (excludedId !== null) {
    query += ' AND id <> ?';
    params.push(excludedId);
  }

  query += ' LIMIT 1';

  const [rows] = await pool.execute(query, params);

  if (rows.length > 0) {
    const error = new Error('A project with this slug already exists.');
    error.statusCode = 409;
    throw error;
  }
}

async function fetchProjectById(id) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_FIELDS} FROM projects WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows.length > 0 ? serializeProject(rows[0]) : null;
}

function isDuplicateEntryError(error) {
  return (
    error &&
    (error.code === 'ER_DUP_ENTRY' || Number(error.errno) === 1062)
  );
}

function handleControllerError(error, res, next) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message });
  }

  if (error && error.statusCode === 409) {
    return res.status(409).json({ error: error.message });
  }

  if (isDuplicateEntryError(error)) {
    return res
      .status(409)
      .json({ error: 'A project with this slug already exists.' });
  }

  return next(error);
}

async function listPublishedProjects(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT ${SELECT_FIELDS}
       FROM projects
       WHERE published = 1
       ORDER BY featured DESC, sort_order ASC, id DESC`
    );

    res.json({ projects: rows.map(serializeProject) });
  } catch (error) {
    next(error);
  }
}

async function getPublishedProjectBySlug(req, res, next) {
  try {
    const slug = normalizeSlug(req.params.slug);

    const [rows] = await pool.execute(
      `SELECT ${SELECT_FIELDS}
       FROM projects
       WHERE slug = ? AND published = 1
       LIMIT 1`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.json({ project: serializeProject(rows[0]) });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
}

async function listAllProjects(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT ${SELECT_FIELDS}
       FROM projects
       ORDER BY featured DESC, sort_order ASC, id DESC`
    );

    res.json({ projects: rows.map(serializeProject) });
  } catch (error) {
    next(error);
  }
}

async function createProject(req, res, next) {
  try {
    const project = normalizeProjectPayload(req.body, true);
    const ownerId = Number(req.session && req.session.user && req.session.user.id);

    if (!Number.isSafeInteger(ownerId) || ownerId <= 0) {
      return res.status(401).json({ error: 'Authentication is required.' });
    }

    await ensureSlugIsUnique(project.slug);

    const [result] = await pool.execute(
      `INSERT INTO projects (
        title,
        slug,
        category,
        summary,
        description,
        client,
        project_year,
        services,
        cover_url,
        gallery,
        featured,
        published,
        sort_order,
        owner_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project.title,
        project.slug,
        project.category,
        project.summary,
        project.description,
        project.client,
        project.project_year,
        JSON.stringify(project.services),
        project.cover_url,
        JSON.stringify(project.gallery),
        project.featured ? 1 : 0,
        project.published ? 1 : 0,
        project.sort_order,
        ownerId
      ]
    );

    const createdProject = await fetchProjectById(result.insertId);

    if (!createdProject) {
      throw new Error('The project was created but could not be retrieved.');
    }

    return res.status(201).json({ project: createdProject });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
}

async function updateProject(req, res, next) {
  try {
    const projectId = normalizeProjectId(req.params.id);
    const project = normalizeProjectPayload(req.body, false);

    const [existingRows] = await pool.execute(
      'SELECT id FROM projects WHERE id = ? LIMIT 1',
      [projectId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (hasOwn(project, 'slug')) {
      await ensureSlugIsUnique(project.slug, projectId);
    }

    const assignments = [];
    const values = [];

    for (const [column, value] of Object.entries(project)) {
      assignments.push(`${column} = ?`);

      if (column === 'services' || column === 'gallery') {
        values.push(JSON.stringify(value));
      } else if (column === 'featured' || column === 'published') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    values.push(projectId);

    await pool.execute(
      `UPDATE projects
       SET ${assignments.join(', ')}
       WHERE id = ?`,
      values
    );

    const updatedProject = await fetchProjectById(projectId);

    if (!updatedProject) {
      throw new Error('The project was updated but could not be retrieved.');
    }

    return res.json({ project: updatedProject });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
}

async function deleteProject(req, res, next) {
  try {
    const projectId = normalizeProjectId(req.params.id);

    const [result] = await pool.execute(
      'DELETE FROM projects WHERE id = ?',
      [projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    return handleControllerError(error, res, next);
  }
}

module.exports = {
  listPublishedProjects,
  getPublishedProjectBySlug,
  listAllProjects,
  createProject,
  updateProject,
  deleteProject
};