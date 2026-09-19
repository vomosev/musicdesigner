"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const navigationLinks = [
  { href: "/#portfolio", label: "Portfolio" },
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/#contact", label: "Contact" },
];

export default function SiteHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef(null);
  const toggleRef = useRef(null);
  const firstLinkRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };

    const handlePointerDown = (event) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    const focusTimer = window.setTimeout(() => {
      firstLinkRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await logout();
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again."
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isAdministrator = user?.role === "administrator";

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner">
        <Link
          className="site-header__wordmark"
          href="/"
          aria-label="musicdesigner home"
          onClick={closeMenu}
        >
          <span>music</span>
          <span className="site-header__wordmark-accent">designer</span>
        </Link>

        <button
          ref={toggleRef}
          className="site-header__menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span className="site-header__menu-icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>

        <nav
          id="primary-navigation"
          className={`site-header__navigation${menuOpen ? " is-open" : ""}`}
          aria-label="Primary navigation"
        >
          <ul className="site-header__links">
            {navigationLinks.map((link, index) => (
              <li key={link.href}>
                <Link
                  ref={index === 0 ? firstLinkRef : undefined}
                  className="site-header__link"
                  href={link.href}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="site-header__account">
            {loading ? (
              <span
                className="site-header__auth-loading"
                role="status"
                aria-live="polite"
              >
                Checking session…
              </span>
            ) : user ? (
              <>
                {isAdministrator && (
                  <Link
                    className="site-header__admin-link"
                    href="/admin"
                    aria-current={pathname === "/admin" ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    Admin
                  </Link>
                )}

                <button
                  className="site-header__logout-button"
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                >
                  {isLoggingOut ? "Logging out…" : "Logout"}
                </button>
              </>
            ) : (
              <Link
                className="site-header__login-link"
                href="/login"
                aria-current={pathname === "/login" ? "page" : undefined}
                onClick={closeMenu}
              >
                Login
              </Link>
            )}
          </div>

          {logoutError && (
            <p className="site-header__auth-error" role="alert">
              {logoutError}
            </p>
          )}
        </nav>
      </div>
    </header>
  );
}