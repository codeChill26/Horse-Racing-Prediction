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
import HorseOwnerHorseManagementPage from "./pages/horseOwner/HorseOwnerHorseManagementPage";
import HorseOwnerInviteJockeyPage from "./pages/horseOwner/HorseOwnerInviteJockeyPage";
import HorseOwnerSchedulePage from "./pages/horseOwner/HorseOwnerSchedulePage";
import HorseOwnerTournamentPage from "./pages/horseOwner/HorseOwnerTournamentPage";
import JockeyLayout from "./components/jockey/JockeyLayout";
import JockeyDashboardPage from "./pages/jockey/JockeyDashboardPage";
import JockeyMyRacesPage from "./pages/jockey/JockeyMyRacesPage";
import JockeyRaceDetailPage from "./pages/jockey/JockeyRaceDetailPage";
import JockeySchedulePage from "./pages/jockey/JockeySchedulePage";
import JockeyProfilePage from "./pages/jockey/JockeyProfilePage";
import JockeyNotificationsPage from "./pages/jockey/JockeyNotificationsPage";
import SpectatorLayout from "./components/spectator/SpectatorLayout";
import SpectatorHomePage from "./pages/spectator/SpectatorHomePage";
import SpectatorProfilePage from "./pages/spectator/SpectatorProfilePage";
import LandingDashboard from "./pages/Dashboard/LandingDashboard";
import AuthLayout from "./layouts/AuthLayout";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import AdminTournamentsPage from "./pages/admin/AdminTournamentsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminHorseListPage from "./pages/admin/AdminHorseListPage";
import AdminRaceStagePage from "./pages/admin/AdminRaceStagePage";
import AdminDeviationPage from "./pages/admin/AdminDeviationPage";
import AdminViolationPage from "./pages/admin/AdminViolationPage";
import AdminWalletPointPage from "./pages/admin/AdminWalletPointPage";
import AdminRaceDetailPage from "./pages/admin/AdminRaceDetailPage";
import AdminRefereePage from "./pages/admin/AdminRefereePage";

// New spectator pages
import TournamentsPage from "./pages/tournaments/TournamentsPage";
import BettingHistoryPage from "./pages/betting-history/BettingHistoryPage";
import StatisticsPage from "./pages/statistics/StatisticsPage";

// Referee pages
import RefereeLayout from "./components/referee/RefereeLayout";
import RefereeDashboardPage from "./pages/referee/RefereeDashboardPage";
import RefereeAssignedRacesPage from "./pages/referee/RefereeAssignedRacesPage";
import RefereeRaceControlPage from "./pages/referee/RefereeRaceControlPage";
import RefereeSubmissionHistoryPage from "./pages/referee/RefereeSubmissionHistoryPage";
import RefereeConflictPage from "./pages/referee/RefereeConflictPage";
import RefereeProfilePage from "./pages/referee/RefereeProfilePage";

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
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="tournaments" element={<AdminTournamentsPage />} />
          <Route path="horses" element={<AdminHorseListPage />} />
          <Route path="races" element={<AdminRaceStagePage />} />
          <Route path="races/:raceId" element={<AdminRaceDetailPage />} />
          <Route path="discrepancies" element={<AdminDeviationPage />} />
          <Route path="violations" element={<AdminViolationPage />} />
          <Route path="referees" element={<AdminRefereePage />} />
          <Route path="points" element={<AdminWalletPointPage />} />
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
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="betting-history" element={<BettingHistoryPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
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
          <Route index element={<JockeyDashboardPage />} />
          <Route path="races" element={<JockeyMyRacesPage />} />
          <Route path="races/:raceId" element={<JockeyRaceDetailPage />} />
          <Route path="schedule" element={<JockeySchedulePage />} />
          <Route path="notifications" element={<JockeyNotificationsPage />} />
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
          <Route path="horses" element={<HorseOwnerHorseManagementPage />} />
          <Route path="invite-jockey" element={<HorseOwnerInviteJockeyPage />} />
          <Route path="schedule" element={<HorseOwnerSchedulePage />} />
          <Route path="tournaments" element={<HorseOwnerTournamentPage />} />
        </Route>
        <Route
          path="/referee"
          element={
            <RequireRole role="REFEREE">
              <RefereeLayout />
            </RequireRole>
          }
        >
          <Route index element={<RefereeDashboardPage />} />
          <Route path="assigned-races" element={<RefereeAssignedRacesPage />} />
          <Route path="races/:raceId/control" element={<RefereeRaceControlPage />} />
          <Route path="submissions" element={<RefereeSubmissionHistoryPage />} />
          <Route path="conflicts" element={<RefereeConflictPage />} />
          <Route path="profile" element={<RefereeProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
