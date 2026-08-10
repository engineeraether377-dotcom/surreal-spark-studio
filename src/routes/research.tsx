import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrainResearchLabV2 } from "@/components/BrainResearchLabV2";

const title = "Research Console — Cognivance Labs";
const description =
  "Interactive research instrumentation for neural structure, circuit reconstruction, signal propagation and future nanorobotic navigation.";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Research,
});

function Research() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteNav />
      <main>
        <BrainResearchLabV2 />
      </main>
      <SiteFooter />
    </div>
  );
}
