import { createFileRoute } from "@tanstack/react-router";
import { VideoEditor } from "@/components/editor/VideoEditor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clipline — Simple, high-quality video editor" },
      { name: "description", content: "Trim, split, add text and color-grade videos right in your browser. Export in HD." },
      { property: "og:title", content: "Clipline — Simple video editor" },
      { property: "og:description", content: "Trim, split, add text and color-grade videos in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoEditor,
});
