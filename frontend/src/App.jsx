import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import RequireRole from "./components/RequireRole";
import AdminLayout from "./components/admin/AdminLayout";
import ForgotPasswordPage from "./pages/LoginPage/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage";
import RegisterPage from "./pages/registerPage/RegisterPage";
import HorseOwnerLayout from "./components/horseOwner/HorseOwnerLayout";
import HorseOwnerHomePage from "./pages/horseOwner/HorseOwnerHomePage";
import HorseOwnerProfilePage from "./pages/horseOwner/HorseOwnerProfilePage";
import JockeyLayout from "./components/jockey/JockeyLayout";
import JockeyHomePage from "./pages/jockey/JockeyHomePage";
import JockeyProfilePage from "./pages/jockey/JockeyProfilePage";
import SpectatorLayout from "./components/spectator/SpectatorLayout";
import SpectatorHomePage from "./pages/spectator/SpectatorHomePage";
import SpectatorProfilePage from "./pages/spectator/SpectatorProfilePage";
import LandingDashboard from "./pages/Dashboard/LandingDashboard";
import AuthLayout from "./layouts/AuthLayout";
import DashboardAdmin from "./pages/admin/DashboardAdmin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingDashboard />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/admin"
          element={
            <RequireRole role="ADMIN">
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<DashboardAdmin />} />
        </Route>
        <Route
          path="/spectator"
          element={
            <RequireRole role="SPECTATOR">
              <SpectatorLayout />
            </RequireRole>
          }
        >
          <Route index element={<SpectatorHomePage />} />
          <Route path="profile" element={<SpectatorProfilePage />} />
        </Route>
        <Route
          path="/jockey"
          element={
            <RequireRole role="JOCKEY">
              <JockeyLayout />
            </RequireRole>
          }
        >
          <Route index element={<JockeyHomePage />} />
          <Route path="profile" element={<JockeyProfilePage />} />
        </Route>
        <Route
          path="/horse-owner"
          element={
            <RequireRole role="HORSE_OWNER">
              <HorseOwnerLayout />
            </RequireRole>
          }
        >
          <Route index element={<HorseOwnerHomePage />} />
          <Route path="profile" element={<HorseOwnerProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
