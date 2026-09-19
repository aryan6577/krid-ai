import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Trophy, Users, Swords, MapPinned, Wallet, LineChart, Landmark,
  CalendarDays, Bell, Menu, X, HeartHandshake, Building2, Briefcase, Dumbbell,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { currentPlayer } from "../data/players";
import { currentOrganisation } from "../data/venues";
import ChatWidget from "./ChatWidget";
import { BrandMark, BrandWordmark } from "./Brand";

const playerNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: Trophy },
  { to: "/app/matchmaking", label: "Find Players", icon: Swords },
  { to: "/app/games", label: "Games", icon: Users },
  { to: "/app/venues", label: "Venues", icon: MapPinned },
  { to: "/app/performance", label: "Performance", icon: LineChart },
  { to: "/app/coaching", label: "Coaching", icon: Dumbbell },
  { to: "/app/friends", label: "Friends", icon: HeartHandshake },
  { to: "/app/career", label: "Career", icon: Briefcase },
  { to: "/app/funding", label: "Funding", icon: Landmark },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
];

const orgNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: Building2 },
  { to: "/app/venues", label: "My Venues", icon: MapPinned },
  { to: "/app/bookings", label: "Bookings", icon: Wallet },
  { to: "/app/career", label: "Career", icon: Briefcase },
  { to: "/app/fundraising", label: "Fundraising", icon: Landmark },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
];

export default function Layout() {
  const { role, notificationsState, markAllRead } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const nav = role === "organisation" ? orgNav : playerNav;
  const unread = notificationsState.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="bg-turf-deep text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-3 h-16">
          <div className="flex items-center gap-3 shrink-0">
            <button className="md:hidden p-1" onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 shrink-0"
              title="Go to landing page"
            >
              <BrandMark className="w-8 h-8" tone="orange" />
              <span className="hidden lg:inline">
                <BrandWordmark className="text-xl text-white" accentClassName="text-gold" />
              </span>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto no-scrollbar min-w-0">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-2 rounded-full text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isActive ? "bg-white text-turf-deep" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((o) => !o);
                  if (!notifOpen) markAllRead();
                }}
                className="relative p-2 rounded-full hover:bg-white/10 transition"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-clay rounded-full text-[10px] flex items-center justify-center font-bold">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-ink rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-ink/10 font-display tracking-wide">Notifications</div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-ink/5">
                    {notificationsState.map((n) => (
                      <div key={n.id} className="px-4 py-3 text-sm">
                        <p className="text-ink-soft">{n.text}</p>
                        <p className="text-xs text-ink-soft/60 mt-1">{n.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate("/app/profile")}
              className="flex items-center gap-2 pl-1"
              title={`View profile — ${role === "organisation" ? currentOrganisation.name : currentPlayer.name}`}
            >
              <span className="w-8 h-8 rounded-full bg-gold text-turf-deep font-bold text-xs flex items-center justify-center">
                {role === "organisation" ? "GA" : currentPlayer.avatar}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden flex flex-col gap-1 px-4 pb-4">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive ? "bg-white text-turf-deep" : "text-white/80"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-ink-soft/60 py-6">
        © 2026 Krid.ai. All Rights Reserved.
      </footer>

      <ChatWidget />
    </div>
  );
}
