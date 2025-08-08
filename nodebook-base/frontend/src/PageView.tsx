import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface PageViewProps {
  page: string;
  onClose: () => void;
}

export function PageView({ page, onClose }: PageViewProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(`/${page}.md`)
      .then(res => res.text())
      .then(text => setContent(text));
  }, [page]);

  return (
    <div className="page-view-overlay" onClick={onClose}>
      <div className="page-view-content" onClick={(e) => e.stopPropagation()}>
        <button className="page-view-close-btn" onClick={onClose}>&times;</button>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
