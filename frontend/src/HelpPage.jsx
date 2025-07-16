import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useParams, Link as RouterLink } from "react-router-dom";
import { loadDocFile } from "./services/api";
// import "github-markdown-css/github-markdown-light.css";

export default function HelpPage() {
  const { page = "Help" } = useParams();
  const [content, setContent] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocFile(`${page}.md`)
      .then(setContent)
      .catch((e) => setError(e.message));
  }, [page]);

  // Custom link renderer for react-markdown
  function MarkdownLink({ href, children, ...props }) {
    // Only intercept /help/ links (internal help navigation)
    if (href && href.startsWith("/help/")) {
      return (
        <RouterLink to={href} {...props}>
          {children}
        </RouterLink>
      );
    }
    // For all other links, use default <a>
    return (
      <a href={href} {...props} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="text-lg font-semibold mb-2">Help</div>
      {page !== "Help" && (
        <div className="mb-4">
          <RouterLink to="/help">← Back to Help</RouterLink>
        </div>
      )}
      {error ? (
        <div className="text-red-600">{error}</div>
      ) : content ? (
        <div className="markdown-body prose prose-sm max-w-none">
          <style>{`
            /* Reset any conflicting styles */
            .markdown-body * {
              box-sizing: border-box;
            }
            
            /* Table styles with high specificity */
            .markdown-body table,
            .markdown-body .prose table {
              border-collapse: collapse !important;
              border-spacing: 0 !important;
              width: 100% !important;
              margin: 1rem 0 !important;
              overflow: auto !important;
              display: table !important;
              border: 1px solid #d0d7de !important;
            }
            
            .markdown-body table th,
            .markdown-body table td,
            .markdown-body .prose table th,
            .markdown-body .prose table td {
              padding: 8px 12px !important;
              border: 1px solid #d0d7de !important;
              text-align: left !important;
              vertical-align: top !important;
              min-width: 100px !important;
            }
            
            .markdown-body table th,
            .markdown-body .prose table th {
              font-weight: 600 !important;
              background-color: #f6f8fa !important;
              color: #24292f !important;
            }
            
            .markdown-body table tr:nth-child(2n),
            .markdown-body .prose table tr:nth-child(2n) {
              background-color: #f6f8fa !important;
            }
            
            .markdown-body table tr:hover,
            .markdown-body .prose table tr:hover {
              background-color: #f0f0f0 !important;
            }
            
            /* Code styles */
            .markdown-body code,
            .markdown-body .prose code {
              background-color: rgba(175, 184, 193, 0.2) !important;
              padding: 0.2em 0.4em !important;
              border-radius: 6px !important;
              font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace !important;
              font-size: 85% !important;
              color: #24292f !important;
            }
            
            .markdown-body pre,
            .markdown-body .prose pre {
              background-color: #f6f8fa !important;
              border-radius: 6px !important;
              padding: 16px !important;
              overflow: auto !important;
              border: 1px solid #d0d7de !important;
            }
            
            .markdown-body pre code,
            .markdown-body .prose pre code {
              background-color: transparent !important;
              padding: 0 !important;
              border-radius: 0 !important;
            }
            
            /* Blockquote styles */
            .markdown-body blockquote,
            .markdown-body .prose blockquote {
              border-left: 4px solid #d0d7de !important;
              margin: 0 !important;
              padding-left: 16px !important;
              color: #656d76 !important;
              font-style: italic !important;
            }
            
            /* Heading styles */
            .markdown-body h1,
            .markdown-body h2,
            .markdown-body h3,
            .markdown-body h4,
            .markdown-body h5,
            .markdown-body h6,
            .markdown-body .prose h1,
            .markdown-body .prose h2,
            .markdown-body .prose h3,
            .markdown-body .prose h4,
            .markdown-body .prose h5,
            .markdown-body .prose h6 {
              margin-top: 24px !important;
              margin-bottom: 16px !important;
              font-weight: 600 !important;
              line-height: 1.25 !important;
              color: #24292f !important;
            }
            
            .markdown-body h1,
            .markdown-body .prose h1 {
              font-size: 2em !important;
              border-bottom: 1px solid #d0d7de !important;
              padding-bottom: 0.3em !important;
            }
            
            .markdown-body h2,
            .markdown-body .prose h2 {
              font-size: 1.5em !important;
              border-bottom: 1px solid #d0d7de !important;
              padding-bottom: 0.3em !important;
            }
            
            .markdown-body h3,
            .markdown-body .prose h3 {
              font-size: 1.25em !important;
            }
            
            /* List styles */
            .markdown-body ul,
            .markdown-body ol,
            .markdown-body .prose ul,
            .markdown-body .prose ol {
              padding-left: 2em !important;
              margin: 16px 0 !important;
            }
            
            .markdown-body li,
            .markdown-body .prose li {
              margin: 0.25em 0 !important;
            }
            
            /* Paragraph styles */
            .markdown-body p,
            .markdown-body .prose p {
              margin: 16px 0 !important;
              line-height: 1.6 !important;
            }
            
            /* Horizontal rule styles */
            .markdown-body hr,
            .markdown-body .prose hr {
              height: 0.25em !important;
              padding: 0 !important;
              margin: 24px 0 !important;
              background-color: #d0d7de !important;
              border: 0 !important;
            }
            
            /* General markdown body styles */
            .markdown-body,
            .markdown-body .prose {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif !important;
              line-height: 1.6 !important;
              word-wrap: break-word !important;
              color: #24292f !important;
            }
          `}</style>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{ a: MarkdownLink }}
          >
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="text-gray-500">Loading help...</div>
      )}
      <div className="text-gray-500 text-xs mt-4">
        (This help content is loaded from <code>doc/{page}.md</code> and is not user-editable.)
      </div>
    </div>
  );
}