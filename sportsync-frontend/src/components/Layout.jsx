import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  House, Trophy, MapPinned, Wallet, Landmark,
  CalendarDays, Bell, Menu, X, HeartHandshake, Building2, Briefcase,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import ChatWidget from "./ChatWidget";
import { BrandMark, BrandWordmark } from "./Brand";

const playerNav = [
  { to: "/app/dashboard", label: "Home", icon: House },
  { to: "/app/play", label: "Play", icon: Trophy },
  { to: "/app/scholarships", label: "Scholarships", icon: Landmark },
  { to: "/app/profile", label: "Profile", icon: HeartHandshake },
];

function playerTab(pathname) {
  if (["/app/games", "/app/matchmaking", "/app/venues", "/app/train", "/app/friends"].some((path) => pathname.startsWith(path))) return "/app/play";
  if (["/app/funding", "/app/career"].some((path) => pathname.startsWith(path))) return "/app/scholarships";
  if (["/app/performance", "/app/calendar"].some((path) => pathname.startsWith(path))) return "/app/profile";
  return pathname;
}

const orgNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: Building2 },
  { to: "/app/venues", label: "My Venues", icon: MapPinned },
  { to: "/app/bookings", label: "Bookings", icon: Wallet },
  { to: "/app/career", label: "Career", icon: Briefcase },
  { to: "/app/fundraising", label: "Fundraising", icon: Landmark },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
];

export default function Layout() {
  const { role, currentPlayer, currentOrganisation, notificationsState, markAllRead } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const nav = role === "organisation" ? orgNav : playerNav;
  const unread = notificationsState.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="bg-turf-deep text-white sticky top-0 z-40">
        <div className="max-w-[1768px] mx-auto px-8 md:px-10 flex items-center justify-between gap-3 h-20">
          <div className="flex items-center gap-3 shrink-0">
            <button className={`${role === "organisation" ? "md:hidden" : "hidden"} p-1`} onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 shrink-0"
              title="Go to landing page"
            >
              <BrandMark className="w-8 h-8" tone="orange" />
              <span className="hidden sm:inline">
                <BrandWordmark className="text-2xl text-white" accentClassName="text-gold" />
              </span>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-5 overflow-x-auto no-scrollbar min-w-0">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-7 py-3 rounded-full text-lg font-bold transition whitespace-nowrap shrink-0 ${
                    (role === "organisation" ? isActive : playerTab(location.pathname) === to) ? "bg-turf text-white shadow-sm" : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={17} className="hidden lg:block" />
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
                aria-label="Notifications"
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
              <span className="w-12 h-12 rounded-full bg-gold border-4 border-white text-turf-deep font-bold text-sm flex items-center justify-center">
                {role === "organisation" ? currentOrganisation.avatar : currentPlayer.avatar}
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

      <main className="flex-1 max-w-[1768px] w-full mx-auto px-5 md:px-9 py-6 md:py-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {role !== "organisation" && <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink/10 grid grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]" aria-label="Main navigation">
        {playerNav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={`flex flex-col items-center gap-1 py-3 text-[11px] font-bold ${playerTab(location.pathname) === to ? "text-turf" : "text-ink-soft"}`}><Icon size={21} aria-hidden="true" />{label}</NavLink>)}
      </nav>}
      <footer className="text-center text-xs text-ink-soft/60 py-6 hidden md:block">
        © 2026 Krid.ai. All Rights Reserved.
      </footer>

      <ChatWidget />
    </div>
  );
}
