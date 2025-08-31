import { LanguageSupport, StreamLanguage } from '@codemirror/language';

// Simple CNL Stream Parser
const cnlParser = {
  startState: () => ({ inHeading: false, inDescription: false, inAttribute: false }),
  
  token: (stream: any, state: any) => {
    // Skip whitespace
    if (stream.eatSpace()) return null;
    
    // Node headings: # NodeName [Type]
    if (stream.match(/^#+\s/)) {
      state.inHeading = true;
      return 'heading';
    }
    
    // Description blocks: ```description ... ```
    if (stream.match(/^```(description|graph-description)/)) {
      state.inDescription = true;
      return 'comment';
    }
    
    if (stream.match(/^```/)) {
      state.inDescription = false;
      return 'comment';
    }
    
    if (state.inDescription) {
      stream.skipToEnd();
      return 'comment';
    }
    
    // Relations: <relation> target;
    if (stream.match(/^</)) {
      state.inAttribute = false;
      return 'operator';
    }
    
    if (stream.match(/^>/)) {
      return 'operator';
    }
    
    // Attributes: has name: value *unit* [modality];
    if (stream.match(/^has\s+/)) {
      state.inAttribute = true;
      return 'keyword';
    }
    
    if (state.inAttribute && stream.match(/^:/)) {
      return 'punctuation';
    }
    
    // Units: *unit*
    if (stream.match(/^\*[^*]+\*/)) {
      return 'unit';
    }
    
    // Modalities: [modality]
    if (stream.match(/^\[[^\]]+\]/)) {
      return 'modality';
    }
    
    // Adjectives: **adjective**
    if (stream.match(/^\*\*[^*]+\*\*/)) {
      return 'emphasis';
    }
    
    // Quantifiers: ++quantifier++
    if (stream.match(/^\+\+[^+]+\+\+/)) {
      return 'quantifier';
    }
    
    // Semicolons
    if (stream.match(/^;/)) {
      state.inAttribute = false;
      return 'punctuation';
    }
    
    // Node types in brackets: [Type]
    if (stream.match(/^\[[^\]]+\]/)) {
      return 'typeName';
    }
    
    // Default text
    stream.next();
    return 'text';
  }
};

// CNL Language Support
export function cnl() {
  return StreamLanguage.define(cnlParser);
}

// CNL Syntax Highlighting Rules
export const cnlHighlightStyle = [
  { tag: 'heading', color: '#2563eb', fontWeight: 'bold' },
  { tag: 'keyword', color: '#2563eb' },
  { tag: 'operator', color: '#dc2626' },
  { tag: 'unit', color: '#dc2626' },
  { tag: 'modality', color: '#ea580c' },
  { tag: 'emphasis', color: '#dc2626', fontStyle: 'italic' },
  { tag: 'quantifier', color: '#ea580c' },
  { tag: 'typeName', color: '#7c3aed' },
  { tag: 'comment', color: '#6b7280', fontStyle: 'italic' },
  { tag: 'punctuation', color: '#6b7280' },
  { tag: 'text', color: '#111827' }
];
