import React from 'react';
import { getScoreDescription, getScoreColor } from './utils/graphScoring';

// Define the type locally to avoid import issues
interface GraphScoreType {
  totalScore: number;
  breakdown: {
    nodes: { count: number; score: number };
    relations: { count: number; score: number };
    attributes: { count: number; score: number };
    adjectives: { count: number; score: number };
    adverbs: { count: number; score: number };
    quantifiers: { count: number; score: number };
    modality: { count: number; score: number };
  };
  details: {
    nodeTitles: string[];
    relationTexts: string[];
    attributeTexts: string[];
    adjectivesFound: string[];
    adverbsFound: string[];
    quantifiersFound: string[];
    modalityFound: string[];
  };
}
import './CompactScoreDisplay.css';

interface CompactScoreDisplayProps {
  score: GraphScoreType;
  isVisible: boolean;
}

export function CompactScoreDisplay({ score, isVisible }: CompactScoreDisplayProps) {
  if (!isVisible) return null;
  
  const scoreDescription = getScoreDescription(score.totalScore);
  const scoreColor = getScoreColor(score.totalScore);

  return (
    <div className="compact-score-display">
      <div className="score-indicator">
        <span className="score-label">Tentative Score</span>
        <div className="score-main">
          <span className="score-value" style={{ color: scoreColor }}>
            {score.totalScore}
          </span>
          <span className="score-level">{scoreDescription}</span>
        </div>
      </div>
      
      <div className="score-summary">
        <div className="summary-item">
          <span className="summary-icon">🔵</span>
          <span className="summary-count">{score.breakdown.nodes.count}</span>
        </div>
        <div className="summary-item">
          <span className="summary-icon">🔗</span>
          <span className="summary-count">{score.breakdown.relations.count}</span>
        </div>
        <div className="summary-item">
          <span className="summary-icon">🏷️</span>
          <span className="summary-count">{score.breakdown.attributes.count}</span>
        </div>
      </div>
    </div>
  );
}
