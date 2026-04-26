import { marked } from "marked";

export function markdownToHtml(md: string): string {
  return marked(md, {
    breaks: true,
    gfm: true,
  }) as string;
}
