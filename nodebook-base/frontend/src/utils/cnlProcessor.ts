/**
 * CNL (Conceptual Notation Language) Processing Utilities
 * Handles automatic formatting and enhancement of CNL text
 */

export interface CNLNode {
  name: string;
  description?: string;
  attributes: Array<{ key: string; value: string }>;
  relations: Array<{ target: string; type: string }>;
}

/**
 * Ensures every node in CNL text has a description block
 * Format: ```description (empty content between markers)
 */
export function ensureDescriptionBlocks(cnlText: string): string {
  const lines = cnlText.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // If this is a node definition (markdown heading with optional type)
    if (trimmedLine.startsWith('#')) {
      processedLines.push(line);
      
      // Check if this node already has a description block
      if (!hasDescriptionBlock(lines, i)) {
        // Add description block after the node line
        processedLines.push('```description');
        processedLines.push('');
        processedLines.push('```');
      }
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}

/**
 * Checks if a node already has a description block
 */
function hasDescriptionBlock(lines: string[], nodeIndex: number): boolean {
  // Look ahead from the node line to see if there's already a description block
  for (let i = nodeIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // If we hit another node, stop looking
    if (line.startsWith('#')) {
      break;
    }
    
    // If we find a description block, return true
    if (line === '```description') {
      return true;
    }
  }
  
  return false;
}

/**
 * Extracts all description text from CNL for NLP analysis
 */
export function extractDescriptionsForAnalysis(cnlText: string): string[] {
  const descriptions: string[] = [];
  const lines = cnlText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // If we find a description block start
    if (line === '```description') {
      // Collect all text until the closing ```
      let descriptionText = '';
      let j = i + 1;
      
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Stop if we hit the closing ```
        if (nextLine === '```') {
          break;
        }
        
        if (nextLine) {
          descriptionText += (descriptionText ? ' ' : '') + nextLine;
        }
        
        j++;
      }
      
      if (descriptionText.trim()) {
        descriptions.push(descriptionText.trim());
      }
    }
  }
  
  return descriptions;
}

/**
 * Validates CNL syntax and returns any errors
 */
export function validateCNLSyntax(cnlText: string): string[] {
  const errors: string[] = [];
  const lines = cnlText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Check node definitions (markdown headings)
    if (trimmedLine.startsWith('#')) {
      // Check if node has description block
      if (!hasDescriptionBlock(lines, i)) {
        errors.push(`Line ${i + 1}: Node missing description block`);
      }
    }
    
    // Check attribute definitions
    if (trimmedLine.startsWith('  ') && trimmedLine.includes(':')) {
      const parts = trimmedLine.split(':');
      if (parts.length !== 2) {
        errors.push(`Line ${i + 1}: Invalid attribute format - should be 'key: value'`);
      }
    }
  }
  
  return errors;
}

/**
 * Formats CNL text with consistent indentation and spacing
 */
export function formatCNL(cnlText: string): string {
  const lines = cnlText.split('\n');
  const formattedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      formattedLines.push('');
      continue;
    }
    
    if (trimmedLine.startsWith('#')) {
      formattedLines.push(trimmedLine);
    } else if (trimmedLine === '```description') {
      formattedLines.push(trimmedLine);
    } else if (trimmedLine.startsWith('  ')) {
      // Preserve existing indentation for attributes
      formattedLines.push(trimmedLine);
    } else if (trimmedLine.includes(':')) {
      // Add indentation for attributes
      formattedLines.push('  ' + trimmedLine);
    } else {
      formattedLines.push(trimmedLine);
    }
  }
  
  return formattedLines.join('\n');
}

/**
 * Counts nodes in CNL text
 */
export function countNodes(cnlText: string): number {
  const lines = cnlText.split('\n');
  return lines.filter(line => line.trim().startsWith('#')).length;
}

/**
 * Counts description blocks in CNL text
 */
export function countDescriptions(cnlText: string): number {
  const lines = cnlText.split('\n');
  return lines.filter(line => line.trim() === '```description').length;
}

/**
 * Debug function to show what's being extracted
 */
export function debugDescriptions(cnlText: string): void {
  const descriptions = extractDescriptionsForAnalysis(cnlText);
  console.log('=== CNL Description Debug ===');
  console.log('Total lines:', cnlText.split('\n').length);
  console.log('Description blocks found:', countDescriptions(cnlText));
  console.log('Descriptions extracted:', descriptions.length);
  descriptions.forEach((desc, index) => {
    console.log(`Description ${index + 1} (${desc.split(' ').length} words):`, desc);
  });
  console.log('============================');
}
