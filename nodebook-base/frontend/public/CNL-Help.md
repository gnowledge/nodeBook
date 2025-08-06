# NodeBook CNL (Controlled Natural Language) Guide

This document outlines the syntax for creating and modifying knowledge graphs in NodeBook using the CNL.

---

## 1. Defining Nodes

### Node Creation and Typing
To define a node and assign its type, use a markdown heading with the `NodeType` in square brackets.

```cnl
# India [Country]
# Newton [Person]
```
**Note:** In Strict Mode, providing a valid `NodeType` is mandatory.

### Adjectives
To add an adjective to a node, use markdown bold (`**adjective**`).

```cnl
# **female** mathematician [Person]
# **theory of** evolution [Concept]
```

---

## 2. Defining Relations

Relations connect two nodes and must use the angle bracket syntax.

### Basic Syntax
`<relation name> Target Node`

```cnl
# India [Country]
<has capital> Delhi [City]
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

## 3. Defining Attributes

Attributes assign a literal value to a node. They must start with `has` and use a colon.

### Basic Syntax
`has attribute name: value`

```cnl
# Earth [Planet]
has color: blue
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

## 4. Defining Sub-Types

To define a new `NodeType` that is a sub-type of another, use the `<is a type of>` relation. This will automatically infer that both the source and target are of type `class`.

```cnl
# Scientist [class]
<is a type of> Person [class]
```

---

## 5. Adding Descriptions

To add rich, multi-line markdown descriptions to a node, use a fenced code block with the `description` tag.

```cnl
# NodeBook [Concept]
```description
NodeBook is a peer-to-peer, collaborative graph authoring tool.
```
```
