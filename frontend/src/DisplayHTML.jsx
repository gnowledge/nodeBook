import React, { useEffect, useState } from 'react';
import { marked } from 'marked';

export default function DisplayHTML({ userId, graphId }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    async function fetchMarkdown() {
      try {
        const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl`);
        let raw = await res.text();

        // Unquote JSON-wrapped text
        if (raw.startsWith('"') && raw.endsWith('"')) {
          raw = raw.slice(1, -1);
          raw = raw.replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }

        // 🔄 Preprocess :::cnl ... ::: into ```cnl ... ```
        const preprocessed = raw.replace(/:::cnl\s*([\s\S]*?):::/g, (_, codeBlock) => {
          return `\`\`\`cnl\n${codeBlock.trim()}\n\`\`\``;
        });

        // 🔧 Custom renderer
        const renderer = new marked.Renderer();
renderer.code = (codeObj, infostring = '') => {
  const lang = (infostring || '').trim();

  // Support both legacy string + modern object styles
  const code =
    typeof codeObj === 'string'
      ? codeObj
      : typeof codeObj?.text === 'string'
      ? codeObj.text
      : JSON.stringify(codeObj, null, 2); // fallback

  const rawCode = String(code || '');

  if (lang === 'cnl') {
    const encoded = encodeURIComponent(rawCode);
    const escapedCode = rawCode
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `
      <div class="my-4 p-4 border rounded bg-gray-100">
        <pre class="text-sm text-gray-800"><code>:::cnl\n${escapedCode}\n:::</code></pre>
        <div class="mt-2 text-xs text-gray-500 italic">[subgraph rendering placeholder]</div>
        <div data-cnl-block="${encoded}" class="subgraph-placeholder"></div>
      </div>`;
  }

  const escaped = rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
};
        const rendered = marked.parse(preprocessed, { renderer });
        setHtml(rendered);
      } catch (err) {
        console.error("Failed to render cnl.md:", err);
        setHtml('<p class="text-red-500">Error loading content.</p>');
      }
    }

    fetchMarkdown();
  }, [userId, graphId]);

  return (
    <div className="prose max-w-full px-4">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
