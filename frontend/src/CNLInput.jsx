import React, { useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useUserInfo } from "./UserIdContext";
import { useDifficulty } from "./DifficultyContext";

export default function CNLInput({ graphId, graph, rawMarkdown, onGraphUpdate }) {
  const { userId } = useUserInfo();
  const { restrictions } = useDifficulty();
  const [cmlMd, setCnlMd] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'

  useEffect(() => {
    async function fetchCnlMd() {
      // Fetch the generated CNL.md for the graph (should be generated server-side or in DisplayHTML/NodeCard logic)
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl_md`);
      if (res.ok) {
        const text = await res.text();
        setCnlMd(text);
        setEditValue(text);
      } else {
        setCnlMd('# No CNL.md available for this graph.');
        setEditValue('# No CNL.md available for this graph.');
      }
    }
    if (userId && graphId) fetchCnlMd();
  }, [userId, graphId]);

  const handleEdit = () => {
    setEditValue(cmlMd);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(cmlMd);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ndf/users/${userId}/graphs/${graphId}/cnl_md`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${token}`
        },
        body: editValue
      });
      
      if (res.ok) {
        setCmlMd(editValue);
        setIsEditing(false);
        setSaveStatus('saved');
        if (onGraphUpdate) onGraphUpdate();
        
        // Clear saved status after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        throw new Error('Failed to save CNL');
      }
    } catch (error) {
      console.error('Failed to save CNL:', error);
      setSaveStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  const canEdit = restrictions.canEditCNL;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div className="text-lg font-semibold">CNL (NodeBook Markdown)</div>
        {canEdit && !isEditing && (
          <button
            onClick={handleEdit}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Edit
          </button>
        )}
        {canEdit && isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saveStatus === 'saving'}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      {/* Save status indicator */}
      {saveStatus === 'saved' && (
        <div className="px-4 py-2 bg-green-100 text-green-700 text-sm border-b">
          ✓ CNL saved successfully!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="px-4 py-2 bg-red-100 text-red-700 text-sm border-b">
          ✗ Failed to save CNL. Please try again.
        </div>
      )}
      
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="markdown"
          value={isEditing ? editValue : cmlMd}
          onChange={isEditing ? setEditValue : undefined}
          options={{ 
            readOnly: !isEditing, 
            wordWrap: 'on',
            minimap: { enabled: false }
          }}
        />
      </div>
      
      {/* Info message for read-only mode */}
      {!canEdit && (
        <div className="p-2 bg-blue-50 text-blue-700 text-xs border-t">
          CNL editing is available at Advanced and Expert difficulty levels.
        </div>
      )}
    </div>
  );
}



