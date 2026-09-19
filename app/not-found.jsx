import Link from 'next/link';

export const metadata = {
  title: 'Page Not Found | musicdesigner',
  description: 'The requested page could not be found.',
};

export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found__content">
        <p className="not-found__eyebrow">404 · Track not found</p>
        <h1 id="not-found-title">This page is off the record.</h1>
        <p>
          The page you requested may have moved, been removed, or never made
          the final cut.
        </p>
        <Link className="button button--primary" href="/">
          Return to the portfolio
        </Link>
      </div>
    </section>
  );
}