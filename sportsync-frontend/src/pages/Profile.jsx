import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Mail, Phone, Pencil, Trophy, Flame, Award, Building2, ShieldCheck, LogOut } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, ProgressBar } from "../components/ui";
import { useApp } from "../context/AppContext";

// Demo-only contact/bio details layered on top of the seed player/org data (SRS §2.4 — prototype demo data)
const DEMO_PLAYER_DETAILS = {
  email: "aditya.rao@example.com",
  phone: "+91 98450 12233",
  bio: "Weekend footballer and evening shuttler. Always up for a competitive 5-a-side or a badminton doubles rematch.",
  memberSince: "Feb 2025",
  achievements: [
    { label: "14-day win streak", icon: Flame },
    { label: "50 games played", icon: Trophy },
    { label: "Top 10% Bengaluru — Football", icon: Award },
  ],
};

const DEMO_ORG_DETAILS = {
  email: "greenfield.arena@example.com",
  phone: "+91 80 4012 5566",
  bio: "Multi-sport turf and court operator running 4 venues across Bengaluru, with two live fundraising campaigns for facility upgrades.",
  memberSince: "Jan 2024",
  achievements: [
    { label: "4 venues listed", icon: Building2 },
    { label: "Verified organisation", icon: ShieldCheck },
    { label: "₹2.1L raised to date", icon: Trophy },
  ],
};

export default function Profile() {
  const { role, currentPlayer, currentOrganisation, logout } = useApp();
  const navigate = useNavigate();
  const isOrg = role === "organisation";
  const demo = isOrg ? DEMO_ORG_DETAILS : DEMO_PLAYER_DETAILS;

  const [editOpen, setEditOpen] = useState(false);
  const [bio, setBio] = useState(demo.bio);
  const [draftBio, setDraftBio] = useState(demo.bio);

  const name = isOrg ? currentOrganisation.name : currentPlayer.name;
  const avatar = isOrg ? "GA" : currentPlayer.avatar;
  const location = isOrg ? currentOrganisation.location : currentPlayer.location;

  const saveBio = () => {
    setBio(draftBio);
    setEditOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Account"
        title="Your profile"
        action={
          <GhostButton className="flex items-center gap-1.5" onClick={handleLogout}>
            <LogOut size={15} /> Log out
          </GhostButton>
        }
      />

      <div className="bg-white rounded-2xl p-6 stitch-border mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <span className="w-20 h-20 rounded-full bg-gold text-turf-deep font-display text-2xl flex items-center justify-center shrink-0">
            {avatar}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display text-2xl tracking-wide">{name}</p>
              {isOrg && <Badge tone="turf">{currentOrganisation.verification}</Badge>}
            </div>
            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
              <MapPin size={14} /> {location}
            </p>
            <p className="text-xs text-ink-soft/70 mt-1">Member since {demo.memberSince}</p>
          </div>
          <GhostButton className="!px-4 !py-2 text-sm flex items-center gap-1.5 self-start" onClick={() => { setDraftBio(bio); setEditOpen(true); }}>
            <Pencil size={14} /> Edit bio
          </GhostButton>
        </div>

        {editOpen ? (
          <div className="mt-5 space-y-3">
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
              rows={3}
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
            />
            <div className="flex gap-2">
              <PrimaryButton className="!px-4 !py-2 text-sm" onClick={saveBio}>Save</PrimaryButton>
              <GhostButton className="!px-4 !py-2 text-sm" onClick={() => setEditOpen(false)}>Cancel</GhostButton>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-soft mt-5 max-w-2xl">{bio}</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 stitch-border">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Contact</p>
          <div className="space-y-2.5">
            <p className="text-sm flex items-center gap-2"><Mail size={14} className="text-turf" /> {demo.email}</p>
            <p className="text-sm flex items-center gap-2"><Phone size={14} className="text-turf" /> {demo.phone}</p>
          </div>
        </div>

        {!isOrg ? (
          <div className="bg-white rounded-2xl p-5 stitch-border">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Sports & skill</p>
            <div className="space-y-3">
              {currentPlayer.sports.map((s) => (
                <div key={s}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{s}</span>
                    <span className="text-xs text-ink-soft">{currentPlayer.skill[s]}</span>
                  </div>
                  <ProgressBar
                    value={
                      currentPlayer.skill[s] === "Advanced" ? 90 : currentPlayer.skill[s] === "Intermediate" ? 60 : 30
                    }
                    tone="turf"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 stitch-border">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Organisation type</p>
            <p className="text-sm font-semibold">{currentOrganisation.type}</p>
            <p className="text-xs text-ink-soft mt-1">{currentOrganisation.contact}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 stitch-border">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-4">Achievements</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {demo.achievements.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 bg-paper-dim rounded-xl p-4">
              <span className="w-9 h-9 rounded-full bg-turf-light text-turf flex items-center justify-center shrink-0">
                <Icon size={16} />
              </span>
              <p className="text-sm font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
