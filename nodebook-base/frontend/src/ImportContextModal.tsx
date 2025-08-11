import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import './ImportContextModal.css';

interface ImportContextModalProps {
  sourceCnl: string;
  targetCnl: string;
  sourceGraphId: string;
  targetGraphId: string;
  onClose: () => void;
  onMerge: (selectedLines: string) => void;
}

export function ImportContextModal({ sourceCnl, targetCnl, sourceGraphId, targetGraphId, onClose, onMerge }: ImportContextModalProps) {
  const [selectedSourceLines, setSelectedSourceLines] = useState<string[]>([]);
  const [selectedTargetLines, setSelectedTargetLines] = useState<string[]>([]);

  const handleSourceCheckboxChange = (line: string) => {
    setSelectedSourceLines(prev =>
      prev.includes(line)
        ? prev.filter(l => l !== line)
        : [...prev, line]
    );
  };

  const handleTargetCheckboxChange = (line: string) => {
    setSelectedTargetLines(prev =>
      prev.includes(line)
        ? prev.filter(l => l !== line)
        : [...prev, line]
    );
  };

  const handleCopy = () => {
    const mergedLines = [...selectedTargetLines, ...selectedSourceLines].join('\n');
    onMerge(mergedLines);
  };

  const renderCnlPane = (title: string, cnl: string, selectedLines: string[], onCheckboxChange: (line: string) => void) => (
    <div className="cnl-pane">
      <h3>{title}</h3>
      <div className="cnl-lines">
        {cnl.split('\n').map((line, i) => (
          <div key={i} className="cnl-line">
            <input 
              type="checkbox" 
              checked={selectedLines.includes(line)}
              onChange={() => onCheckboxChange(line)} 
            />
            <pre>{line}</pre>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Compare & Merge Node Context</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="cnl-diff-view">
          {renderCnlPane(`From ${sourceGraphId} (Source)`, sourceCnl, selectedSourceLines, handleSourceCheckboxChange)}
          {renderCnlPane(`In ${targetGraphId} (Target)`, targetCnl, selectedTargetLines, handleTargetCheckboxChange)}
        </div>
        <div className="modal-footer">
            <button className="merge-btn" onClick={handleCopy} disabled={selectedSourceLines.length === 0 && selectedTargetLines.length === 0}>
                Copy to Target Editor
            </button>
        </div>
      </div>
    </div>
  );
}