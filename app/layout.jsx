import "./globals.css";

import AuthProvider from "../components/AuthProvider";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const siteUrl = "https://musicdesigner.geo-drops.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "musicdesigner — Graphic Design for Music",
    template: "%s | musicdesigner",
  },
  description:
    "A curated portfolio of album artwork, visual identities, campaigns, and creative direction for artists, labels, and the wider music industry.",
  keywords: [
    "music graphic designer",
    "album artwork",
    "music branding",
    "creative direction",
    "visual identity",
    "editorial design",
    "campaign design",
    "music design portfolio",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "musicdesigner",
    title: "musicdesigner — Graphic Design for Music",
    description:
      "Album artwork, visual identities, campaigns, and creative direction for artists and the music industry.",
  },
  twitter: {
    card: "summary_large_image",
    title: "musicdesigner — Graphic Design for Music",
    description:
      "Album artwork, visual identities, campaigns, and creative direction for artists and the music industry.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <SiteHeader />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}