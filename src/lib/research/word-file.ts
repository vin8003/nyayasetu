export function slugFilename(title: string, fallback = "citebench"): string {
  const slug = (title || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

export function textAsWordHtml(title: string, text: string): string {
  const esc = (value: string) =>
    value
      .replaceAll("&", "&" + "amp;")
      .replaceAll("<", "&" + "lt;")
      .replaceAll(">", "&" + "gt;")
      .replaceAll('"', "&" + "quot;");
  return [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    `<title>${esc(title || "CiteBench")}</title>`,
    "</head>",
    "<body>",
    `<p>${esc(text).replaceAll("\n", "<br>\n")}</p>`,
    "</body>",
    "</html>",
  ].join("\n");
}

export function downloadWordFile(filename: string, html: string): void {
  const blob = new Blob([html], { type: "application/msword" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(href);
}
