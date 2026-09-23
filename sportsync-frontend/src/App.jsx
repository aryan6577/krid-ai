import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import DemoExplorer from "./pages/DemoExplorer";
import Auth from "./pages/auth/Auth";
import Onboarding from "./pages/auth/Onboarding";

import PlayerDashboard from "./pages/player/Dashboard";
import Play from "./pages/player/Play";
import Scholarships from "./pages/player/Scholarships";
import Matchmaking from "./pages/player/Matchmaking";
import Games from "./pages/player/Games";
import GameDetail from "./pages/player/GameDetail";
import Venues from "./pages/player/Venues";
import Performance from "./pages/player/Performance";
import Friends from "./pages/player/Friends";
import Train from "./pages/player/Train";

import OrgDashboard from "./pages/org/Dashboard";
import OrgVenues from "./pages/org/Venues";
import OrgBookings from "./pages/org/Bookings";
import OrgFundraising from "./pages/org/Fundraising";
import OrgCareer from "./pages/org/Career";

import Career from "./pages/player/Career";
import Funding from "./pages/Funding";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";

function RequireAuth({ children }) {
  const { authed, authLoading } = useApp();
  if (authLoading) return <div className="min-h-screen bg-paper flex items-center justify-center text-ink-soft">Loading Krid.ai...</div>;
  if (!authed) return <Navigate to="/auth" replace />;
  return children;
}

function RequireOnboarded({ children }) {
  const { onboarded } = useApp();
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function AppRoutes() {
  const { role, onboarded } = useApp();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/demo" element={<DemoExplorer />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            {onboarded ? <Navigate to="/app/dashboard" replace /> : <Onboarding />}
          </RequireAuth>
        }
      />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <Layout />
            </RequireOnboarded>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={role === "organisation" ? <OrgDashboard /> : <PlayerDashboard />} />
        {role !== "organisation" && <Route path="play" element={<Play />} />}
        {role !== "organisation" && <Route path="scholarships" element={<Scholarships />} />}
        <Route path="venues" element={role === "organisation" ? <OrgVenues /> : <Venues />} />
        <Route path="career" element={role === "organisation" ? <OrgCareer /> : <Career />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="funding" element={<Funding />} />
        <Route path="profile" element={<Profile />} />

        {role === "organisation" ? (
          <>
            <Route path="bookings" element={<OrgBookings />} />
            <Route path="fundraising" element={<OrgFundraising />} />
          </>
        ) : (
          <>
            <Route path="matchmaking" element={<Matchmaking />} />
            <Route path="games" element={<Games />} />
            <Route path="games/:id" element={<GameDetail />} />
            <Route path="train" element={<Train />} />
            <Route path="performance" element={<Performance />} />
            <Route path="friends" element={<Friends />} />
          </>
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
