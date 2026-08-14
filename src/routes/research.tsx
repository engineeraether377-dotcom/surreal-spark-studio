import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NimbleResearchStudioV2 } from "@/components/NimbleResearchStudioV2";

export const Route = createFileRoute("/research")({
  head: () => ({ meta: [{ title: "NIMBLE Research OS — Cognivance Labs" }, { name: "description", content: "Interactive multimodal neuroimaging research workstation." }] }),
  component: Research,
});

function Research() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cognivance_session")) navigate({ to: "/auth" });
    else setReady(true);
  }, [navigate]);
  if (!ready) return <div className="min-h-screen bg-[#020405]" />;
  return <div className="min-h-screen bg-[#020405]"><div className="border-b border-white/10 bg-[#020405]/95 px-4 py-3 backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-[1900px] items-center justify-end"><Link to="/" className="rounded-full border border-white/10 px-4 py-2 font-mono text-[7px] tracking-[.2em] text-white/45 transition hover:border-cyan-300/30 hover:text-cyan-100">← BACK TO HOME</Link></div></div><main><NimbleResearchStudioV2 /></main></div>;
}
