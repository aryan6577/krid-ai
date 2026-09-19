import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Auth from "./pages/auth/Auth";
import Onboarding from "./pages/auth/Onboarding";

import PlayerDashboard from "./pages/player/Dashboard";
import Matchmaking from "./pages/player/Matchmaking";
import Games from "./pages/player/Games";
import GameDetail from "./pages/player/GameDetail";
import Venues from "./pages/player/Venues";
import Performance from "./pages/player/Performance";
import Friends from "./pages/player/Friends";

import OrgDashboard from "./pages/org/Dashboard";
import OrgVenues from "./pages/org/Venues";
import OrgBookings from "./pages/org/Bookings";
import OrgFundraising from "./pages/org/Fundraising";
import OrgCareer from "./pages/org/Career";

import Career from "./pages/player/Career";
import Funding from "./pages/Funding";
import Calendar from "./pages/Calendar";
import Profile from "./pages/Profile";

import Coaching from "./pages/player/Coaching";
import ExerciseMode from "./pages/player/ExerciseMode";
import ExerciseSession from "./pages/player/ExerciseSession";
import TutorialMode from "./pages/player/TutorialMode";
import TutorialSession from "./pages/player/TutorialSession";
import AlternativeSports from "./pages/player/AlternativeSports";

function RequireAuth({ children }) {
  const { authed } = useApp();
  if (!authed) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  const { role } = useApp();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={role === "organisation" ? <OrgDashboard /> : <PlayerDashboard />} />
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
            <Route path="performance" element={<Performance />} />
            <Route path="friends" element={<Friends />} />
            <Route path="coaching" element={<Coaching />} />
            <Route path="coaching/exercise" element={<ExerciseMode />} />
            <Route path="coaching/exercise/:exerciseId" element={<ExerciseSession />} />
            <Route path="coaching/tutorial" element={<TutorialMode />} />
            <Route path="coaching/tutorial/:drillId" element={<TutorialSession />} />
            <Route path="coaching/alternative-sports" element={<AlternativeSports />} />
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
