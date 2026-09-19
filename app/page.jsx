import Hero from "../components/Hero";
import PortfolioGallery from "../components/PortfolioGallery";
import AboutServices from "../components/AboutServices";
import ContactSection from "../components/ContactSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <PortfolioGallery />
      <AboutServices />
      <ContactSection />
    </>
  );
}