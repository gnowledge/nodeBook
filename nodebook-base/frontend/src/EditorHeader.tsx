import React, { useState } from 'react';
import styles from './App.module.css';

interface EditorHeaderProps {
  graphName: string;
  graphId?: string;
  graphMode: string;
  onGraphModeChange?: (mode: string) => void;
  onVersionControlOpen?: () => void;
  enableCollaboration: boolean;
  onCollaborationToggle?: (enabled: boolean) => void;
  userId?: string;
  disabled?: boolean;
  isWordNetLoading?: boolean;
  isNLPLoading?: boolean;
  value?: string;
  onAutoInsertDescriptions?: () => void;
  onWordNetAutoDescription?: () => void;
  onNLPParse?: () => void;
}

export function EditorHeader({
  graphName,
  graphId,
  graphMode,
  onGraphModeChange,
  onVersionControlOpen,
  enableCollaboration,
  onCollaborationToggle,
  userId,
  disabled = false,
  isWordNetLoading = false,
  isNLPLoading = false,
  value = '',
  onAutoInsertDescriptions,
  onWordNetAutoDescription,
  onNLPParse
}: EditorHeaderProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const DropdownMenu = ({ title, icon, items, isOpen, onToggle, align = 'left', compact = false }: {
    title: string;
    icon: string;
    items: Array<{ label: string; icon: string; onClick: () => void; disabled?: boolean; title?: string }>;
    isOpen: boolean;
    onToggle: () => void;
    align?: 'left' | 'right';
    compact?: boolean;
  }) => (
    <div className={`dropdown-container ${align === 'right' ? 'align-right' : ''}`}>
      <button
        className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title={title}
        style={compact ? {
          padding: '6px',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          marginRight: '4px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          background: '#fff',
          cursor: 'pointer',
          color: '#333'
        } : {}}
      >
        {icon} {!compact && `${title} ▼`}
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {items.map((item, index) => (
            <button
              key={index}
              className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onToggle();
                }
              }}
              disabled={item.disabled}
              title={item.title}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.editorHeaderWithMenu}>
      <div className={styles.editorTitleSection}>
        <h3>Working on: {graphName}</h3>
      </div>
      <div className={styles.editorMenuSection}>
        <DropdownMenu
          title="Menu"
          icon="☰"
          isOpen={activeDropdown === 'menu'}
          onToggle={() => setActiveDropdown(activeDropdown === 'menu' ? null : 'menu')}
          align="right"
          compact={true}
          items={[
            { label: '— Mode —', icon: '', onClick: () => {}, disabled: true },
            { label: `${graphMode === 'markdown' ? '✓ ' : ''}Markdown`, icon: '📝', onClick: () => onGraphModeChange && onGraphModeChange('markdown'), disabled: !graphId },
            { label: `${graphMode === 'mindmap' ? '✓ ' : ''}MindMap`, icon: '🧠', onClick: () => onGraphModeChange && onGraphModeChange('mindmap'), disabled: !graphId },
            { label: `${graphMode === 'richgraph' ? '✓ ' : ''}RichGraph`, icon: '🔗', onClick: () => onGraphModeChange && onGraphModeChange('richgraph'), disabled: !graphId },
            { label: `${graphMode === 'strictgraph' ? '✓ ' : ''}StrictGraph`, icon: '✅', onClick: () => onGraphModeChange && onGraphModeChange('strictgraph'), disabled: !graphId },
            { label: '— Version —', icon: '', onClick: () => {}, disabled: true },
            { label: 'View History', icon: '📜', onClick: () => { if (graphId) { onVersionControlOpen && onVersionControlOpen(); setActiveDropdown(null); } }, disabled: !graphId, title: graphId ? 'View version history' : 'No graph selected' },
            { label: 'Compare Versions', icon: '🔍', onClick: () => console.log('Compare versions - coming soon'), disabled: !graphId },
            { label: '— Tools —', icon: '', onClick: () => {}, disabled: true },
            { label: 'Auto-Insert Descriptions', icon: '📝', onClick: () => onAutoInsertDescriptions && onAutoInsertDescriptions() },
            { label: 'WordNet Definitions', icon: '📚', onClick: () => onWordNetAutoDescription && onWordNetAutoDescription(), disabled: disabled || isWordNetLoading || !value.trim() },
            { label: 'Parse Descriptions', icon: '🧠', onClick: () => onNLPParse && onNLPParse(), disabled: disabled || isNLPLoading || !value.trim() },
            { label: '— Collaboration —', icon: '', onClick: () => {}, disabled: true },
            { label: enableCollaboration ? 'Disable Live' : 'Enable Live', icon: '👥', onClick: () => { if (onCollaborationToggle) onCollaborationToggle(!enableCollaboration); }, disabled: !(graphId && userId) },
            { label: 'Share (View link)', icon: '🔗', onClick: async () => {
                if (!graphId) return;
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`/api/collab/${graphId}/invite`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'view' })
                  });
                  if (res.ok) {
                    const { token: inviteToken } = await res.json();
                    const link = `${window.location.origin}/#collab:${inviteToken}:${graphId}`;
                    await navigator.clipboard.writeText(link);
                    alert('View link copied to clipboard');
                  } else {
                    alert('Failed to create view link');
                  }
                } catch (e) {
                  alert('Error creating view link');
                }
              }, disabled: !graphId },
            { label: 'Share (Edit link)', icon: '✍️', onClick: async () => {
                if (!graphId) return;
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`/api/collab/${graphId}/invite`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'edit' })
                  });
                  if (res.ok) {
                    const { token: inviteToken } = await res.json();
                    const link = `${window.location.origin}/#collab:${inviteToken}:${graphId}`;
                    await navigator.clipboard.writeText(link);
                    alert('Edit link copied to clipboard');
                  } else {
                    alert('Failed to create edit link');
                  }
                } catch (e) {
                  alert('Error creating edit link');
                }
              }, disabled: !graphId }
          ]}
        />
      </div>
    </div>
  );
}
