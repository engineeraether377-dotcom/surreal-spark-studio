import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { NimbleMRIShowcase } from "@/components/NimbleMRIShowcase";

const title = "NIMBLE Research Console — Cognivance Labs";
const description = "Interactive 3D anatomical visualization and research interface for NIMBLE.";

export const Route = createFileRoute("/research")({
  head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
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
  return <div className="min-h-screen bg-paper"><SiteNav/><main><NimbleMRIShowcase/></main><SiteFooter/></div>;
}
