# Guide to Succeed in CNL Parsing (TDD Strategy)

This document outlines the strategy for parsing the NodeBook CNL. We will follow a strict Test-Driven Development (TDD) model. For each function, we will first write a test that defines the expected output, and only then will we write the implementation.

**Core Principle:** Write small, focused utility functions that do one thing and do it well.

---

## 1. The Core Data Structure: The Block Tree

The first step is to parse the raw CNL text into a structured tree that represents the visual hierarchy of the document. This is the most critical step.

*   **Function:** `buildStructuralTree(cnlText)`
*   **Input:** The raw CNL string.
*   **Output:** An array of `NodeBlock` objects. Each `NodeBlock` will have the following structure:
    ```json
    {
      "heading": "# Hydrogen [Element]",
      "description": "A chemical element...",
      "content": [ "has number of protons: 1;" ],
      "morphs": [
        {
          "heading": "## Hydrogen ion",
          "description": null,
          "content": [ "has charge: 1;", "<part of> Water;" ]
        }
      ]
    }
    ```

---

## 2. Processing the Tree to Generate Operations

Once we have the `structuralTree`, we will walk it in two passes to generate a flat list of operations.

### Pass 1: Create All Nodes and Morphs

This pass ensures that all entities exist before we try to connect them.

*   **Function:** `generateNodeAndMorphOps(structuralTree)`
*   **Input:** The `structuralTree` from the previous step.
*   **Output:** An array of `addNode` and `addMorph` operations.
    *   **`addNode` Payload:** `{ base_name: "Hydrogen", options: { id: "hydrogen", role: "Element", ... } }`
    *   **`addMorph` Payload:** `{ nodeId: "hydrogen", morphName: "Hydrogen ion" }`

### Pass 2: Create Attributes and Relations

This pass connects the entities created in the first pass.

*   **Function:** `generateNeighborhoodOps(structuralTree)`
*   **Input:** The `structuralTree`.
*   **Output:** An array of `addAttribute` and `addRelation` operations.
    *   **`addAttribute` Payload:** `{ source: "hydrogen", name: "charge", value: "1", options: { morph: "Hydrogen ion" } }`
    *   **`addRelation` Payload:** `{ source: "hydrogen", target: "water", name: "part of", options: { morph: "Hydrogen ion" } }`

---

## 3. Utility Functions

The main functions above will be supported by a set of small, testable utility functions.

### Node Utilities

*   **Function:** `processNodeHeading(headingLine)`
*   **Input:** A string, e.g., `# **Red** Car [Vehicle]`
*   **Output:** `{ id: "red_car", type: "Vehicle", payload: { ... } }`

### Neighborhood Utilities

*   **Function:** `parseAttribute(attributeString)`
*   **Input:** A string, e.g., `has number of protons: 1;`
*   **Output:** `{ name: "number of protons", value: "1" }`

*   **Function:** `parseRelation(relationString)`
*   **Input:** A string, e.g., `<part of> Water;`
*   **Output:** `{ name: "part of", targets: ["Water"] }`

---

## 4. Graph Metadata

This is a separate concern from parsing the CNL content itself, but it is an important part of the overall file format. We will handle this separately after the core parser is complete.

---

This is our finalized plan. I will now proceed with the first step: writing the test for the `buildStructuralTree` function.