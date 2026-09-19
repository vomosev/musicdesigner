import AdminDashboard from "../../components/AdminDashboard";

export const metadata = {
  title: "Portfolio Administration | musicdesigner",
  description: "Manage musicdesigner portfolio projects, publication status, and featured work.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminDashboard />;
}