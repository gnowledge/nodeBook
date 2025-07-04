// statisticsUtils.js
// Utility for computing graph statistics (moved from Statistics.jsx)

export const RUBRIC = {
  // Basic elements
  node: 1,
  relation: 2,
  attribute: 3,
  
  // Enhanced attributes
  attributeWithUnit: 4,
  
  // Qualifiers and modifiers
  relationWithQualifier: 2,
  attributeWithQualifier: 2,
  
  // Quantifiers and modality
  quantified: 5,
  modality: 5,
  
  // Inferred elements
  inferredRelation: 2,
  inferredAttribute: 2,
  
  // Advanced node types
  transitionNode: 10,
  polyNodeMorph: 5,
  functionNode: 10,
  
  // Cross-graph reuse
  crossGraphReuse: 10,
  
  // Logical composition
  logicalConnective: 10,
  
  // Pathway composition
  pathwayNode: 10,
  
  // Derived attributes
  derivedAttribute: 10,
};

export function computeStats(graph, crossGraphReuseCount = 0) {
  if (!graph || !graph.nodes) return null;
  
  // Basic counts
  let nodeCount = 0;
  let relationCount = 0;
  let attributeCount = 0;
  
  // Enhanced attributes
  let attributeWithUnitCount = 0;
  
  // Qualifiers and modifiers
  let relationWithQualifierCount = 0;
  let attributeWithQualifierCount = 0;
  
  // Quantifiers and modality
  let quantifiedCount = 0;
  let modalityCount = 0;
  
  // Inferred elements
  let inferredRelationCount = 0;
  let inferredAttributeCount = 0;
  
  // Advanced node types
  let transitionNodeCount = 0;
  let polyNodeMorphCount = 0;
  let functionNodeCount = 0;
  
  // Logical composition
  let logicalConnectiveCount = 0;
  
  // Pathway composition
  let pathwayNodeCount = 0;
  
  // Derived attributes
  let derivedAttributeCount = 0;

  // Process nodes
  for (const node of graph.nodes) {
    nodeCount++;
    
    // Check for advanced node types
    if (node.role === 'process' || node.type === 'transition') {
      transitionNodeCount++;
    }
    if (node.role === 'function' || node.type === 'function') {
      functionNodeCount++;
    }
    
    // Check for polymorphic nodes with morphs
    if (node.morphs && node.morphs.length > 1) {
      polyNodeMorphCount += node.morphs.length - 1; // Count additional morphs beyond basic
    }
    
    // Process attributes
    if (node.attributes) {
      for (const attr of node.attributes) {
        attributeCount++;
        
        // Check for units
        if (attr.unit) {
          attributeWithUnitCount++;
        }
        
        // Check for qualifiers
        if (attr.qualifier || attr.adverb) {
          attributeWithQualifierCount++;
        }
        
        // Check for quantifiers
        if (attr.quantifier) {
          quantifiedCount++;
        }
        
        // Check for modality
        if (attr.modality) {
          modalityCount++;
        }
        
        // Check for inferred attributes
        if (attr.inferred || attr.source === 'inference') {
          inferredAttributeCount++;
        }
        
        // Check for derived attributes
        if (attr.derived || attr.source === 'function') {
          derivedAttributeCount++;
        }
      }
    }
    
    // Process relations
    if (node.relations) {
      for (const rel of node.relations) {
        relationCount++;
        
        // Check for qualifiers
        if (rel.qualifier || rel.adverb) {
          relationWithQualifierCount++;
        }
        
        // Check for quantifiers
        if (rel.quantifier) {
          quantifiedCount++;
        }
        
        // Check for modality
        if (rel.modality) {
          modalityCount++;
        }
        
        // Check for logical connectives
        if (rel.logical_connective) {
          logicalConnectiveCount++;
        }
        
        // Check for inferred relations
        if (rel.inferred || rel.source === 'inference') {
          inferredRelationCount++;
        }
      }
    }
  }
  
  // Process graph-level relations (polymorphic data structure)
  if (graph.relations) {
    for (const rel of graph.relations) {
      relationCount++;
      
      // Check for qualifiers
      if (rel.qualifier || rel.adverb) {
        relationWithQualifierCount++;
      }
      
      // Check for quantifiers
      if (rel.quantifier) {
        quantifiedCount++;
      }
      
      // Check for modality
      if (rel.modality) {
        modalityCount++;
      }
      
      // Check for logical connectives
      if (rel.logical_connective) {
        logicalConnectiveCount++;
      }
      
      // Check for inferred relations
      if (rel.inferred || rel.source === 'inference') {
        inferredRelationCount++;
      }
    }
  }
  
  // Process graph-level attributes (polymorphic data structure)
  if (graph.attributes) {
    for (const attr of graph.attributes) {
      attributeCount++;
      
      // Check for units
      if (attr.unit) {
        attributeWithUnitCount++;
      }
      
      // Check for qualifiers
      if (attr.qualifier || attr.adverb) {
        attributeWithQualifierCount++;
      }
      
      // Check for quantifiers
      if (attr.quantifier) {
        quantifiedCount++;
      }
      
      // Check for modality
      if (attr.modality) {
        modalityCount++;
      }
      
      // Check for inferred attributes
      if (attr.inferred || attr.source === 'inference') {
        inferredAttributeCount++;
      }
      
      // Check for derived attributes
      if (attr.derived || attr.source === 'function') {
        derivedAttributeCount++;
      }
    }
  }
  
  // Process transitions (if they exist in the graph)
  if (graph.transitions) {
    for (const transition of graph.transitions) {
      transitionNodeCount++;
      
      // Count pathway nodes in transitions
      if (transition.pathway && Array.isArray(transition.pathway)) {
        pathwayNodeCount += transition.pathway.length;
      }
    }
  }
  
  // Process functions (if they exist in the graph)
  if (graph.functions) {
    for (const func of graph.functions) {
      functionNodeCount++;
      
      // Count pathway nodes in functions
      if (func.pathway && Array.isArray(func.pathway)) {
        pathwayNodeCount += func.pathway.length;
      }
    }
  }

  // Total score calculation
  const total =
    nodeCount * RUBRIC.node +
    relationCount * RUBRIC.relation +
    attributeCount * RUBRIC.attribute +
    attributeWithUnitCount * RUBRIC.attributeWithUnit +
    relationWithQualifierCount * RUBRIC.relationWithQualifier +
    attributeWithQualifierCount * RUBRIC.attributeWithQualifier +
    quantifiedCount * RUBRIC.quantified +
    modalityCount * RUBRIC.modality +
    inferredRelationCount * RUBRIC.inferredRelation +
    inferredAttributeCount * RUBRIC.inferredAttribute +
    transitionNodeCount * RUBRIC.transitionNode +
    polyNodeMorphCount * RUBRIC.polyNodeMorph +
    functionNodeCount * RUBRIC.functionNode +
    crossGraphReuseCount * RUBRIC.crossGraphReuse +
    logicalConnectiveCount * RUBRIC.logicalConnective +
    pathwayNodeCount * RUBRIC.pathwayNode +
    derivedAttributeCount * RUBRIC.derivedAttribute;

  return {
    // Basic counts
    nodeCount,
    relationCount,
    attributeCount,
    
    // Enhanced attributes
    attributeWithUnitCount,
    
    // Qualifiers and modifiers
    relationWithQualifierCount,
    attributeWithQualifierCount,
    
    // Quantifiers and modality
    quantifiedCount,
    modalityCount,
    
    // Inferred elements
    inferredRelationCount,
    inferredAttributeCount,
    
    // Advanced node types
    transitionNodeCount,
    polyNodeMorphCount,
    functionNodeCount,
    
    // Cross-graph reuse
    crossGraphReuseCount,
    
    // Logical composition
    logicalConnectiveCount,
    
    // Pathway composition
    pathwayNodeCount,
    
    // Derived attributes
    derivedAttributeCount,
    
    // Total score
    total,
  };
}
