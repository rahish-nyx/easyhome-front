import { useEffect } from "react";

function upsertMeta(attr, key, content) {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function usePageMeta(title, description, { image } = {}) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} · EasyHome`
      : "EasyHome — Trusted home services, on demand";
    document.title = fullTitle;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("property", "og:type", "website");
    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    }
  }, [title, description, image]);
}
