# NodeBook CNL (Controlled Natural Language) Guide

This document outlines the syntax for creating and modifying knowledge graphs in NodeBook using the CNL.

---

## 1. Graph Modes

NodeBook supports multiple graph creation modes, each designed for different use cases and complexity levels.

### MindMap Mode 🧠
**Purpose**: Beginner-friendly hierarchical organization and brainstorming

**Declaration**:
```cnl
<! MindMap Mode: relation_type>
```

**Syntax**: Use markdown headings for hierarchy
```cnl
<! MindMap Mode: contains>

# Main Topic
## Subtopic 1
### Detail 1.1
### Detail 1.2
## Subtopic 2
### Detail 2.1

# Another Topic
## Related Concept
```

**Features**:
- **Automatic Relations**: Creates parent-child relationships based on heading levels
- **Descriptions**: Add descriptions using fenced blocks
- **Simple Structure**: No complex syntax required

**Description Blocks**:
```cnl
# Project Planning
```description
This is a comprehensive project planning mind map
covering all aspects of development.
```
## Requirements
## Timeline
## Resources
```

### ConceptMap Mode 💡
**Purpose**: Concept relationships and connections

**Syntax**: Enhanced CNL with explicit relations
```cnl
# Concept A [Concept]
<relates to> Concept B;
<influences> Concept C;

# Concept B [Concept]
<supports> Concept A;
```

### TransitionMap Mode ⚡
**Purpose**: Process flows and state changes

**Syntax**: Prior state → Transition → Post state
```cnl
# Chemical Reaction [Transition]
<has prior_state> Reactant A;
<has prior_state> Reactant B;
<has post_state> Product C;
<has post_state> Product D;
```

### FunctionMap Mode ⚙️
**Purpose**: Computational relationships and derived values

**Syntax**: Functions with expressions and scopes
```cnl
# Element [Element]
has number of protons: 5;
has number of neutrons: 6;
has function "atomicMass";
```

---

## 2. Defining Nodes

### Node Creation and Typing
To define a node and assign its type, use a markdown heading with the `NodeType` in square brackets.

```cnl
# India [Country]
# Newton [Person]
# Water [Substance]
```
**Note:** In Strict Mode, providing a valid `NodeType` is mandatory.

### Adjectives
To add an adjective to a node, use markdown bold (`**adjective**`).

```cnl
# **female** mathematician [Person]
# **theory of** evolution [Concept]
```

---

## 3. Defining Relations

Relations connect two nodes and must use the angle bracket syntax.

### Basic Syntax
`<relation name> Target Node`

```cnl
# India [Country]
<has capital> Delhi [City]
```

### Transition Relations
For process flows and state changes:

```cnl
# Process [Transition]
<has prior_state> Input State;
<has prior_state> Condition;
<has post_state> Output State;
<has post_state> Byproduct;
```

### Modifiers
- **Adverb:** Use `++adverb++` before the relation.
- **Modality:** Use `[modality]` after the relation.
- **Quantifier:** Use `*quantifier*` before the target node.

```cnl
# Nepal [Country]
++friendly++ <neighbor of> [likely] *some* citizens of India
```

---

## 4. Defining Attributes

Attributes assign a literal value to a node. They must start with `has` and use a colon.

### Basic Syntax
`has attribute name: value`

```cnl
# Earth [Planet]
has color: blue
has mass: 5.972e24
```

### Modifiers
- **Unit:** Use `*unit*` after the value.
- **Adverb:** Use `++adverb++` before the value.
- **Modality:** Use `[modality]` at the end of the line.

```cnl
# Earth [Planet]
has mass: ++approximately++ 5.972e24 *kg* [certain]
```

---

## 5. Defining Functions

Functions create derived attributes based on mathematical expressions.

### Function Syntax
`has function "functionName";`

```cnl
# Hydrogen [Element]
has number of protons: 1;
has number of neutrons: 0;
has function "atomicMass";
```

### How Functions Work
1. **Function Lookup**: Finds the function in the schema
2. **Attribute Resolution**: Locates required attributes on the node
3. **Expression Evaluation**: Computes the result using math.js
4. **Derived Attribute**: Creates a new attribute marked as derived

### Available Functions
- **`atomicMass`**: Calculates atomic mass (protons + neutrons)
- **Scope**: `Element` and `class` node types
- **Expression**: `"number of protons" + "number of neutrons"`

### Function Requirements
- **Node Type**: Must match the function's scope
- **Required Attributes**: Must have all attributes referenced in the expression
- **Numeric Values**: Attributes should contain numbers for calculations

---

## 6. Defining Sub-Types

To define a new `NodeType` that is a sub-type of another, use the `<is a type of>` relation. This will automatically infer that both the source and target are of type `class`.

```cnl
# Scientist [class]
<is a type of> Person [class]
```

---

## 7. Adding Descriptions

To add rich, multi-line markdown descriptions to a node, use a fenced code block with the `description` tag.

```cnl
# NodeBook [Concept]
```description
NodeBook is a peer-to-peer, collaborative graph authoring tool.
```
```

---

## 8. Mode-Specific Features

### MindMap Mode
- **Hierarchical Structure**: Use heading levels (#, ##, ###) for organization
- **Automatic Relations**: Parent-child relationships created automatically
- **Descriptions**: Optional descriptions for each node
- **Simple Syntax**: Minimal CNL syntax required

### Transition Mode
- **Process Definition**: Define inputs, conditions, and outputs
- **State Changes**: Clear before/after state representation
- **Multiple Inputs/Outputs**: Support for complex processes
- **Chemical Reactions**: Ideal for scientific modeling

### Function Mode
- **Mathematical Expressions**: Support for complex calculations
- **Derived Values**: Automatic computation of dependent attributes
- **Scope Validation**: Ensures functions apply to appropriate node types
- **Real-time Updates**: Recalculates when source attributes change

---

## 9. Examples

### MindMap Example
```cnl
<! MindMap Mode: contains>

# Project Planning
```description
Software development project planning
```
## Requirements
### Functional Requirements
### Non-Functional Requirements
## Design
### Architecture
### UI/UX
## Implementation
### Frontend
### Backend
## Testing
### Unit Tests
### Integration Tests
```

### Transition Example
```cnl
# Photosynthesis [Transition]
<has prior_state> Carbon Dioxide;
<has prior_state> Water;
<has prior_state> Sunlight;
<has post_state> Glucose;
<has post_state> Oxygen;
```

### Function Example
```cnl
# Carbon [Element]
has number of protons: 6;
has number of neutrons: 6;
has function "atomicMass";
```

---

## 10. Best Practices

1. **Choose the Right Mode**: Start simple with MindMap, progress to more complex modes
2. **Consistent Naming**: Use clear, descriptive names for nodes and relations
3. **Proper Typing**: Always specify node types in strict mode
4. **Descriptive Relations**: Use meaningful relation names
5. **Organized Structure**: Group related concepts together
6. **Documentation**: Add descriptions for complex nodes
7. **Validation**: Test your CNL syntax before submitting

---

## 11. Getting Help

- **Examples**: Check the Examples section in Help
- **Schema**: Review available node types, relation types, and functions
- **Validation**: Use strict mode to catch syntax errors
- **Community**: Join discussions on GitHub for support

---

**Ready to create your first graph?** Start with MindMap mode for simple hierarchies, then explore the more advanced modes as you become comfortable with the syntax!
