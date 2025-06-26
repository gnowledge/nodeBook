// Utility functions for generating normalized IDs from names

// Normalize a string to create a valid ID
export const normalizeToId = (name) => {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and common separators with underscores
    .replace(/[\s\-_]+/g, '_')
    // Remove special characters except underscores
    .replace(/[^a-z0-9_]/g, '')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure it's not empty
    .replace(/^$/, 'unnamed');
};

// Generate a transition ID from name and optional adjective
export const generateTransitionId = (name, adjective = '') => {
  if (!name || typeof name !== 'string') {
    return 'transition_' + Date.now();
  }
  
  let baseId = normalizeToId(name);
  
  if (adjective && typeof adjective === 'string') {
    const normalizedAdjective = normalizeToId(adjective);
    if (normalizedAdjective) {
      baseId = `${normalizedAdjective}_${baseId}`;
    }
  }
  
  return baseId || 'transition_' + Date.now();
};

// Generate a node ID from name and optional qualifier
export const generateNodeId = (name, qualifier = '') => {
  if (!name || typeof name !== 'string') {
    return 'node_' + Date.now();
  }
  
  let baseId = normalizeToId(name);
  
  if (qualifier && typeof qualifier === 'string') {
    const normalizedQualifier = normalizeToId(qualifier);
    if (normalizedQualifier) {
      baseId = `${baseId}_${normalizedQualifier}`;
    }
  }
  
  return baseId || 'node_' + Date.now();
}; 