import React from 'react';
import './ImportContextModal.css'; // Re-using the same styles for now

interface SelectGraphModalProps {
  graphIds: string[];
  onSelect: (graphId: string) => void;
  onClose: () => void;
}

export function SelectGraphModal({ graphIds, onSelect, onClose }: SelectGraphModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select a Graph to Compare</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="graph-selection-list">
          <p>This node also exists in the following graphs. Please select one to compare and import from.</p>
          <ul>
            {graphIds.map(id => (
              <li key={id}>
                <button className="graph-select-btn" onClick={() => onSelect(id)}>
                  {id}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
