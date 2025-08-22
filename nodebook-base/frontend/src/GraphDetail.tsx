import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Graph } from './types';
import styles from './GraphDetail.module.css';

interface GraphDetailProps {
  graph: Graph | null;
}

export function GraphDetail({ graph }: GraphDetailProps) {
  if (!graph) {
    return null;
  }

  return (
    <div className={styles.graphDetail}>
      <h2>{graph.name}</h2>
      {graph.description && (
        <div className={styles.description}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{graph.description}</ReactMarkdown>
        </div>
      )}
      <div className={styles.metadata}>
        <span><strong>Author:</strong> {graph.author || 'N/A'}</span>
        <span><strong>Email:</strong> {graph.email || 'N/A'}</span>
        <span><strong>Created:</strong> {new Date(graph.createdAt).toLocaleString()}</span>
        <span><strong>Updated:</strong> {new Date(graph.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}