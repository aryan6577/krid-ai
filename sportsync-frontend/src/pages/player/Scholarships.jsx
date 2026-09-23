import { useState } from "react";
import Funding from "../Funding";
import Career from "./Career";

export default function Scholarships() {
  const [section, setSection] = useState("funding");
  return <div>
    <div className="mb-6"><p className="text-xs uppercase tracking-[.2em] font-bold text-clay">Scholarships</p><h1 className="font-display text-4xl mt-1">Your next opportunity</h1><p className="text-ink-soft mt-2">Explore athlete funding, sponsorships and sports career paths. Check eligibility and deadlines with the provider.</p></div>
    <div className="inline-flex flex-wrap bg-paper-dim rounded-2xl sm:rounded-full p-1 mb-6" role="tablist" aria-label="Opportunity type">
      {[ ["funding", "Scholarships & grants"], ["sponsorships", "Sponsorships"], ["career", "Career"] ].map(([value, label]) => <button key={value} id={`opportunity-tab-${value}`} type="button" role="tab" aria-controls="opportunity-panel" aria-selected={section === value} tabIndex={section === value ? 0 : -1} onKeyDown={(event) => { if (["ArrowRight", "ArrowLeft"].includes(event.key)) { const values = ["funding", "sponsorships", "career"]; const next = values[(values.indexOf(value) + (event.key === "ArrowRight" ? 1 : 2)) % 3]; setSection(next); document.getElementById(`opportunity-tab-${next}`)?.focus(); event.preventDefault(); } }} onClick={() => setSection(value)} className={`px-4 py-2 rounded-full text-sm font-semibold ${section === value ? "bg-turf text-white" : "text-ink-soft"}`}>{label}</button>)}
    </div>
    <div id="opportunity-panel" role="tabpanel" aria-labelledby={`opportunity-tab-${section}`}>{section === "career" ? <Career /> : <Funding section={section} />}</div>
  </div>;
}
