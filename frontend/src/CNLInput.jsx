import React, { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useUserId } from "./UserIdContext";

export default function CNLInput({ graphId }) {
  const userId = useUserId();
  const [cmlMd, setCnlMd] = useState('');

  useEffect(() => {
    async function fetchCnlMd() {
      // Fetch the generated CNL.md for the graph (should be generated server-side or in DisplayHTML/NodeCard logic)
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl_md`);
      if (res.ok) {
        const text = await res.text();
        setCnlMd(text);
      } else {
        setCnlMd('# No CNL.md available for this graph.');
      }
    }
    if (userId && graphId) fetchCnlMd();
  }, [userId, graphId]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 text-lg font-semibold">CNL (NodeBook Markdown)</div>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="markdown"
          value={cmlMd}
          options={{ readOnly: true, wordWrap: 'on' }}
        />
      </div>
    </div>
  );
}



