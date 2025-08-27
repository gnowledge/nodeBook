import React, { useState, useEffect, useMemo } from 'react';
import { Subgraph } from './Subgraph';
import type { Node, Edge, AttributeType } from './types';
import './SlideShow.css';

interface SlideShowProps {
  nodes: Node[];
  relations: Edge[];
  attributes: AttributeType[];
  cnlText: string;
}

export function SlideShow({ nodes, relations, attributes, cnlText }: SlideShowProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Parse CNL to get the exact order of nodes as specified by user
  const orderedNodes = useMemo(() => {
    if (!cnlText) return nodes;
    
    const lines = cnlText.split('\n');
    const nodeOrder: string[] = [];
    
    // First pass: collect nodes in exact CNL order
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        const nodeName = line.substring(2).trim();
        const node = nodes.find(n => n.name === nodeName);
        if (node && !nodeOrder.includes(node.id)) {
          nodeOrder.push(node.id);
        }
      }
    });
    
    // Only add remaining nodes if they weren't in CNL at all
    // This preserves the user's intended order
    const cnlNodeIds = new Set(nodeOrder);
    const remainingNodes = nodes.filter(node => !cnlNodeIds.has(node.id));
    
    return [...nodeOrder.map(id => nodes.find(n => n.id === id)!).filter(Boolean), ...remainingNodes];
  }, [cnlText, nodes]);

  const currentNode = orderedNodes[currentSlideIndex];
  const totalSlides = orderedNodes.length;

  // Navigation functions
  const goToNext = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToTopSection = () => {
    setCurrentSlideIndex(0);
  };

  const goToBottomSection = () => {
    setCurrentSlideIndex(totalSlides - 1);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowUp':
          event.preventDefault();
          goToTopSection();
          break;
        case 'ArrowDown':
          event.preventDefault();
          goToBottomSection();
          break;
        case 'Escape':
          event.preventDefault();
          if (isFullScreen) {
            setIsFullScreen(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlideIndex, totalSlides]);

  if (!currentNode) {
    return (
      <div className="slideshow-container">
        <div className="slideshow-empty">
          <h2>No nodes to display</h2>
          <p>Create some nodes in your graph to start the slideshow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`slideshow-container ${isFullScreen ? 'fullscreen' : ''}`}>
      <div className="slideshow-header">
        <h2>SlideShow: {currentNode.name}</h2>
        <div className="slideshow-controls">
          <div className="slideshow-progress">
            Slide {currentSlideIndex + 1} of {totalSlides}
          </div>
          <button 
            className="fullscreen-btn" 
            onClick={toggleFullScreen}
            title={isFullScreen ? "Exit full screen (Esc)" : "Enter full screen"}
          >
            {isFullScreen ? "⛶" : "⛶"}
          </button>
        </div>
      </div>

      <div className="slideshow-content">
        {/* Left side: Graph visualization */}
        <div className="slideshow-graph">
          <h3>Graph Visualization</h3>
          <Subgraph 
            nodes={[currentNode, ...nodes.filter(n => 
              relations.some(r => 
                (r.source_id === currentNode.id && r.target_id === n.id) ||
                (r.target_id === currentNode.id && r.source_id === n.id)
              )
            )]} 
            relations={relations.filter(r => 
              r.source_id === currentNode.id || r.target_id === currentNode.id
            )} 
          />
        </div>

        {/* Right side: Enhanced NodeCard information */}
        <div className="slideshow-nodeinfo">
          <div className="node-header">
            <h3 className="node-name">{currentNode.name}</h3>
            <div className="node-role">{currentNode.role}</div>
          </div>
          
          {currentNode.description && (
            <div className="node-description">
              <h4>Description</h4>
              <p>{currentNode.description}</p>
            </div>
          )}

          {/* Node attributes with larger font */}
          <div className="node-attributes">
            <h4>Attributes</h4>
            <div className="attributes-list">
              {attributes && attributes.length > 0 ? (
                attributes.filter(attr => 
                  attr.scope && (
                    attr.scope.includes(currentNode.role) || 
                    attr.scope.includes('all')
                  )
                ).map(attr => (
                  <div key={attr.name} className="attribute-item">
                    <span className="attr-name">{attr.name}:</span>
                    <span className="attr-value">[Click to view]</span>
                  </div>
                ))
              ) : (
                <div className="no-attributes">No attributes defined for this node type</div>
              )}
            </div>
          </div>

          {/* Node relations with larger font */}
          <div className="node-relations">
            <h4>Relations</h4>
            <div className="relations-list">
              {relations && relations.length > 0 ? (
                relations.filter(rel => 
                  rel.source_id === currentNode.id || rel.target_id === currentNode.id
                ).map(rel => {
                  const targetNode = nodes.find(n => 
                    n.id === (rel.source_id === currentNode.id ? rel.target_id : rel.source_id)
                  );
                  return (
                    <div key={rel.id} className="relation-item">
                      <span className="rel-name">{rel.name}</span>
                      <span className="rel-arrow">→</span>
                      <span className="rel-target">{targetNode?.name || rel.target_id}</span>
                    </div>
                  );
                })
              ) : (
                <div className="no-relations">No relations defined for this node</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="slideshow-navigation">
        <button 
          className="nav-btn nav-top" 
          onClick={goToTopSection}
          title="Go to first slide (↑)"
        >
          ↑
        </button>
        <button 
          className="nav-btn nav-prev" 
          onClick={goToPrevious}
          disabled={currentSlideIndex === 0}
          title="Previous slide (←)"
        >
          ←
        </button>
        <button 
          className="nav-btn nav-next" 
          onClick={goToNext}
          disabled={currentSlideIndex === totalSlides - 1}
          title="Next slide (→)"
        >
          →
        </button>
        <button 
          className="nav-btn nav-bottom" 
          onClick={goToBottomSection}
          title="Go to last slide (↓)"
        >
          ↓
        </button>
      </div>

      {/* Slide indicator */}
      <div className="slideshow-indicator">
        {orderedNodes.map((_, index) => (
          <div
            key={index}
            className={`indicator-dot ${index === currentSlideIndex ? 'active' : ''}`}
            onClick={() => setCurrentSlideIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
