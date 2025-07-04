// Test script to verify the new scoring system
// This is a simplified test that simulates the scoring logic

const RUBRIC = {
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

// Mock graph data for testing
const testGraph = {
  nodes: [
    {
      id: "water",
      name: "water",
      role: "individual",
      attributes: [
        { name: "temperature", value: "20", unit: "celsius" },
        { name: "color", value: "blue", qualifier: "deep" },
        { name: "volume", value: "100", unit: "liters", quantifier: "all" },
        { name: "purity", value: "99%", modality: "probably", inferred: true },
        { name: "density", value: "1.0", unit: "g/cm³", derived: true }
      ],
      relations: [
        { name: "flows_into", target: "river", qualifier: "slowly" },
        { name: "evaporates", target: "air", quantifier: "some", modality: "possibly" },
        { name: "contains", target: "minerals", logical_connective: "and" },
        { name: "supports", target: "life", inferred: true }
      ],
      morphs: [
        { morph_id: "basic_water", name: "basic" },
        { morph_id: "liquid_water", name: "liquid" },
        { morph_id: "solid_water", name: "solid" }
      ]
    },
    {
      id: "evaporation",
      name: "evaporation",
      role: "individual",
      attributes: [
        { name: "rate", value: "5", unit: "ml/hour" }
      ]
    },
    {
      id: "calculate_density",
      name: "calculate_density",
      role: "individual",
      attributes: [
        { name: "formula", value: "mass/volume", derived: true }
      ]
    }
  ],
  // Add graph-level relations and attributes (polymorphic data structure)
  relations: [
    {
      id: "rel1",
      name: "catalyzes",
      source_id: "water",
      target_id: "evaporation",
      adverb: "efficiently",
      modality: "typically"
    },
    {
      id: "rel2", 
      name: "inhibits",
      source_id: "evaporation",
      target_id: "calculate_density",
      quantifier: "sometimes",
      logical_connective: "or"
    }
  ],
  attributes: [
    {
      id: "attr1",
      name: "global_temperature",
      value: "298.15",
      unit: "K",
      qualifier: "standard",
      modality: "measured"
    },
    {
      id: "attr2",
      name: "system_entropy",
      value: "increasing",
      derived: true,
      source: "function"
    }
  ],
  // Removed transitions and functions arrays to avoid double-counting
  // These would be counted as transition/function nodes if they were actual nodes
};

function computeStats(graph, crossGraphReuseCount = 0) {
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

console.log("Testing new scoring system...");
console.log("RUBRIC:", RUBRIC);

const stats = computeStats(testGraph, 2); // 2 cross-graph reuses

console.log("\nComputed Statistics:");
console.log("Basic Elements:");
console.log(`  Nodes: ${stats.nodeCount} (${stats.nodeCount * RUBRIC.node} pts)`);
console.log(`  Relations: ${stats.relationCount} (${stats.relationCount * RUBRIC.relation} pts)`);
console.log(`  Attributes: ${stats.attributeCount} (${stats.attributeCount * RUBRIC.attribute} pts)`);

console.log("\nEnhanced Attributes:");
console.log(`  Attributes with Units: ${stats.attributeWithUnitCount} (${stats.attributeWithUnitCount * RUBRIC.attributeWithUnit} pts)`);

console.log("\nQualifiers & Modifiers:");
console.log(`  Relations with Qualifier: ${stats.relationWithQualifierCount} (${stats.relationWithQualifierCount * RUBRIC.relationWithQualifier} pts)`);
console.log(`  Attributes with Qualifier: ${stats.attributeWithQualifierCount} (${stats.attributeWithQualifierCount * RUBRIC.attributeWithQualifier} pts)`);

console.log("\nQuantifiers & Modality:");
console.log(`  Quantified Elements: ${stats.quantifiedCount} (${stats.quantifiedCount * RUBRIC.quantified} pts)`);
console.log(`  Modality: ${stats.modalityCount} (${stats.modalityCount * RUBRIC.modality} pts)`);

console.log("\nInferred Elements:");
console.log(`  Inferred Relations: ${stats.inferredRelationCount} (${stats.inferredRelationCount * RUBRIC.inferredRelation} pts)`);
console.log(`  Inferred Attributes: ${stats.inferredAttributeCount} (${stats.inferredAttributeCount * RUBRIC.inferredAttribute} pts)`);

console.log("\nAdvanced Node Types:");
console.log(`  Transition Nodes: ${stats.transitionNodeCount} (${stats.transitionNodeCount * RUBRIC.transitionNode} pts)`);
console.log(`  PolyNode Morphs: ${stats.polyNodeMorphCount} (${stats.polyNodeMorphCount * RUBRIC.polyNodeMorph} pts)`);
console.log(`  Function Nodes: ${stats.functionNodeCount} (${stats.functionNodeCount * RUBRIC.functionNode} pts)`);

console.log("\nCross-Graph Reuse:");
console.log(`  Cross-Graph Reuse: ${stats.crossGraphReuseCount} (${stats.crossGraphReuseCount * RUBRIC.crossGraphReuse} pts)`);

console.log("\nLogical Composition:");
console.log(`  Logical Connectives: ${stats.logicalConnectiveCount} (${stats.logicalConnectiveCount * RUBRIC.logicalConnective} pts)`);

console.log("\nPathway Composition:");
console.log(`  Pathway Nodes: ${stats.pathwayNodeCount} (${stats.pathwayNodeCount * RUBRIC.pathwayNode} pts)`);

console.log("\nDerived Attributes:");
console.log(`  Derived Attributes: ${stats.derivedAttributeCount} (${stats.derivedAttributeCount * RUBRIC.derivedAttribute} pts)`);

console.log(`\n🎉 TOTAL SCORE: ${stats.total} points`);

// Expected calculation:
// Basic: 3 nodes (3) + 6 relations (12) + 9 attributes (27) = 42
// Enhanced: 5 attributes with units (20) = 20
// Qualifiers: 2 relation qualifiers (4) + 2 attribute qualifiers (4) = 8
// Quantifiers: 3 quantified (15) + 4 modality (20) = 35
// Inferred: 1 inferred relation (2) + 1 inferred attribute (2) = 4
// Advanced: 0 transitions (0) + 2 morphs (10) + 0 functions (0) = 10
// Cross-graph: 2 reuses (20) = 20
// Logical: 2 connectives (20) = 20
// Pathway: 6 pathway nodes (60) = 60
// Derived: 3 derived attributes (30) = 30
// Total: 42 + 20 + 8 + 35 + 4 + 10 + 20 + 20 + 60 + 30 = 249

console.log("\nExpected total: 249 points");
console.log(`✅ Test ${stats.total === 249 ? 'PASSED' : 'FAILED'}`); 