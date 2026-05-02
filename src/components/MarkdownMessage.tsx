import { Component, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/src/lib/utils';

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  content: string;
  className?: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <p className={this.props.className}>{this.props.content}</p>;
    }
    return this.props.children;
  }
}

// ─── MarkdownMessage ──────────────────────────────────────────────────────────

export interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Renders AI Stylist message content as formatted markdown.
 *
 * - Uses `remark-gfm` for GitHub Flavored Markdown (bold, italic, lists, tables)
 * - Uses `rehype-sanitize` to strip executable HTML and prevent XSS
 * - Falls back to plain `<p>` rendering if the markdown renderer throws
 */
export default function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const baseClass = cn('text-sm text-mezo-ink/80 leading-relaxed', className);

  return (
    <MarkdownErrorBoundary content={content} className={baseClass}>
      <div className={baseClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Paragraphs — match existing bubble prose style
          p: ({ children }) => (
            <p className="text-sm text-mezo-ink/80 leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          // Bold
          strong: ({ children }) => (
            <strong className="font-bold text-mezo-ink">{children}</strong>
          ),
          // Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Unordered list
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-sm text-mezo-ink/80 leading-relaxed">{children}</ul>
          ),
          // Ordered list
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-mezo-ink/80 leading-relaxed">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-mezo-ink/80 leading-relaxed">{children}</li>
          ),
          // Headings — keep them proportional to the bubble context
          h1: ({ children }) => (
            <h1 className="text-base font-black text-mezo-ink mb-1">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-black text-mezo-ink mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-mezo-ink mb-1">{children}</h3>
          ),
          // Inline code
          code: ({ children }) => (
            <code className="bg-mezo-cream-dark px-1 py-0.5 rounded text-xs font-mono text-mezo-ink">{children}</code>
          ),
          // Block quote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-mezo-gold pl-3 italic text-mezo-ink/60 my-2">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}
