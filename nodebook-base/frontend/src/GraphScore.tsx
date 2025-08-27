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
import './GraphScore.css';

interface GraphScoreProps {
  score: GraphScoreType;
  graphName?: string;
}

export function GraphScore({ score, graphName }: GraphScoreProps) {
  const scoreDescription = getScoreDescription(score.totalScore);
  const scoreColor = getScoreColor(score.totalScore);

  return (
    <div className="graph-score-container">
      <div className="score-header">
        <h2>📊 Graph Score Analysis</h2>
        {graphName && <p className="graph-name">{graphName}</p>}
        <div className="score-badge">
          <span className="score-label">Tentative Score</span>
          <div className="score-value" style={{ color: scoreColor }}>
            {score.totalScore}
          </div>
          <span className="score-level">{scoreDescription}</span>
        </div>
      </div>

      <div className="score-breakdown">
        <h3>🎯 Score Breakdown</h3>
        
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">🔵</span>
              <span className="item-label">Nodes</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.nodes.count}</span>
              <span className="item-score">+{score.breakdown.nodes.score}</span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">🔗</span>
              <span className="item-label">Relations</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.relations.count}</span>
              <span className="item-score">+{score.breakdown.relations.score}</span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">🏷️</span>
              <span className="item-label">Attributes</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.attributes.count}</span>
              <span className="item-score">+{score.breakdown.attributes.score}</span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">📝</span>
              <span className="item-label">Adjectives</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.adjectives.count}</span>
              <span className="item-score">+{score.breakdown.adjectives.score}</span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">⚡</span>
              <span className="item-label">Adverbs</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.adverbs.count}</span>
              <span className="item-score">+{score.breakdown.adverbs.score}</span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">📊</span>
              <span className="item-label">Quantifiers</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.quantifiers.count}</span>
              <span className="item-score">+{score.breakdown.quantifiers.score}</span>
            </div>
          </div>

          <div className="breakdown-item">
            <div className="item-header">
              <span className="item-icon">🎭</span>
              <span className="item-label">Modality</span>
            </div>
            <div className="item-details">
              <span className="item-count">{score.breakdown.modality.count}</span>
              <span className="item-score">+{score.breakdown.modality.score}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="score-details">
        <h3>🔍 Detailed Analysis</h3>
        
        {score.details.adjectivesFound.length > 0 && (
          <div className="detail-section">
            <h4>📝 Adjectives Found</h4>
            <div className="detail-tags">
              {score.details.adjectivesFound.map((adj, idx) => (
                <span key={idx} className="detail-tag adjective">{adj}</span>
              ))}
            </div>
          </div>
        )}

        {score.details.adverbsFound.length > 0 && (
          <div className="detail-section">
            <h4>⚡ Adverbs Found</h4>
            <div className="detail-tags">
              {score.details.adverbsFound.map((adv, idx) => (
                <span key={idx} className="detail-tag adverb">{adv}</span>
              ))}
            </div>
          </div>
        )}

        {score.details.quantifiersFound.length > 0 && (
          <div className="detail-section">
            <h4>📊 Quantifiers Found</h4>
            <div className="detail-tags">
              {score.details.quantifiersFound.map((quant, idx) => (
                <span key={idx} className="detail-tag quantifier">{quant}</span>
              ))}
            </div>
          </div>
        )}

        {score.details.modalityFound.length > 0 && (
          <div className="detail-section">
            <h4>🎭 Modality Indicators</h4>
            <div className="detail-tags">
              {score.details.modalityFound.map((mod, idx) => (
                <span key={idx} className="detail-tag modality">{mod}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="score-info">
        <h3>ℹ️ Scoring Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Nodes:</strong> 1 point each
          </div>
          <div className="info-item">
            <strong>Relations:</strong> 2 points each
          </div>
          <div className="info-item">
            <strong>Attributes:</strong> 3 points each
          </div>
          <div className="info-item">
            <strong>Adjectives:</strong> +1 point each
          </div>
          <div className="info-item">
            <strong>Adverbs:</strong> +1 point each
          </div>
          <div className="info-item">
            <strong>Quantifiers:</strong> +4 points each
          </div>
          <div className="info-item">
            <strong>Modality:</strong> +4 points each
          </div>
        </div>
        <p className="info-note">
          <strong>Note:</strong> This is a tentative score. Scores will be validated by mentors when user roles are implemented.
        </p>
      </div>
    </div>
  );
}
