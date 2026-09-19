'use client';

import { useEffect, useMemo, useState } from 'react';
import { projectApi } from '../lib/api';
import * as portfolioData from '../data/portfolio';
import ProjectCard from './ProjectCard';
import ProjectModal from './ProjectModal';

const fallbackProjects = Array.isArray(portfolioData.portfolioProjects)
  ? portfolioData.portfolioProjects
  : Array.isArray(portfolioData.projects)
    ? portfolioData.projects
    : Array.isArray(portfolioData.default)
      ? portfolioData.default
      : [];

const ALL_CATEGORIES = 'All';

function extractProjects(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.projects)) {
    return response.projects;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return null;
}

export default function PortfolioGallery() {
  const [projects, setProjects] = useState(fallbackProjects);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublishedProjects() {
      try {
        const response = await projectApi.listPublished();
        const publishedProjects = extractProjects(response);

        if (isMounted && publishedProjects !== null) {
          setProjects(publishedProjects);
        }
      } catch {
        // Static portfolio data remains visible when the API is unavailable.
      }
    }

    loadPublishedProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const projectCategories = projects
      .map((project) => project?.category?.trim())
      .filter(Boolean);

    return [ALL_CATEGORIES, ...new Set(projectCategories)];
  }, [projects]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory(ALL_CATEGORIES);
    }
  }, [activeCategory, categories]);

  const visibleProjects = useMemo(() => {
    if (activeCategory === ALL_CATEGORIES) {
      return projects;
    }

    return projects.filter(
      (project) => project.category?.trim() === activeCategory,
    );
  }, [activeCategory, projects]);

  return (
    <section
      className="portfolio-section section"
      id="portfolio"
      aria-labelledby="portfolio-heading"
    >
      <div className="section-container">
        <header className="section-header">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 id="portfolio-heading">Visual systems made for sound.</h2>
          </div>
          <p className="section-intro">
            Album campaigns, identities, live visuals, and release worlds
            created for artists, labels, and music-led culture.
          </p>
        </header>

        {categories.length > 1 && (
          <div
            className="portfolio-filters"
            role="group"
            aria-label="Filter portfolio projects by category"
          >
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  className={`filter-button${isActive ? ' is-active' : ''}`}
                  type="button"
                  key={category}
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(category)}
                >
                  {category === ALL_CATEGORIES ? 'All projects' : category}
                </button>
              );
            })}
          </div>
        )}

        {visibleProjects.length > 0 ? (
          <div className="project-grid">
            {visibleProjects.map((project, index) => (
              <ProjectCard
                key={project.id ?? project.slug ?? `${project.title}-${index}`}
                project={project}
                onOpen={() => setSelectedProject(project)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <h3>No projects in this category yet.</h3>
            <p>Choose another filter to explore more selected work.</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setActiveCategory(ALL_CATEGORIES)}
            >
              View all projects
            </button>
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </section>
  );
}