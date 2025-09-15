import React, { useRef, useEffect, useState } from 'react';
import './DraggableModal.css';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
}

export function DraggableModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  initialPosition = { x: 100, y: 100 } 
}: DraggableModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle modal opening - reset position if needed
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Ensure modal is within viewport bounds
      const modal = modalRef.current;
      const rect = modal.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust if modal goes off-screen
      if (newX + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 20;
      }
      if (newY + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 20;
      }
      if (newX < 20) newX = 20;
      if (newY < 20) newY = 20;

      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isOpen, position]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current?.querySelector('.modal-header')) {
      setIsDragging(true);
      const rect = modalRef.current!.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && modalRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep modal within viewport bounds
      const rect = modalRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const boundedX = Math.max(0, Math.min(newX, viewportWidth - rect.width));
      const boundedY = Math.max(0, Math.min(newY, viewportHeight - rect.height));
      
      setPosition({ x: boundedX, y: boundedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="draggable-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className={`draggable-modal ${isDragging ? 'dragging' : ''}`}
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <div className="modal-header">
          <div className="modal-title">
            {title && <span className="modal-title-text">{title}</span>}
            <div className="modal-drag-handle">⋮⋮</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}

