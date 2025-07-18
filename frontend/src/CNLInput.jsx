import React, { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useUserInfo } from "./UserIdContext";
import { useDifficulty } from "./DifficultyContext";
import { getApiBase } from "./config";

export default function CNLInput({ graphId, graph, rawMarkdown, onGraphUpdate }) {
  const { userId } = useUserInfo();
  const { restrictions } = useDifficulty();
  const [cnlMd, setCnlMd] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCnlMd() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch the generated CNL.md from the backend
        const res = await fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/cnl_md`);
        if (res.ok) {
          const text = await res.text();
          setCnlMd(text);
        } else {
          // If the endpoint doesn't exist or fails, show a helpful message
          setCnlMd(`# CNL (Controlled Natural Language) Guide

This file shows examples of how to write CNL based on your graph structure.

## Basic Syntax

### Relations
\`\`\`
<relation_name> target_node
\`\`\`

### Attributes
\`\`\`
has attribute_name: value
\`\`\`

### Examples
\`\`\`
heart <pumps> blood
heart has color: red
\`\`\`

## Difficulty Levels

### Easy Level
- Basic relations: \`<relation> target\`
- Simple attributes: \`has attribute: value\`

### Moderate Level
- Add qualifiers: \`**qualifier** <relation> target\`
- Add units: \`has attribute: value *unit*\`

### Advanced Level
- Add adverbs: \`++adverb++ <relation> target\`
- Add quantifiers: \`*quantifier* <relation> target\`

### Expert Level
- Add modality: \`[modality] <relation> target\`
- Complex combinations: \`[likely] ++efficiently++ <pumps> *all* **red** blood\`

*This file will be populated with examples from your graph data when you add nodes and relationships.*`);
        }
      } catch (error) {
        console.error('Failed to fetch CNL.md:', error);
        setError('Failed to load CNL guide');
        setCnlMd(`# CNL (Controlled Natural Language) Guide

*Loading CNL examples...*

If this message persists, please check your connection and try refreshing the page.`);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (userId && graphId) {
      fetchCnlMd();
    }
  }, [userId, graphId]);

  // Refresh CNL.md when graph updates
  useEffect(() => {
    if (onGraphUpdate) {
      const handleGraphUpdate = () => {
        // Refetch CNL.md when graph is updated
        if (userId && graphId) {
          fetch(`${getApiBase()}/api/ndf/users/${userId}/graphs/${graphId}/cnl_md`)
            .then(res => res.ok ? res.text() : null)
            .then(text => {
              if (text) {
                setCnlMd(text);
              }
            })
            .catch(err => console.error('Failed to refresh CNL.md:', err));
        }
      };
      
      // Listen for graph updates
      window.addEventListener('graph-updated', handleGraphUpdate);
      return () => window.removeEventListener('graph-updated', handleGraphUpdate);
    }
  }, [userId, graphId, onGraphUpdate]);

  const canEdit = restrictions.canEditCNL;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div className="text-lg font-semibold">CNL (Controlled Natural Language) Guide</div>
        <div className="text-sm text-gray-600">
          {canEdit ? (
            <span className="text-green-600">✓ CNL editing available</span>
          ) : (
            <span className="text-orange-600">Read-only guide</span>
          )}
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="px-4 py-2 bg-blue-100 text-blue-700 text-sm border-b">
          Loading CNL examples...
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-100 text-red-700 text-sm border-b">
          ✗ {error}
        </div>
      )}
      
      {/* Info message */}
      <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs border-b">
        <strong>CNL Guide:</strong> This read-only file shows examples of how to write CNL based on your graph structure. 
        Use these patterns as a reference for writing CNL in node neighborhoods (Advanced/Expert users only).
      </div>
      
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="markdown"
          value={cnlMd}
          options={{ 
            readOnly: true, // Always read-only
            wordWrap: 'on',
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            folding: true,
            renderWhitespace: 'none',
            scrollBeyondLastLine: false
          }}
        />
      </div>
      
      {/* Footer with difficulty info */}
      <div className="p-2 bg-gray-50 text-xs text-gray-600 border-t">
        <div className="flex justify-between items-center">
          <div>
            <strong>CNL Editing:</strong>
            <span className="ml-2">
              {canEdit 
                ? "Available for Advanced/Expert users in node neighborhoods" 
                : "Requires Advanced or Expert difficulty level"
              }
            </span>
          </div>
          <div>
            <strong>Current Level:</strong> {restrictions.difficulty || 'Easy'}
          </div>
        </div>
      </div>
    </div>
  );
}



