import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NimbleResearchSafe } from "@/components/NimbleResearchSafe";

export const Route = createFileRoute("/research")({
  head: () => ({ meta: [{ title: "NIMBLE Research OS — Cognivance Labs" }, { name: "description", content: "Interactive multimodal neuroimaging research workstation." }] }),
  component: Research,
});

function Research() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!localStorage.getItem("cognivance_session")) navigate({ to: "/auth" }); else setReady(true); }, [navigate]);
  if (!ready) return <div className="min-h-screen bg-[#020405]" />;
  return <NimbleResearchSafe />;
}
