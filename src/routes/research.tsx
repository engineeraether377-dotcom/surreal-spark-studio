import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { NimbleAnalysisWorkspace } from "@/components/NimbleAnalysisWorkspace";

const title = "NIMBLE Research OS — Cognivance Labs";
const description = "Multimodal neuroimaging workspace for volumetric MRI, tractography, EEG fusion and NIMBLE simulation.";

export const Route = createFileRoute("/research")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }] }),
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
  return <div className="min-h-screen bg-[#020405]"><SiteNav /><main><NimbleAnalysisWorkspace /></main></div>;
}
