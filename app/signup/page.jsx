import AuthForm from "../../components/AuthForm";

export const metadata = {
  title: "Create an account | musicdesigner",
  description:
    "Create a musicdesigner account. The first registered account becomes the portfolio administrator.",
  alternates: {
    canonical: "https://musicdesigner.geo-drops.com/signup",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return (
    <section className="auth-page" aria-labelledby="signup-title">
      <div className="container auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Portfolio access</p>
          <h1 id="signup-title">Create your account</h1>
          <p>
            Set up a secure account to access the musicdesigner portfolio
            platform.
          </p>

          <aside className="auth-guidance" aria-labelledby="admin-guidance-title">
            <h2 id="admin-guidance-title">First-account administrator</h2>
            <p>
              The first account registered for this installation is
              automatically assigned the administrator role. It can create,
              edit, publish, and remove portfolio projects. Accounts created
              afterward receive member access unless their role is changed by
              an administrator.
            </p>
          </aside>
        </div>

        <AuthForm mode="signup" />
      </div>
    </section>
  );
}