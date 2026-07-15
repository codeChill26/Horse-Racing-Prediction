import "./App.css";
import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/ToastProvider";
import { ToastContainer } from "./hooks/ToastContainer";
import RequireRole from "./components/RequireRole";

// ============================
// Eager-loaded (auth + landing + small core pages)
// ============================
import AdminLayout from "./components/admin/AdminLayout";
import ForgotPasswordPage from "./pages/LoginPage/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage";
import RegisterPage from "./pages/registerPage/RegisterPage";
import LandingDashboard from "./pages/Dashboard/LandingDashboard";

// ============================
// Lazy-loaded (heavy/admin/spectator/etc.)
// Mỗi role page được bundle riêng → giảm initial chunk size.
// ============================
const DashboardAdmin = lazy(() => import("./pages/admin/DashboardAdmin"));
const AdminTournamentsPage = lazy(() => import("./pages/admin/AdminTournamentsPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminHorseListPage = lazy(() => import("./pages/admin/AdminHorseListPage"));
const AdminRaceStagePage = lazy(() => import("./pages/admin/AdminRaceStagePage"));
const AdminDeviationPage = lazy(() => import("./pages/admin/AdminDeviationPage"));
const AdminViolationPage = lazy(() => import("./pages/admin/AdminViolationPage"));
const AdminWalletPointPage = lazy(() => import("./pages/admin/AdminWalletPointPage"));
const AdminRaceDetailPage = lazy(() => import("./pages/admin/AdminRaceDetailPage"));
const AdminRefereePage = lazy(() => import("./pages/admin/AdminRefereePage"));

// Horse Owner
const HorseOwnerLayout = lazy(() => import("./components/horseOwner/HorseOwnerLayout"));
const HorseOwnerHomePage = lazy(() => import("./pages/horseOwner/HorseOwnerHomePage"));
const HorseOwnerProfilePage = lazy(() => import("./pages/horseOwner/HorseOwnerProfilePage"));
const HorseOwnerHorseManagementPage = lazy(() =>
  import("./pages/horseOwner/HorseOwnerHorseManagementPage")
);
const HorseOwnerInviteJockeyPage = lazy(() =>
  import("./pages/horseOwner/HorseOwnerInviteJockeyPage")
);
const HorseOwnerSchedulePage = lazy(() => import("./pages/horseOwner/HorseOwnerSchedulePage"));
const HorseOwnerTournamentPage = lazy(() => import("./pages/horseOwner/HorseOwnerTournamentPage"));

// Jockey
const JockeyLayout = lazy(() => import("./components/jockey/JockeyLayout"));
const JockeyDashboardPage = lazy(() => import("./pages/jockey/JockeyDashboardPage"));
const JockeyMyRacesPage = lazy(() => import("./pages/jockey/JockeyMyRacesPage"));
const JockeyRaceDetailPage = lazy(() => import("./pages/jockey/JockeyRaceDetailPage"));
const JockeySchedulePage = lazy(() => import("./pages/jockey/JockeySchedulePage"));
const JockeyProfilePage = lazy(() => import("./pages/jockey/JockeyProfilePage"));
const JockeyNotificationsPage = lazy(() => import("./pages/jockey/JockeyNotificationsPage"));

// Spectator
const SpectatorLayout = lazy(() => import("./components/spectator/SpectatorLayout"));
const SpectatorHomePage = lazy(() => import("./pages/spectator/SpectatorHomePage"));
const SpectatorProfilePage = lazy(() => import("./pages/spectator/SpectatorProfilePage"));
const SpectatorRaceResultsPage = lazy(() =>
  import("./pages/spectator/SpectatorRaceResultsPage")
);
const TournamentsPage = lazy(() => import("./pages/tournaments/TournamentsPage"));
const BettingHistoryPage = lazy(() => import("./pages/betting-history/BettingHistoryPage"));
const StatisticsPage = lazy(() => import("./pages/statistics/StatisticsPage"));

// Referee
const RefereeLayout = lazy(() => import("./components/referee/RefereeLayout"));
const RefereeDashboardPage = lazy(() => import("./pages/referee/RefereeDashboardPage"));
const RefereeAssignedRacesPage = lazy(() => import("./pages/referee/RefereeAssignedRacesPage"));
const RefereeRaceControlPage = lazy(() => import("./pages/referee/RefereeRaceControlPage"));
const RefereeSubmissionHistoryPage = lazy(() =>
  import("./pages/referee/RefereeSubmissionHistoryPage")
);
const RefereeConflictPage = lazy(() => import("./pages/referee/RefereeConflictPage"));
const RefereeProfilePage = lazy(() => import("./pages/referee/RefereeProfilePage"));
const RefereeNotificationsPage = lazy(() =>
  import("./pages/referee/RefereeNotificationsPage")
);

/**
 * PageFallback — Loading UI khi lazy chunk đang tải.
 * Hiển thị skeleton nhẹ thay vì blank screen.
 */
function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        color: "var(--ard-muted, #8b949e)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid rgba(141, 214, 166, 0.2)",
          borderTopColor: "rgba(141, 214, 166, 0.9)",
          borderRadius: "50%",
          animation: "page-fallback-spin 0.8s linear infinite",
        }}
      />
      <p style={{ fontSize: "0.875rem" }}>Đang tải trang…</p>
      <style>{`
        @keyframes page-fallback-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
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
                  <Suspense fallback={<PageFallback />}>
                    <SpectatorLayout />
                  </Suspense>
                </RequireRole>
              }
            >
              <Route index element={<SpectatorHomePage />} />
              <Route path="tournaments" element={<TournamentsPage />} />
              <Route path="races/:raceId/results" element={<SpectatorRaceResultsPage />} />
              <Route path="betting-history" element={<BettingHistoryPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="profile" element={<SpectatorProfilePage />} />
            </Route>
            <Route
              path="/jockey"
              element={
                <RequireRole role="JOCKEY">
                  <Suspense fallback={<PageFallback />}>
                    <JockeyLayout />
                  </Suspense>
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
                  <Suspense fallback={<PageFallback />}>
                    <HorseOwnerLayout />
                  </Suspense>
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
                  <Suspense fallback={<PageFallback />}>
                    <RefereeLayout />
                  </Suspense>
                </RequireRole>
              }
            >
              <Route index element={<RefereeDashboardPage />} />
              <Route path="assigned-races" element={<RefereeAssignedRacesPage />} />
              <Route path="races/:raceId/control" element={<RefereeRaceControlPage />} />
              <Route path="submissions" element={<RefereeSubmissionHistoryPage />} />
              <Route path="conflicts" element={<RefereeConflictPage />} />
              <Route path="profile" element={<RefereeProfilePage />} />
              <Route path="notifications" element={<RefereeNotificationsPage />} />
            </Route>
          </Routes>
        </Suspense>
        <ToastContainer />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
