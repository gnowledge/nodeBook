import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './PageView.module.css';

interface PageViewProps {
  page: string;
  onClose: () => void;
}

export function PageView({ page, onClose }: PageViewProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // Determine the correct file path based on the page name
    let fileName: string;
    if (page === 'About') {
      fileName = 'About.md';
    } else if (page === 'Help') {
      fileName = 'Help.md';
    } else if (page === 'Schema-Guide') {
      fileName = 'Schema-Guide.md';
    } else if (page === 'CNL-Help') {
      fileName = 'CNL-Help.md';
    } else if (page.endsWith('.cnl')) {
      fileName = page;
    } else {
      fileName = `${page}.md`;
    }

    // Fetch from the public directory
    fetch(`/${fileName}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load ${fileName}: ${res.status} ${res.statusText}`);
        }
        return res.text();
      })
      .then(text => {
        setContent(text);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading page:', err);
        setError(`Failed to load ${fileName}. Please check the file exists.`);
        setIsLoading(false);
      });
  }, [page]);

  const isCnl = page.endsWith('.cnl');

  return (
    <div className={styles.pageViewOverlay} onClick={onClose}>
      <div className={styles.pageViewContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.pageViewHeader}>
          <h2 className={styles.pageViewTitle}>
            {page === 'About' ? 'About NodeBook' : 
             page === 'Help' ? 'Help & Documentation' :
             page === 'Schema-Guide' ? 'Schema Guide' :
             page === 'CNL-Help' ? 'CNL Syntax Guide' :
             page}
          </h2>
          <button className={styles.pageViewCloseBtn} onClick={onClose} title="Close">
            &times;
          </button>
        </div>
        
        <div className={styles.pageViewBody}>
          {isLoading && (
            <div className={styles.pageViewLoading}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading {page}...</p>
            </div>
          )}
          
          {error && (
            <div className={styles.pageViewError}>
              <p>❌ {error}</p>
              <button onClick={onClose} className={styles.errorCloseBtn}>
                Return to App
              </button>
            </div>
          )}
          
          {!isLoading && !error && (
            <>
              {isCnl ? (
                <pre className={styles.cnlView}>{content}</pre>
              ) : (
                <div className={styles.markdownContent}>
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
