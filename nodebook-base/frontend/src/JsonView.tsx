import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface JsonViewProps {
  data: object;
}

export function JsonView({ data }: JsonViewProps) {
  const [isMobile, setIsMobile] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobile();

    // Check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Editor
      height="100%"
      language="json"
      theme="light"
      value={jsonString}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        lineNumbers: isMobile ? 'off' : 'on',
        lineNumbersMinChars: isMobile ? 0 : 5,
        scrollBeyondLastLine: false,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        renderLineHighlight: isMobile ? 'none' : 'all',
      }}
    />
  );
}
