import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre", "h2", "h3", "h4", "hr", "img", "video", "source", "table", "thead", "tbody", "tr", "th", "td", "span", "figure", "figcaption", "iframe",
];

const options: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading"],
    video: ["src", "controls", "poster", "width", "height"],
    source: ["src", "type"],
    iframe: ["src", "allow", "allowfullscreen", "width", "height", "title"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer", ...(attribs.href?.startsWith("http") ? { target: "_blank" } : {}) },
    }),
  },
  disallowedTagsMode: "discard",
};

/** Allow-list sanitiser for rich text (CMS pages, lessons, blog, assignments). */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, options);
}

/** Strips every tag; for excerpts and search indexing. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}

export function readingMinutes(html: string | null | undefined): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
