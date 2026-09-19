'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(undefined);

function getUserFromResponse(response) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  if (response.user && typeof response.user === 'object') {
    return response.user;
  }

  if ('id' in response && ('email' in response || 'role' in response)) {
    return response;
  }

  return null;
}

function getErrorMessage(error) {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error && typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return 'The authentication service is currently unavailable.';
}

function isUnauthorizedError(error) {
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;

  if (Number(status) === 401) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('unauthorized') ||
    message.includes('not authenticated') ||
    message.includes('authentication required') ||
    message.includes('login required')
  );
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const isCurrentRequest = useCallback(
    (requestId) => mountedRef.current && requestIdRef.current === requestId,
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    async function resolveSession() {
      setLoading(true);
      setError(null);

      try {
        const response = await authApi.me();

        if (!cancelled && isCurrentRequest(requestId)) {
          setUser(getUserFromResponse(response));
        }
      } catch (requestError) {
        if (!cancelled && isCurrentRequest(requestId)) {
          if (isUnauthorizedError(requestError)) {
            setUser(null);
            setError(null);
          } else {
            setError(getErrorMessage(requestError));
          }
        }
      } finally {
        if (!cancelled && isCurrentRequest(requestId)) {
          setLoading(false);
        }
      }
    }

    resolveSession();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [isCurrentRequest]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await authApi.me();
      const nextUser = getUserFromResponse(response);

      if (isCurrentRequest(requestId)) {
        setUser(nextUser);
      }

      return nextUser;
    } catch (requestError) {
      if (isCurrentRequest(requestId)) {
        if (isUnauthorizedError(requestError)) {
          setUser(null);
          setError(null);
        } else {
          setError(getErrorMessage(requestError));
        }
      }

      return null;
    } finally {
      if (isCurrentRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [isCurrentRequest]);

  const login = useCallback(
    async (credentials) => {
      const requestId = ++requestIdRef.current;

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await authApi.login(credentials);
        const nextUser = getUserFromResponse(response);

        if (!nextUser) {
          throw new Error('The server did not return an authenticated user.');
        }

        if (isCurrentRequest(requestId)) {
          setUser(nextUser);
          setError(null);
        }

        return nextUser;
      } catch (requestError) {
        if (isCurrentRequest(requestId)) {
          setError(getErrorMessage(requestError));
        }

        throw requestError;
      } finally {
        if (isCurrentRequest(requestId)) {
          setLoading(false);
        }
      }
    },
    [isCurrentRequest],
  );

  const signup = useCallback(
    async (account) => {
      const requestId = ++requestIdRef.current;

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await authApi.signup(account);
        const nextUser = getUserFromResponse(response);

        if (!nextUser) {
          throw new Error('The server did not return the newly created user.');
        }

        if (isCurrentRequest(requestId)) {
          setUser(nextUser);
          setError(null);
        }

        return nextUser;
      } catch (requestError) {
        if (isCurrentRequest(requestId)) {
          setError(getErrorMessage(requestError));
        }

        throw requestError;
      } finally {
        if (isCurrentRequest(requestId)) {
          setLoading(false);
        }
      }
    },
    [isCurrentRequest],
  );

  const logout = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      await authApi.logout();

      if (isCurrentRequest(requestId)) {
        setUser(null);
        setError(null);
      }

      return true;
    } catch (requestError) {
      if (isCurrentRequest(requestId)) {
        if (isUnauthorizedError(requestError)) {
          setUser(null);
          setError(null);
          return true;
        }

        setError(getErrorMessage(requestError));
      }

      throw requestError;
    } finally {
      if (isCurrentRequest(requestId)) {
        setLoading(false);
      }
    }
  }, [isCurrentRequest]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'administrator',
      refresh,
      login,
      signup,
      logout,
    }),
    [user, loading, error, refresh, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
