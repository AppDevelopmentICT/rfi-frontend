import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { marked } from "marked";

let _turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (_turndown) return _turndown;
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    strongDelimiter: "**",
    fence: "```",
    linkStyle: "inlined",
  });
  service.use(gfm);

  // Preserve placeholder badges inserted by the master-data sidebar as
  // markdown-safe spans so they survive the round trip and render in the PDF.
  service.addRule("entity-chip", {
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return false;
      return node.classList.contains("rfi-pdf-entity-chip");
    },
    replacement: (_content, node) => {
      const element = node as HTMLElement;
      const label = element.textContent?.trim() || "";
      const type = element.dataset?.type || "entity";
      const refId = element.dataset?.refId || "";
      const value = `[${label}](#${type}-${refId})`;
      return value;
    },
  });

  service.addRule("preserve-line-breaks", {
    filter: ["br"],
    replacement: () => "  \n",
  });

  _turndown = service;
  return service;
}

export function htmlToMarkdown(html: string): string {
  if (!html?.trim()) return "";
  try {
    return getTurndown().turndown(html).trim() + "\n";
  } catch (err) {
    console.error("Failed to convert HTML to markdown", err);
    return "";
  }
}

export function markdownToHtml(markdown: string): string {
  if (!markdown?.trim()) return "";
  try {
    return marked(markdown, { gfm: true, breaks: true }) as string;
  } catch (err) {
    console.error("Failed to convert markdown to HTML", err);
    return "";
  }
}
