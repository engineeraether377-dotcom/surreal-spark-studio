import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { NimbleResearchStudio } from "@/components/NimbleResearchStudio";

const title = "NIMBLE Research OS — Cognivance Labs";
const description = "A multimodal research workspace for volumetric MRI, tractography and electrophysiology exploration.";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: Research,
});

function Research() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cognivance_session")) navigate({ to: "/auth" });
    else setReady(true);
  }, [navigate]);
  if (!ready) return <div className="min-h-screen bg-[#020406]" />;
  return <div className="min-h-screen bg-[#020406]"><SiteNav/><main><NimbleResearchStudio/></main></div>;
}
