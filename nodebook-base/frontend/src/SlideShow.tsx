import React, { useState, useEffect, useMemo } from 'react';
import { NodeCard } from './NodeCard';
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
  const [currentSection, setCurrentSection] = useState<'nodes' | 'relations' | 'attributes'>('nodes');

  // Parse CNL to get the order of nodes
  const orderedNodes = useMemo(() => {
    if (!cnlText) return nodes;
    
    const lines = cnlText.split('\n');
    const nodeOrder: string[] = [];
    
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        const nodeName = line.substring(2).trim();
        const node = nodes.find(n => n.name === nodeName);
        if (node && !nodeOrder.includes(node.id)) {
          nodeOrder.push(node.id);
        }
      }
    });
    
    // Add any remaining nodes that weren't in CNL
    nodes.forEach(node => {
      if (!nodeOrder.includes(node.id)) {
        nodeOrder.push(node.id);
      }
    });
    
    return nodeOrder.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
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
          // Could add a way to exit slideshow mode
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
    <div className="slideshow-container">
      <div className="slideshow-header">
        <h2>SlideShow: {currentNode.name}</h2>
        <div className="slideshow-progress">
          Slide {currentSlideIndex + 1} of {totalSlides}
        </div>
      </div>

      <div className="slideshow-content">
        {/* Left side: Subgraph visualization */}
        <div className="slideshow-subgraph">
          <h3>Graph Context</h3>
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

        {/* Right side: NodeCard */}
        <div className="slideshow-nodecard">
          <NodeCard
            node={currentNode}
            allNodes={nodes}
            allRelations={relations}
            attributes={attributes}
            isActive={true}
            onSelectNode={(nodeId) => {
              const index = orderedNodes.findIndex(n => n.id === nodeId);
              if (index !== -1) setCurrentSlideIndex(index);
            }}
            onImportContext={(nodeId) => console.log('Import context:', nodeId)}
            nodeRegistry={{}}
            isPublic={false}
          />
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
