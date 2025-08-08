import React from 'react';
import Editor from '@monaco-editor/react';

interface JsonViewProps {
  data: object;
}

export function JsonView({ data }: JsonViewProps) {
  const jsonString = JSON.stringify(data, null, 2);

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
      }}
    />
  );
}
