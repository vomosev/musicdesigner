const PRODUCTION_API_URL = "https://musicdesigner.geo-drops.com";

const configuredApiUrl =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL?.trim()
    : "";

const API_BASE_URL = (configuredApiUrl || PRODUCTION_API_URL).replace(
  /\/+$/,
  ""
);

function buildUrl(path) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError("An API path is required.");
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

function createApiError(response, payload) {
  let message = `API request failed with status ${response.status}.`;

  if (payload && typeof payload === "object") {
    message = payload.error || payload.message || message;
  } else if (typeof payload === "string" && payload.trim()) {
    message = payload.trim();
  } else if (response.statusText) {
    message = response.statusText;
  }

  const error = new Error(message);
  error.name = "ApiError";
  error.status = response.status;
  error.data = payload;

  return error;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const { headers: ignoredHeaders, ...requestOptions } = options;
  let response;

  try {
    response = await fetch(buildUrl(path), {
      cache: "no-store",
      ...requestOptions,
      credentials: "include",
      headers,
    });
  } catch (cause) {
    const error = new Error(
      "Unable to reach the portfolio API. Please try again shortly."
    );
    error.name = "ApiNetworkError";
    error.cause = cause;
    throw error;
  }

  let responseText = "";

  try {
    responseText = await response.text();
  } catch {
    responseText = "";
  }

  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    throw createApiError(response, payload);
  }

  return payload;
}

function jsonRequest(path, method, payload) {
  return apiRequest(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

const getAuthStatus = () => apiRequest("/api/auth/me");

export const authApi = {
  me: getAuthStatus,
  status: getAuthStatus,
  getCurrentUser: getAuthStatus,

  signup(userData) {
    return jsonRequest("/api/auth/signup", "POST", userData);
  },

  login(credentials) {
    return jsonRequest("/api/auth/login", "POST", credentials);
  },

  logout() {
    return apiRequest("/api/auth/logout", {
      method: "POST",
    });
  },
};

const listPublishedProjects = () => apiRequest("/api/projects");
const listAllProjects = () => apiRequest("/api/projects/admin/all");

function getProjectBySlug(slug) {
  if (typeof slug !== "string" || !slug.trim()) {
    throw new TypeError("A project slug is required.");
  }

  return apiRequest(`/api/projects/${encodeURIComponent(slug.trim())}`);
}

function createProject(project) {
  return jsonRequest("/api/projects", "POST", project);
}

function updateProject(id, project) {
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new TypeError("A project ID is required.");
  }

  return jsonRequest(
    `/api/projects/${encodeURIComponent(String(id))}`,
    "PATCH",
    project
  );
}

function deleteProject(id) {
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new TypeError("A project ID is required.");
  }

  return apiRequest(`/api/projects/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

export const projectApi = {
  listPublished: listPublishedProjects,
  getPublished: listPublishedProjects,
  getBySlug: getProjectBySlug,
  listAll: listAllProjects,
  listAdmin: listAllProjects,
  getAll: listAllProjects,
  create: createProject,
  update: updateProject,
  delete: deleteProject,
  remove: deleteProject,
};