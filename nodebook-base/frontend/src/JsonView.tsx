import React, { useState, useEffect } from 'react';
import { CNLEditor } from './CNLEditorComponent';

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
    <CNLEditor
      value={jsonString}
      onChange={() => {}} // Read-only, no onChange needed
      language="json"
      readOnly={true}
      placeholder="JSON data will appear here..."
    />
  );
}
