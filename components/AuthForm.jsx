'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error) {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error?.message) {
    return error.message;
  }

  return 'Authentication is temporarily unavailable. Please try again.';
}

export default function AuthForm({ mode = 'login' }) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const { login, signup, loading: authLoading } = useAuth();

  const formId = useId();
  const displayNameId = `${formId}-display-name`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const formErrorId = `${formId}-form-error`;

  const [values, setValues] = useState({
    displayName: '',
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors = {};
    const displayName = values.displayName.trim();
    const email = values.email.trim();

    if (isSignup) {
      if (!displayName) {
        errors.displayName = 'Enter your display name.';
      } else if (displayName.length < 2) {
        errors.displayName = 'Display name must be at least 2 characters.';
      } else if (displayName.length > 100) {
        errors.displayName = 'Display name must be 100 characters or fewer.';
      }
    }

    if (!email) {
      errors.email = 'Enter your email address.';
    } else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!values.password) {
      errors.password = 'Enter your password.';
    } else if (values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (values.password.length > 72) {
      errors.password = 'Password must be 72 characters or fewer.';
    }

    return errors;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });

    if (submitError) {
      setSubmitError('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting || authLoading) {
      return;
    }

    const errors = validate();
    setFieldErrors(errors);
    setSubmitError('');

    if (Object.keys(errors).length > 0) {
      const firstInvalidField = Object.keys(errors)[0];
      document.getElementById(`${formId}-${firstInvalidField === 'displayName' ? 'display-name' : firstInvalidField}`)?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const credentials = {
        email: values.email.trim().toLowerCase(),
        password: values.password,
      };

      const result = isSignup
        ? await signup({
            ...credentials,
            displayName: values.displayName.trim(),
          })
        : await login(credentials);

      const authenticatedUser = result?.user ?? result;
      const isAdministrator =
        authenticatedUser?.role === 'administrator' ||
        authenticatedUser?.role === 'admin';

      router.replace(isAdministrator ? '/admin' : '/');
      router.refresh();
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSubmitting || authLoading;
  const title = isSignup ? 'Create your account' : 'Welcome back';
  const description = isSignup
    ? 'Create a secure account to access the portfolio workspace.'
    : 'Sign in to manage your session and portfolio access.';

  return (
    <section className="auth-form-card" aria-labelledby={`${formId}-title`}>
      <div className="auth-form-heading">
        <p className="eyebrow">{isSignup ? 'New account' : 'Secure access'}</p>
        <h1 id={`${formId}-title`}>{title}</h1>
        <p>{description}</p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={disabled}
        aria-describedby={submitError ? formErrorId : undefined}
      >
        {submitError ? (
          <div id={formErrorId} className="form-error form-error--summary" role="alert">
            {submitError}
          </div>
        ) : null}

        {isSignup ? (
          <div className="form-field">
            <label htmlFor={displayNameId}>Display name</label>
            <input
              id={displayNameId}
              name="displayName"
              type="text"
              value={values.displayName}
              onChange={handleChange}
              autoComplete="name"
              maxLength={100}
              disabled={disabled}
              required
              aria-invalid={Boolean(fieldErrors.displayName)}
              aria-describedby={
                fieldErrors.displayName ? `${displayNameId}-error` : undefined
              }
            />
            {fieldErrors.displayName ? (
              <p id={`${displayNameId}-error`} className="field-error" role="alert">
                {fieldErrors.displayName}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="form-field">
          <label htmlFor={emailId}>Email address</label>
          <input
            id={emailId}
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            disabled={disabled}
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
          />
          {fieldErrors.email ? (
            <p id={`${emailId}-error`} className="field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label htmlFor={passwordId}>Password</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={8}
            maxLength={72}
            disabled={disabled}
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password
                ? `${passwordId}-hint ${passwordId}-error`
                : `${passwordId}-hint`
            }
          />
          <p id={`${passwordId}-hint`} className="field-hint">
            Use at least 8 characters.
          </p>
          {fieldErrors.password ? (
            <p id={`${passwordId}-error`} className="field-error" role="alert">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <button
          className="button button--primary auth-submit"
          type="submit"
          disabled={disabled}
        >
          {isSubmitting
            ? isSignup
              ? 'Creating account…'
              : 'Signing in…'
            : isSignup
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>

      <p className="auth-alternate">
        {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link href={isSignup ? '/login' : '/signup'}>
          {isSignup ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </section>
  );
}