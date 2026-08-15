import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NimbleRealTimeAnalysis } from "@/components/NimbleRealTimeAnalysis";

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
  return <div className="min-h-screen bg-[#020405]"><main><NimbleRealTimeAnalysis /></main></div>;
}
