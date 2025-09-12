# NodeBook CNL Parser Test Cases - Backend Testing Plan

## Overview
This document outlines comprehensive test cases for NodeBook's CNL (Controlled Natural Language) parsing functionality. The CNL parser is the core feature that converts natural language text into graph operations, making it critical to ensure data integrity across all parsing scenarios.

## Test Structure
Each test case follows the format:
- **Input**: CNL text to be parsed
- **Expected Output**: Expected operations array
- **Test Type**: Unit/Integration/Edge Case
- **Priority**: High/Medium/Low

---

## 1. Core Parsing Functions

### 1.1 `getOperationsFromCnl()` Function Tests

#### Test Case 1.1.1: Empty Input
- **Input**: `""`
- **Expected Output**: `[]`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 1.1.2: Null Input
- **Input**: `null`
- **Expected Output**: `[]`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 1.1.3: Undefined Input
- **Input**: `undefined`
- **Expected Output**: `[]`
- **Test Type**: Unit
- **Priority**: High

### 1.2 `buildStructuralTree()` Function Tests

#### Test Case 1.2.1: Single Node
- **Input**: `"# Hydrogen [Element]"`
- **Expected Output**: 
  ```json
  [{
    "heading": "# Hydrogen [Element]",
    "content": []
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 1.2.2: Multiple Nodes
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  has atomic number: 1;
  
  # Oxygen [Element]
  has atomic number: 8;
  ```
- **Expected Output**: Array with 2 node blocks
- **Test Type**: Unit
- **Priority**: High

#### Test Case 1.2.3: Nested Headings (Invalid)
- **Input**: 
  ```cnl
  # Main Topic
  ## Sub Topic
  ### Detail
  ```
- **Expected Output**: Array with 3 separate node blocks (no nesting)
- **Test Type**: Unit
- **Priority**: Medium

---

## 2. Node Creation Tests

### 2.1 Basic Node Creation

#### Test Case 2.1.1: Simple Node
- **Input**: `"# Hydrogen"`
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": {
      "base_name": "Hydrogen",
      "displayName": "Hydrogen",
      "options": {
        "id": "hydrogen",
        "role": "individual",
        "parent_types": [],
        "adjective": null
      }
    },
    "id": "hydrogen"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 2.1.2: Node with Type
- **Input**: `"# Hydrogen [Element]"`
- **Expected Output**: Similar to above but with `role: "Element"`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 2.1.3: Node with Adjective
- **Input**: `"# **female** mathematician [Person]"`
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": {
      "base_name": "mathematician",
      "displayName": "**female** mathematician",
      "options": {
        "id": "female_mathematician",
        "role": "Person",
        "adjective": "female"
      }
    },
    "id": "female_mathematician"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 2.1.4: Node with Complex Name
- **Input**: `"# **theory of** evolution [Concept]"`
- **Expected Output**: Node with adjective "theory of" and base name "evolution"
- **Test Type**: Unit
- **Priority**: High

### 2.2 Node ID Generation

#### Test Case 2.2.1: Special Characters in Name
- **Input**: `"# Node-Name_123 [Type]"`
- **Expected Output**: ID should be `node_name_123`
- **Test Type**: Unit
- **Priority**: Medium

#### Test Case 2.2.2: Multiple Spaces
- **Input**: `"#   Multiple   Spaces   [Type]"`
- **Expected Output**: ID should be `multiple_spaces`
- **Test Type**: Unit
- **Priority**: Medium

#### Test Case 2.2.3: Unicode Characters
- **Input**: `"# Café [Place]"`
- **Expected Output**: ID should handle unicode properly
- **Test Type**: Unit
- **Priority**: Low

---

## 3. Attribute Parsing Tests

### 3.1 Basic Attribute Creation

#### Test Case 3.1.1: Simple Attribute
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  has atomic number: 1;
  ```
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": { /* node payload */ },
    "id": "hydrogen"
  }, {
    "type": "addAttribute",
    "payload": {
      "source": "hydrogen",
      "name": "atomic number",
      "value": "1"
    },
    "id": "attr_hydrogen_atomic_number_[hash]"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.1.2: String Value
- **Input**: 
  ```cnl
  # Person [Person]
  has name: "John Doe";
  ```
- **Expected Output**: Attribute with value `"John Doe"`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.1.3: Numeric Value
- **Input**: 
  ```cnl
  # Earth [Planet]
  has mass: 5.972e24;
  ```
- **Expected Output**: Attribute with numeric value
- **Test Type**: Unit
- **Priority**: High

### 3.2 Attribute Modifiers

#### Test Case 3.2.1: Unit Modifier
- **Input**: 
  ```cnl
  # Earth [Planet]
  has mass: 5.972e24 *kg*;
  ```
- **Expected Output**: Attribute with `unit: "kg"`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.2.2: Adverb Modifier
- **Input**: 
  ```cnl
  # Earth [Planet]
  has mass: ++approximately++ 5.972e24;
  ```
- **Expected Output**: Attribute with `adverb: "approximately"`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.2.3: Modality Modifier
- **Input**: 
  ```cnl
  # Earth [Planet]
  has mass: 5.972e24 [certain];
  ```
- **Expected Output**: Attribute with `modality: "certain"`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.2.4: Quantifier Modifier
- **Input**: 
  ```cnl
  # Earth [Planet]
  has mass: *some* 5.972e24;
  ```
- **Expected Output**: Attribute with `quantifier: "some"`
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.2.5: All Modifiers Combined
- **Input**: 
  ```cnl
  # Earth [Planet]
  has mass: ++approximately++ *some* 5.972e24 *kg* [certain];
  ```
- **Expected Output**: Attribute with all modifiers
- **Test Type**: Unit
- **Priority**: Medium

### 3.3 Complex Attribute Values

#### Test Case 3.3.1: Multi-word Attribute Name
- **Input**: 
  ```cnl
  # Person [Person]
  has date of birth: "1990-01-01";
  ```
- **Expected Output**: Attribute with name "date of birth"
- **Test Type**: Unit
- **Priority**: High

#### Test Case 3.3.2: Attribute with Special Characters
- **Input**: 
  ```cnl
  # Formula [Math]
  has expression: "x^2 + y^2 = z^2";
  ```
- **Expected Output**: Attribute preserving special characters
- **Test Type**: Unit
- **Priority**: Medium

---

## 4. Relation Parsing Tests

### 4.1 Basic Relation Creation

#### Test Case 4.1.1: Simple Relation
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  <is part of> Water;
  ```
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": { /* hydrogen node */ },
    "id": "hydrogen"
  }, {
    "type": "addNode",
    "payload": { /* water node */ },
    "id": "water"
  }, {
    "type": "addRelation",
    "payload": {
      "source": "hydrogen",
      "target": "water",
      "name": "is part of"
    },
    "id": "rel_hydrogen_is_part_of_water"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 4.1.2: Multiple Relations
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  <is part of> Water;
  <is part of> Methane;
  ```
- **Expected Output**: Two relations from hydrogen
- **Test Type**: Unit
- **Priority**: High

#### Test Case 4.1.3: Self-Reference
- **Input**: 
  ```cnl
  # Node [Type]
  <relates to> Node;
  ```
- **Expected Output**: Relation from node to itself
- **Test Type**: Unit
- **Priority**: Medium

### 4.2 Complex Relation Targets

#### Test Case 4.2.1: Target with Adjective
- **Input**: 
  ```cnl
  # Person [Person]
  <is a> **famous** scientist;
  ```
- **Expected Output**: Target node with adjective "famous"
- **Test Type**: Unit
- **Priority**: High

#### Test Case 4.2.2: Target with Type
- **Input**: 
  ```cnl
  # Person [Person]
  <lives in> City [Place];
  ```
- **Expected Output**: Target node with type "Place"
- **Test Type**: Unit
- **Priority**: High

#### Test Case 4.2.3: Multiple Targets in One Relation
- **Input**: 
  ```cnl
  # Person [Person]
  <knows> Alice; Bob; Charlie;
  ```
- **Expected Output**: Three separate relations
- **Test Type**: Unit
- **Priority**: Medium

---

## 5. Function Parsing Tests

### 5.1 Basic Function Creation

#### Test Case 5.1.1: Simple Function
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  has number of protons: 1;
  has function "atomicMass";
  ```
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": { /* hydrogen node */ },
    "id": "hydrogen"
  }, {
    "type": "addAttribute",
    "payload": {
      "source": "hydrogen",
      "name": "number of protons",
      "value": "1"
    },
    "id": "attr_hydrogen_number_of_protons_[hash]"
  }, {
    "type": "applyFunction",
    "payload": {
      "source": "hydrogen",
      "name": "atomicMass"
    },
    "id": "func_hydrogen_atomicmass"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 5.1.2: Multiple Functions
- **Input**: 
  ```cnl
  # Element [Element]
  has function "atomicMass";
  has function "atomicRadius";
  ```
- **Expected Output**: Two function operations
- **Test Type**: Unit
- **Priority**: High

---

## 6. Description Parsing Tests

### 6.1 Node Descriptions

#### Test Case 6.1.1: Simple Description
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  ```description
  A chemical element with atomic number 1.
  ```
  ```
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": { /* hydrogen node */ },
    "id": "hydrogen"
  }, {
    "type": "updateNode",
    "payload": {
      "id": "hydrogen",
      "fields": {
        "description": "A chemical element with atomic number 1."
      }
    },
    "id": "hydrogen_description"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

#### Test Case 6.1.2: Multi-line Description
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  ```description
  A chemical element with atomic number 1.
  It is the lightest element and most abundant
  chemical substance in the universe.
  ```
  ```
- **Expected Output**: Description with newlines preserved
- **Test Type**: Unit
- **Priority**: High

### 6.2 Graph Descriptions

#### Test Case 6.2.1: Graph Description
- **Input**: 
  ```cnl
  ```graph-description
  This graph represents chemical elements and their properties.
  ```
  
  # Hydrogen [Element]
  ```
- **Expected Output**: 
  ```json
  [{
    "type": "updateGraphDescription",
    "payload": {
      "description": "This graph represents chemical elements and their properties."
    },
    "id": "graph_description"
  }, {
    "type": "addNode",
    "payload": { /* hydrogen node */ },
    "id": "hydrogen"
  }]
  ```
- **Test Type**: Unit
- **Priority**: High

---

## 7. Graph Mode Tests

### 7.1 RichGraph Mode (Default)

#### Test Case 7.1.1: Complete RichGraph
- **Input**: 
  ```cnl
  # Hydrogen [Element]
  has atomic number: 1;
  has function "atomicMass";
  <is part of> Water;
  
  # Water [Compound]
  has formula: H2O;
  ```
- **Expected Output**: Full parsing with all features
- **Test Type**: Integration
- **Priority**: High

### 7.2 MindMap Mode

#### Test Case 7.2.1: Basic MindMap
- **Input**: 
  ```cnl
  <! MindMap Mode: contains>
  
  # Main Topic
  ## Subtopic 1
  ### Detail 1.1
  ## Subtopic 2
  ```
- **Expected Output**: 
  ```json
  [{
    "type": "addNode",
    "payload": {
      "base_name": "Main Topic",
      "options": {
        "id": "main_topic",
        "role": "individual",
        "level": 1
      }
    },
    "id": "main_topic"
  }, {
    "type": "addNode",
    "payload": {
      "base_name": "Subtopic 1",
      "options": {
        "id": "subtopic_1",
        "role": "individual",
        "level": 2
      }
    },
    "id": "subtopic_1"
  }, {
    "type": "addRelation",
    "payload": {
      "source": "main_topic",
      "target": "subtopic_1",
      "name": "contains"
    },
    "id": "rel_main_topic_contains_subtopic_1"
  }]
  ```
- **Test Type**: Integration
- **Priority**: High

#### Test Case 7.2.2: MindMap with Descriptions
- **Input**: 
  ```cnl
  <! MindMap Mode: contains>
  
  # Project Planning
  ```description
  A comprehensive project planning mind map.
  ```
  ## Requirements
  ## Timeline
  ```
- **Expected Output**: MindMap with descriptions
- **Test Type**: Integration
- **Priority**: High

#### Test Case 7.2.3: Invalid MindMap (Missing Mode Declaration)
- **Input**: 
  ```cnl
  # Main Topic
  ## Subtopic
  ```
- **Expected Output**: Should throw error or fallback to richgraph
- **Test Type**: Edge Case
- **Priority**: Medium

---

## 8. Error Handling Tests

### 8.1 Invalid Syntax

#### Test Case 8.1.1: Malformed Heading
- **Input**: `"#"`
- **Expected Output**: Should handle gracefully
- **Test Type**: Edge Case
- **Priority**: Medium

#### Test Case 8.1.2: Malformed Attribute
- **Input**: 
  ```cnl
  # Node [Type]
  has invalid attribute
  ```
- **Expected Output**: Should skip invalid attribute
- **Test Type**: Edge Case
- **Priority**: Medium

#### Test Case 8.1.3: Malformed Relation
- **Input**: 
  ```cnl
  # Node [Type]
  <invalid relation
  ```
- **Expected Output**: Should skip invalid relation
- **Test Type**: Edge Case
- **Priority**: Medium

### 8.2 Edge Cases

#### Test Case 8.2.1: Very Long Input
- **Input**: CNL with 10,000+ characters
- **Expected Output**: Should parse without memory issues
- **Test Type**: Performance
- **Priority**: Low

#### Test Case 8.2.2: Special Characters
- **Input**: 
  ```cnl
  # Node with "quotes" and 'apostrophes' [Type]
  has value: "string with \"escaped\" quotes";
  ```
- **Expected Output**: Should handle special characters correctly
- **Test Type**: Edge Case
- **Priority**: Medium

#### Test Case 8.2.3: Empty Lines and Whitespace
- **Input**: 
  ```cnl
  # Node [Type]
  
  
  has value: 1;
  
  
  ```
- **Expected Output**: Should ignore empty lines
- **Test Type**: Edge Case
- **Priority**: Low

---

## 9. CRUD Operation Tests

### 9.1 Create Operations

#### Test Case 9.1.1: Create Node
- **Input**: `"# New Node [Type]"`
- **Expected Output**: `addNode` operation
- **Test Type**: Unit
- **Priority**: High

#### Test Case 9.1.2: Create Attribute
- **Input**: 
  ```cnl
  # Node [Type]
  has new attribute: value;
  ```
- **Expected Output**: `addAttribute` operation
- **Test Type**: Unit
- **Priority**: High

#### Test Case 9.1.3: Create Relation
- **Input**: 
  ```cnl
  # Node A [Type]
  <new relation> Node B;
  ```
- **Expected Output**: `addRelation` operation
- **Test Type**: Unit
- **Priority**: High

### 9.2 Update Operations

#### Test Case 9.2.1: Update Node Description
- **Input**: 
  ```cnl
  # Existing Node [Type]
  ```description
  Updated description.
  ```
  ```
- **Expected Output**: `updateNode` operation
- **Test Type**: Unit
- **Priority**: High

#### Test Case 9.2.2: Update Graph Description
- **Input**: 
  ```cnl
  ```graph-description
  Updated graph description.
  ```
  ```
- **Expected Output**: `updateGraphDescription` operation
- **Test Type**: Unit
- **Priority**: High

### 9.3 Delete Operations (via diffCnl)

#### Test Case 9.3.1: Delete Node
- **Input**: 
  - Old: `"# Node [Type]"`
  - New: `""`
- **Expected Output**: `deleteNode` operation
- **Test Type**: Integration
- **Priority**: High

#### Test Case 9.3.2: Delete Attribute
- **Input**: 
  - Old: 
    ```cnl
    # Node [Type]
    has attribute: value;
    ```
  - New: `"# Node [Type]"`
- **Expected Output**: `deleteAttribute` operation
- **Test Type**: Integration
- **Priority**: High

#### Test Case 9.3.3: Delete Relation
- **Input**: 
  - Old: 
    ```cnl
    # Node A [Type]
    <relation> Node B;
    ```
  - New: `"# Node A [Type]"`
- **Expected Output**: `deleteRelation` operation
- **Test Type**: Integration
- **Priority**: High

---

## 10. Validation Tests

### 10.1 Schema Validation

#### Test Case 10.1.1: Valid Node Type
- **Input**: Node with valid type from schema
- **Expected Output**: No validation errors
- **Test Type**: Integration
- **Priority**: High

#### Test Case 10.1.2: Invalid Node Type
- **Input**: Node with invalid type
- **Expected Output**: Validation error
- **Test Type**: Integration
- **Priority**: High

#### Test Case 10.1.3: Valid Relation Type
- **Input**: Relation with valid type from schema
- **Expected Output**: No validation errors
- **Test Type**: Integration
- **Priority**: High

#### Test Case 10.1.4: Invalid Relation Type
- **Input**: Relation with invalid type
- **Expected Output**: Validation error
- **Test Type**: Integration
- **Priority**: High

#### Test Case 10.1.5: Valid Attribute Type
- **Input**: Attribute with valid type from schema
- **Expected Output**: No validation errors
- **Test Type**: Integration
- **Priority**: High

#### Test Case 10.1.6: Invalid Attribute Type
- **Input**: Attribute with invalid type
- **Expected Output**: Validation error
- **Test Type**: Integration
- **Priority**: High

---

## 11. Performance Tests

### 11.1 Large Document Parsing

#### Test Case 11.1.1: 100 Nodes
- **Input**: CNL with 100 nodes
- **Expected Output**: Should parse within reasonable time (< 1 second)
- **Test Type**: Performance
- **Priority**: Medium

#### Test Case 11.1.2: 1000 Attributes
- **Input**: CNL with 1000 attributes
- **Expected Output**: Should parse within reasonable time (< 5 seconds)
- **Test Type**: Performance
- **Priority**: Low

#### Test Case 11.1.3: 500 Relations
- **Input**: CNL with 500 relations
- **Expected Output**: Should parse within reasonable time (< 3 seconds)
- **Test Type**: Performance
- **Priority**: Low

---

## 12. Integration Tests

### 12.1 End-to-End Parsing

#### Test Case 12.1.1: Complete Graph Creation
- **Input**: Complex CNL with all features
- **Expected Output**: Complete graph data structure
- **Test Type**: Integration
- **Priority**: High

#### Test Case 12.1.2: Graph Update
- **Input**: 
  - Old CNL
  - New CNL with modifications
- **Expected Output**: Diff operations
- **Test Type**: Integration
- **Priority**: High

#### Test Case 12.1.3: Graph Regeneration
- **Input**: CNL text
- **Expected Output**: Fresh graph data
- **Test Type**: Integration
- **Priority**: High

---

## 13. Regression Tests

### 13.1 Previously Fixed Bugs

#### Test Case 13.1.1: Adjective Parsing Bug
- **Input**: `"# **test** node [Type]"`
- **Expected Output**: Correct adjective extraction
- **Test Type**: Regression
- **Priority**: High

#### Test Case 13.1.2: ID Generation Bug
- **Input**: `"# Node Name [Type]"`
- **Expected Output**: Correct ID generation (`node_name`)
- **Test Type**: Regression
- **Priority**: High

#### Test Case 13.1.3: Modifier Order Bug
- **Input**: 
  ```cnl
  # Node [Type]
  has value: ++adverb++ *unit* 123 [modality];
  ```
- **Expected Output**: Correct modifier extraction
- **Test Type**: Regression
- **Priority**: Medium

---

## 14. Test Implementation Notes

### 14.1 Test Framework
- Use Jest for unit tests
- Use Supertest for integration tests
- Use performance testing tools for load tests

### 14.2 Test Data
- Create test fixtures for common CNL patterns
- Use realistic data from actual NodeBook usage
- Include edge cases and error scenarios

### 14.3 Test Coverage
- Aim for 100% line coverage on core parsing functions
- Test all code paths including error handling
- Include negative test cases

### 14.4 Test Organization
- Group tests by function/feature
- Use descriptive test names
- Include setup/teardown for integration tests

---

## 15. Priority Implementation Order

### Phase 1 (Critical - Week 1)
1. Basic node creation tests (1.1.1 - 1.1.4)
2. Basic attribute parsing tests (3.1.1 - 3.1.3)
3. Basic relation parsing tests (4.1.1 - 4.1.2)
4. Error handling tests (8.1.1 - 8.1.3)
5. CRUD operation tests (9.1.1 - 9.1.3)

### Phase 2 (Important - Week 2)
1. Attribute modifier tests (3.2.1 - 3.2.5)
2. Complex relation tests (4.2.1 - 4.2.3)
3. Description parsing tests (6.1.1 - 6.2.1)
4. MindMap mode tests (7.2.1 - 7.2.2)
5. Validation tests (10.1.1 - 10.1.6)

### Phase 3 (Enhancement - Week 3)
1. Function parsing tests (5.1.1 - 5.1.2)
2. Edge case tests (8.2.1 - 8.2.3)
3. Performance tests (11.1.1 - 11.1.3)
4. Integration tests (12.1.1 - 12.1.3)
5. Regression tests (13.1.1 - 13.1.3)

---

## 16. Success Criteria

### 16.1 Test Coverage
- [ ] 100% line coverage on `cnl-parser.js`
- [ ] 100% branch coverage on critical functions
- [ ] All edge cases covered

### 16.2 Performance
- [ ] Parse 100 nodes in < 1 second
- [ ] Parse 1000 attributes in < 5 seconds
- [ ] Memory usage stays within reasonable limits

### 16.3 Data Integrity
- [ ] No data loss during parsing
- [ ] All operations generated correctly
- [ ] Proper error handling for invalid input

### 16.4 Regression Prevention
- [ ] All previously fixed bugs have tests
- [ ] New features don't break existing functionality
- [ ] Performance doesn't degrade over time

---

This comprehensive test plan ensures that NodeBook's CNL parsing functionality is thoroughly tested across all scenarios, maintaining data integrity and providing confidence in the system's reliability.
