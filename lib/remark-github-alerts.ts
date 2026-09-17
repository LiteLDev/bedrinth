import type { Blockquote, Root } from "mdast";
import { visit } from "unist-util-visit";

export const ALERT_TYPES = [
  "note",
  "tip",
  "important",
  "warning",
  "caution",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

const ALERT_TITLES: Record<AlertType, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

/** `[!WARNING]`, alone on the first line of a blockquote, as GitHub writes it. */
const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/i;

/**
 * The classes emitted by {@link remarkGithubAlerts}, so the HTML sanitizer can
 * be told to keep them and nothing else.
 */
export const ALERT_CLASS_NAME =
  /^markdown-alert(?:$|-(?:title|note|tip|important|warning|caution)$)/;

/** Reads the alert type back out of an element produced by this plugin. */
export function getAlertType(className?: string): AlertType | null {
  const match = /\bmarkdown-alert-(note|tip|important|warning|caution)\b/.exec(
    className ?? "",
  );
  return match ? (match[1] as AlertType) : null;
}

/**
 * Renders GitHub's blockquote alerts (`> [!NOTE]`) as a `div`, so
 * `components/markdown.tsx` can style them the way GitHub does.
 *
 * Runs on markdown, before the tree becomes HTML: the plugin owns the classes
 * it adds, which is why the sanitizer only has to allow those.
 */
export function remarkGithubAlerts() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const [first] = node.children;
      if (first?.type !== "paragraph") return;

      const [text] = first.children;
      if (text?.type !== "text") return;

      const [markerLine, ...bodyLines] = text.value.split("\n");
      const marker = ALERT_MARKER.exec(markerLine);
      if (!marker) return;

      const type = marker[1].toLowerCase() as AlertType;
      const body = bodyLines.join("\n");

      if (body === "") {
        // The marker was the whole paragraph: drop it, and a hard break the
        // author may have left dangling behind it.
        first.children.shift();
        if (first.children[0]?.type === "break") first.children.shift();
        if (first.children.length === 0) node.children.shift();
      } else {
        text.value = body;
      }

      node.data = {
        hName: "div",
        hProperties: {
          className: ["markdown-alert", `markdown-alert-${type}`],
        },
      };
      node.children.unshift({
        type: "paragraph",
        data: {
          hName: "p",
          hProperties: {
            className: ["markdown-alert-title", `markdown-alert-${type}`],
          },
        },
        children: [{ type: "text", value: ALERT_TITLES[type] }],
      });
    });
  };
}
