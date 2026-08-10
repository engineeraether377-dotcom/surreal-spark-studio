import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { NimbleNeuralLab } from "@/components/NimbleNeuralLab";

const title = "NIMBLE Research Console — Cognivance Labs";
const description =
  "Interactive anatomical visualization and research interface for NIMBLE.";

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
        <NimbleNeuralLab />
      </main>
      <SiteFooter />
    </div>
  );
}
