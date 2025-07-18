/**
 * Parse markdown-style links in text, with special support for graph links
 * Supports: [Link Text](graph:graphId) and [Link Text](#/app?graph=graphId)
 */

export const parseMarkdownLinks = (text) => {
  if (!text) return text;
  
  // Parse markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  return text.replace(linkRegex, (match, linkText, linkUrl) => {
    // Handle graph links
    if (linkUrl.startsWith('graph:')) {
      const graphId = linkUrl.replace('graph:', '');
      return `<a href="#/app?graph=${graphId}" class="graph-link text-blue-600 hover:text-blue-800 underline">${linkText}</a>`;
    }
    
    // Handle internal app links
    if (linkUrl.startsWith('#/')) {
      return `<a href="${linkUrl}" class="internal-link text-blue-600 hover:text-blue-800 underline">${linkText}</a>`;
    }
    
    // Handle external links
    if (linkUrl.startsWith('http')) {
      return `<a href="${linkUrl}" class="external-link text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
    }
    
    // Keep other links as-is
    return match;
  });
};

/**
 * Convert text with markdown links to HTML
 */
export const markdownToHtml = (text) => {
  if (!text) return text;
  
  let html = text;
  
  // Parse markdown links
  html = parseMarkdownLinks(html);
  
  // Convert line breaks to <br> tags
  html = html.replace(/\n/g, '<br>');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return html;
};

/**
 * Extract graph IDs from markdown text
 */
export const extractGraphLinks = (text) => {
  if (!text) return [];
  
  const graphLinks = [];
  const linkRegex = /\[([^\]]+)\]\(graph:([^)]+)\)/g;
  
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    graphLinks.push({
      text: match[1],
      graphId: match[2]
    });
  }
  
  return graphLinks;
};

/**
 * Create a markdown link for a graph
 */
export const createGraphLink = (text, graphId) => {
  return `[${text}](graph:${graphId})`;
}; 