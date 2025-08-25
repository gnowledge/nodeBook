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
  const [currentPage, setCurrentPage] = useState(page);
  const [pageHistory, setPageHistory] = useState<string[]>([]);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage]);

  const loadPage = (pageName: string) => {
    setIsLoading(true);
    setError(null);
    
    // Determine the correct file path based on the page name
    let fileName: string;
    if (pageName === 'About') {
      fileName = 'About.md';
    } else if (pageName === 'Help') {
      fileName = 'Help.md';
    } else if (pageName === 'Schema-Guide') {
      fileName = 'Schema-Guide.md';
    } else if (pageName === 'CNL-Help') {
      fileName = 'CNL-Help.md';
    } else if (pageName.endsWith('.cnl')) {
      fileName = pageName;
    } else {
      fileName = `${pageName}.md`;
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
  };

  const handlePageNavigation = (newPage: string) => {
    // Add current page to history
    setPageHistory(prev => [...prev, currentPage]);
    setCurrentPage(newPage);
  };

  const handleBackNavigation = () => {
    if (pageHistory.length > 0) {
      const previousPage = pageHistory[pageHistory.length - 1];
      setPageHistory(prev => prev.slice(0, -1));
      setCurrentPage(previousPage);
    }
  };

  const isCnl = currentPage.endsWith('.cnl');

  // Custom components for ReactMarkdown to handle links
  const components = {
    a: ({ href, children, ...props }: any) => {
      // Check if this is a relative markdown link
      if (href && href.startsWith('./') && href.endsWith('.md')) {
        const pageName = href.replace('./', '').replace('.md', '');
        return (
          <button
            {...props}
            className={styles.markdownLink}
            onClick={() => handlePageNavigation(pageName)}
          >
            {children}
          </button>
        );
      }
      
      // External links open in new tab
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return (
          <a
            {...props}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            {children}
          </a>
        );
      }
      
      // Default link behavior
      return <a {...props} href={href}>{children}</a>;
    }
  };

  return (
    <div className={styles.pageViewOverlay} onClick={onClose}>
      <div className={styles.pageViewContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.pageViewHeader}>
          <div className={styles.pageViewHeaderLeft}>
            {pageHistory.length > 0 && (
              <button 
                onClick={handleBackNavigation}
                className={styles.backButton}
                title="Go back"
              >
                ← Back
              </button>
            )}
            <h2 className={styles.pageViewTitle}>
              {currentPage === 'About' ? 'About NodeBook' : 
               currentPage === 'Help' ? 'Help & Documentation' :
               currentPage === 'Schema-Guide' ? 'Schema Guide' :
               currentPage === 'CNL-Help' ? 'CNL Syntax Guide' :
               currentPage}
            </h2>
          </div>
          <button className={styles.pageViewCloseBtn} onClick={onClose} title="Close">
            &times;
          </button>
        </div>
        
        <div className={styles.pageViewBody}>
          {isLoading && (
            <div className={styles.pageViewLoading}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading {currentPage}...</p>
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
                  <ReactMarkdown components={components}>{content}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
