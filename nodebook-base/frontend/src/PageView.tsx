import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './PageView.module.css';

interface PageViewProps {
  page: string;
  onClose: () => void;
}

export function PageView({ page, onClose }: PageViewProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    const isMarkdown = !page.endsWith('.cnl');
    const fileName = isMarkdown ? `${page}.md` : page;

    fetch(fileName)
      .then(res => res.text())
      .then(text => setContent(text));
  }, [page]);

  const isCnl = page.endsWith('.cnl');

  return (
    <div className={styles.pageViewOverlay} onClick={onClose}>
      <div className={styles.pageViewContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.pageViewCloseBtn} onClick={onClose}>&times;</button>
        {isCnl ? (
          <pre className={styles.cnlView}>{content}</pre>
        ) : (
          <div className={styles.markdownContent}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
