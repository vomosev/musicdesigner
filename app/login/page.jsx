import AuthForm from "../../components/AuthForm";

export const metadata = {
  title: "Sign in | musicdesigner",
  description:
    "Sign in to the musicdesigner administration workspace to manage portfolio projects.",
  alternates: {
    canonical: "https://musicdesigner.geo-drops.com/login",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <section className="auth-page" aria-labelledby="login-heading">
      <div className="auth-shell">
        <aside className="auth-intro">
          <p className="eyebrow">Portfolio access</p>
          <h1 id="login-heading">Welcome back.</h1>
          <p>
            Sign in to manage project stories, artwork galleries, publication
            status, and the featured work displayed across the portfolio.
          </p>
          <div className="auth-intro-note">
            <strong>Administrator workspace</strong>
            <span>
              Access is reserved for registered users. Portfolio management
              tools are available to administrator accounts.
            </span>
          </div>
        </aside>

        <div className="auth-panel" aria-label="Sign in form">
          <AuthForm mode="login" />
        </div>
      </div>
    </section>
  );
}