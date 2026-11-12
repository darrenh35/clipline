import { createFileRoute } from "@tanstack/react-router";
import { VideoEditor } from "@/components/editor/VideoEditor";

const URL = "https://clipline.lovable.app/";
const TITLE = "Clipline — Free Browser Video Editor, No Watermark";
const DESC =
  "Edit videos right in your browser: trim, keyframes, text, styled subtitles and HD export. No sign-up, no watermark, files stay on your device.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "Clipline" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Clipline",
          url: URL,
          description: DESC,
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any (web browser)",
          browserRequirements: "Requires a modern browser with JavaScript",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: VideoEditor,
});
