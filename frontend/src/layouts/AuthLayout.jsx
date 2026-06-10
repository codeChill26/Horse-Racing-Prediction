import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const pathToPage = {
  "/login": "signin",
  "/register": "signup",
  "/forgot-password": "signin",
  "/reset-password": "signin",
};

export default function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = pathToPage[location.pathname] || "signin";

  const handleNavigate = (page) => {
    switch (page) {
      case "dashboard":
        navigate("/");
        break;
      case "signin":
        navigate("/login");
        break;
      case "signup":
        navigate("/register");
        break;
      case "racedetails":
        navigate("/login");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        currentUser={null}
        onLogout={() => {}}
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
