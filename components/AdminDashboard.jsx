'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import ProjectEditor from './ProjectEditor';
import { projectApi } from '../lib/api';

function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}

function getErrorStatus(error) {
  return Number(error?.status || error?.statusCode || error?.response?.status || 0);
}

function extractProjects(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.projects)) {
    return response.projects;
  }

  if (Array.isArray(response?.data?.projects)) {
    return response.data.projects;
  }

  return [];
}

function callProjectApi(methodNames, ...args) {
  for (const methodName of methodNames) {
    if (typeof projectApi[methodName] === 'function') {
      return projectApi[methodName](...args);
    }
  }

  return Promise.reject(new Error('The requested project API operation is unavailable.'));
}

function isEnabled(value) {
  return value === true || value === 1 || value === '1';
}

function projectId(project) {
  return project?.id ?? project?.projectId ?? project?.project_id;
}

function projectSortOrder(project) {
  return project?.sortOrder ?? project?.sort_order ?? 0;
}

export default function AdminDashboard() {
  const {
    user,
    loading: authLoading,
    error: authError,
    refresh: refreshAuth,
  } = useAuth();

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [editorMode, setEditorMode] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isAdministrator = user?.role === 'administrator';

  const loadProjects = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setProjectsLoading(true);
    }

    setLoadError(null);

    try {
      const response = await callProjectApi(
        ['listAll', 'listAdmin', 'adminList', 'getAll'],
      );
      setProjects(extractProjects(response));
      return true;
    } catch (error) {
      setLoadError(error);
      return false;
    } finally {
      if (!background) {
        setProjectsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAdministrator) {
      loadProjects();
      return;
    }

    setProjects([]);
    setProjectsLoading(false);
    setLoadError(null);
    setEditorMode(null);
    setEditingProject(null);
  }, [isAdministrator, loadProjects]);

  const summary = useMemo(() => {
    return projects.reduce(
      (counts, project) => {
        counts.total += 1;

        if (isEnabled(project.published)) {
          counts.published += 1;
        } else {
          counts.drafts += 1;
        }

        if (isEnabled(project.featured)) {
          counts.featured += 1;
        }

        return counts;
      },
      { total: 0, published: 0, drafts: 0, featured: 0 },
    );
  }, [projects]);

  const openCreateEditor = () => {
    setActionError('');
    setEditingProject(null);
    setEditorMode('create');
  };

  const openEditEditor = (project) => {
    setActionError('');
    setEditingProject(project);
    setEditorMode('edit');
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setEditorMode(null);
    setEditingProject(null);
    setActionError('');
  };

  const handleSave = async (payload) => {
    setSaving(true);
    setActionError('');

    try {
      if (editorMode === 'edit') {
        const id = projectId(editingProject);

        if (!id) {
          throw new Error('This project cannot be updated because its ID is missing.');
        }

        await callProjectApi(['update', 'updateProject'], id, payload);
      } else {
        await callProjectApi(['create', 'createProject'], payload);
      }

      await loadProjects({ background: true });
      setEditorMode(null);
      setEditingProject(null);
    } catch (error) {
      setActionError(
        getErrorMessage(
          error,
          editorMode === 'edit'
            ? 'The project could not be updated.'
            : 'The project could not be created.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    const id = projectId(project);

    if (!id || deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Delete “${project.title || 'Untitled project'}”? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setActionError('');

    try {
      await callProjectApi(['remove', 'delete', 'deleteProject'], id);

      if (projectId(editingProject) === id) {
        setEditorMode(null);
        setEditingProject(null);
      }

      await loadProjects({ background: true });
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'The project could not be deleted.'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <section className="admin-dashboard auth-state" aria-busy="true">
        <div className="loading-state" role="status" aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
          <div>
            <p className="eyebrow">Administrator workspace</p>
            <h1>Checking your session</h1>
            <p>Please wait while secure access is verified.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!user && authError) {
    return (
      <section className="admin-dashboard auth-state auth-state--error">
        <p className="eyebrow">Administrator workspace</p>
        <h1>The administration API is unavailable</h1>
        <p>
          Your session could not be verified. Check the API connection and try
          again.
        </p>
        <p className="form-error" role="alert">
          {getErrorMessage(authError, 'Unable to verify your session.')}
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button button--primary"
            onClick={() => refreshAuth()}
          >
            Retry connection
          </button>
          <Link className="button button--secondary" href="/">
            Return to portfolio
          </Link>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="admin-dashboard auth-state">
        <p className="eyebrow">Administrator workspace</p>
        <h1>Sign in required</h1>
        <p>
          You need an authenticated administrator session to manage portfolio
          projects.
        </p>
        <div className="button-row">
          <Link className="button button--primary" href="/login">
            Sign in
          </Link>
          <Link className="button button--secondary" href="/">
            Return to portfolio
          </Link>
        </div>
      </section>
    );
  }

  if (!isAdministrator) {
    return (
      <section className="admin-dashboard auth-state auth-state--error">
        <p className="eyebrow">Administrator workspace</p>
        <h1>Administrator access required</h1>
        <p>
          The account signed in as <strong>{user.email}</strong> does not have
          permission to manage portfolio projects.
        </p>
        <div className="button-row">
          <Link className="button button--primary" href="/">
            View portfolio
          </Link>
          <Link className="button button--secondary" href="/login">
            Use another account
          </Link>
        </div>
      </section>
    );
  }

  const loadErrorStatus = getErrorStatus(loadError);
  const loadAccessDenied =
    loadErrorStatus === 401 || loadErrorStatus === 403;

  return (
    <section className="admin-dashboard" aria-labelledby="admin-title">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Portfolio administration</p>
          <h1 id="admin-title">Project workspace</h1>
          <p>
            Signed in as{' '}
            <strong>{user.displayName || user.display_name || user.email}</strong>
          </p>
        </div>

        <div className="dashboard-header__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => loadProjects()}
            disabled={projectsLoading || saving || deletingId !== null}
          >
            {projectsLoading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={openCreateEditor}
            disabled={saving || deletingId !== null}
          >
            Add project
          </button>
        </div>
      </header>

      <div className="dashboard-stats" aria-label="Portfolio project summary">
        <article className="dashboard-stat">
          <span>Total projects</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="dashboard-stat">
          <span>Published</span>
          <strong>{summary.published}</strong>
        </article>
        <article className="dashboard-stat">
          <span>Drafts</span>
          <strong>{summary.drafts}</strong>
        </article>
        <article className="dashboard-stat">
          <span>Featured</span>
          <strong>{summary.featured}</strong>
        </article>
      </div>

      {actionError ? (
        <div className="dashboard-alert dashboard-alert--error" role="alert">
          <p>{actionError}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => setActionError('')}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {loadError ? (
        <div className="dashboard-alert dashboard-alert--error" role="alert">
          <div>
            <strong>
              {loadAccessDenied
                ? 'Your project access could not be authorized.'
                : 'Projects could not be loaded.'}
            </strong>
            <p>
              {getErrorMessage(
                loadError,
                loadAccessDenied
                  ? 'Your session may have expired.'
                  : 'The portfolio API may be temporarily unavailable.',
              )}
            </p>
          </div>
          <div className="button-row">
            {loadAccessDenied ? (
              <Link className="button button--secondary" href="/login">
                Sign in again
              </Link>
            ) : null}
            <button
              type="button"
              className="button button--secondary"
              onClick={() => loadProjects()}
              disabled={projectsLoading}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {editorMode ? (
        <section
          className="dashboard-editor"
          aria-labelledby="project-editor-title"
        >
          <div className="dashboard-editor__header">
            <div>
              <p className="eyebrow">
                {editorMode === 'edit' ? 'Edit project' : 'New project'}
              </p>
              <h2 id="project-editor-title">
                {editorMode === 'edit'
                  ? editingProject?.title || 'Untitled project'
                  : 'Create a portfolio project'}
              </h2>
            </div>
            <button
              type="button"
              className="button button--secondary"
              onClick={closeEditor}
              disabled={saving}
            >
              Close editor
            </button>
          </div>

          <ProjectEditor
            key={
              editorMode === 'edit'
                ? `edit-${projectId(editingProject)}`
                : 'create-project'
            }
            mode={editorMode}
            project={editingProject}
            initialProject={editingProject}
            onSubmit={handleSave}
            onCancel={closeEditor}
            submitting={saving}
            isSubmitting={saving}
            error={actionError}
          />
        </section>
      ) : null}

      <section className="dashboard-projects" aria-labelledby="project-list-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Project library</p>
            <h2 id="project-list-title">All projects</h2>
          </div>
          <p aria-live="polite">
            {projectsLoading
              ? 'Loading projects…'
              : `${projects.length} project${projects.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {projectsLoading && projects.length === 0 ? (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="loading-indicator" aria-hidden="true" />
            <p>Loading the project library…</p>
          </div>
        ) : null}

        {!projectsLoading && !loadError && projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>
              Create the first project, save it as a draft, and publish it when
              the case study is ready.
            </p>
            <button
              type="button"
              className="button button--primary"
              onClick={openCreateEditor}
            >
              Create first project
            </button>
          </div>
        ) : null}

        {projects.length > 0 ? (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <caption className="sr-only">
                Portfolio projects with publication status and management
                actions
              </caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Category</th>
                  <th scope="col">Year</th>
                  <th scope="col">Status</th>
                  <th scope="col">Order</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const id = projectId(project);
                  const published = isEnabled(project.published);
                  const featured = isEnabled(project.featured);
                  const isDeleting = deletingId === id;

                  return (
                    <tr key={id || project.slug || project.title}>
                      <th scope="row">
                        <div className="project-table-title">
                          <strong>{project.title || 'Untitled project'}</strong>
                          <span>/{project.slug || 'no-slug'}</span>
                          {featured ? (
                            <span className="status-badge status-badge--featured">
                              Featured
                            </span>
                          ) : null}
                        </div>
                      </th>
                      <td>{project.category || 'Uncategorized'}</td>
                      <td>{project.year || '—'}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            published
                              ? 'status-badge--published'
                              : 'status-badge--draft'
                          }`}
                        >
                          {published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>{projectSortOrder(project)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => openEditEditor(project)}
                            disabled={saving || deletingId !== null}
                            aria-label={`Edit ${project.title || 'untitled project'}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-button text-button--danger"
                            onClick={() => handleDelete(project)}
                            disabled={saving || deletingId !== null}
                            aria-label={`Delete ${project.title || 'untitled project'}`}
                          >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}