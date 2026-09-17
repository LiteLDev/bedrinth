import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import {
  CircleAlert,
  Info,
  Lightbulb,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react";
import { resolveMarkdownUrl } from "@/lib/markdown";
import {
  ALERT_CLASS_NAME,
  getAlertType,
  remarkGithubAlerts,
  type AlertType,
} from "@/lib/remark-github-alerts";

interface MarkdownProps {
  children: string;
  /** Raw file base of the repository the README came from, trailing slash included. */
  rawBase: string;
  /** Browsable file base of the same repository, for links to files. */
  blobBase: string;
}

const ALERT_ICONS: Record<AlertType, typeof Info> = {
  note: Info,
  tip: Lightbulb,
  important: CircleAlert,
  warning: TriangleAlert,
  caution: OctagonAlert,
};

/**
 * GitHub's own sanitizer, plus the alert classes {@link remarkGithubAlerts}
 * adds — those are what the `.markdown-alert*` rules in globals.css hang off,
 * and sanitation would otherwise drop every `class` attribute.
 *
 * READMEs come from third-party repositories, so their HTML is sanitized
 * rather than trusted: `defaultSchema` already drops `script`, event handlers,
 * `style` and `javascript:` URLs, and leaves the presentational attributes
 * (`align`, `width`, `height`) READMEs actually use.
 */
const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ["className", ALERT_CLASS_NAME],
    ],
    p: [["className", ALERT_CLASS_NAME]],
  },
};

function buildComponents(rawBase: string, blobBase: string): Components {
  return {
    // READMEs link and embed files relative to their own repository.
    a: ({ node, href, ...props }) => (
      <a href={resolveMarkdownUrl(href, blobBase)} {...props} />
    ),
    img: ({ node, src, ...props }) => (
      // README images are arbitrary remote URLs, which the Cloudflare image
      // loader cannot resize, and markdown rarely gives them a size. `alt` is
      // passed through when the markdown has it.
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
      <img
        src={typeof src === "string" ? resolveMarkdownUrl(src, rawBase) : src}
        {...props}
      />
    ),
    // An alert box needs no component of its own: it is a plain `div` carrying
    // the `markdown-alert` classes that globals.css styles. Only its title
    // needs one, to put GitHub's icon in front of the text.
    p: ({ node, className, children, ...props }) => {
      const alert = getAlertType(className);
      if (!alert) return <p className={className} {...props}>{children}</p>;

      const Icon = ALERT_ICONS[alert];

      // `not-prose` keeps the typography plugin's paragraph margins off the
      // title, so it sits flush against the first line of the alert body.
      return (
        <p
          className={`not-prose flex items-center gap-2 ${className ?? ""}`}
          {...props}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {children}
        </p>
      );
    },
  };
}

export function Markdown({ children, rawBase, blobBase }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkGithubAlerts]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeSlug]}
      components={buildComponents(rawBase, blobBase)}
    >
      {children}
    </ReactMarkdown>
  );
}
