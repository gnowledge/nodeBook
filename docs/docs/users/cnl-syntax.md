# CNL Syntax Guide

Controlled Natural Language (CNL) is the core syntax used in NodeBook to express knowledge in a structured yet readable way. This guide explains the syntax rules and provides examples for different difficulty levels.

## What is CNL?

CNL is a simplified, structured form of natural language that allows you to express complex relationships in a way that's both human-readable and machine-processable. It combines the clarity of natural language with the precision of formal logic.

## Basic Syntax Elements

### Relations

Relations connect nodes to show how they relate to each other.

**Syntax**: `<relation_name> target_node`

**Examples**:
```
<is part of> heart
<causes> disease
<has property> color
<contains> oxygen
```

### Attributes

Attributes describe properties of nodes.

**Syntax**: `has attribute_name: value`

**Examples**:
```
has color: red
has temperature: 37 degrees Celsius
has size: large
has weight: 300 grams
```

### Adverbs (Advanced/Expert Levels)

Adverbs modify relations to add detail about how, when, or to what extent something happens.

**Syntax**: `++adverb++ <relation> target`

**Examples**:
```
++quickly++ <moves> blood
++slowly++ <pumps> heart
++efficiently++ <transports> oxygen
```

### Quantifiers (Advanced/Expert Levels)

Quantifiers specify the amount or scope of a relation.

**Syntax**: `quantifier <relation> target`

**Common quantifiers**: `all`, `some`, `many`, `few`, `most`, `none`

**Examples**:
```
all <contains> oxygen
some <cause> disease
many <transport> nutrients
```

### Modality (Expert Level Only)

Modality expresses uncertainty, possibility, or necessity.

**Syntax**: `[modality] <relation> target` or `has attribute: value [modality]`

**Common modalities**: `[possible]`, `[necessary]`, `[likely]`, `[certain]`, `[uncertain]`

**Examples**:
```
[possible] <causes> disease
has temperature: 37 degrees [likely]
[necessary] <contains> oxygen
```

## Complex Structures

### Multiple Relations

You can express multiple relations for the same node:

```
heart <pumps> blood
heart <is part of> circulatory system
heart <has property> muscle tissue
```

### Nested Structures

For complex relationships, you can nest structures:

```
heart <contains> chambers
chambers <include> left atrium
left atrium <receives> oxygenated blood
```

### Conditional Statements

Express conditional relationships:

```
if heart <stops> then body <dies>
if temperature <rises> then metabolism <increases>
```

## Difficulty Level Examples

### Easy Level

At the easy level, focus on basic relations and attributes:

```
heart <pumps> blood
heart has color: red
blood <flows> through vessels
vessels <carry> oxygen
```

### Moderate Level

Add adjectives (qualifiers) to provide more detail:

```
red heart <pumps> oxygenated blood
large vessels <carry> nutrients
small capillaries <exchange> gases
```

### Advanced Level

Include adverbs and quantifiers for precision:

```
heart ++efficiently++ <pumps> blood
all vessels <carry> oxygen
some blood ++quickly++ <flows> through arteries
```

### Expert Level

Use all features including modality for sophisticated expressions:

```
heart [likely] ++efficiently++ <pumps> blood
all vessels [necessary] <carry> oxygen
some blood [possible] ++quickly++ <flows> through arteries
heart has temperature: 37 degrees [likely]
```

## Best Practices

### Clarity
- Use clear, descriptive relation names
- Be specific about what you're describing
- Avoid ambiguous terms

### Consistency
- Use consistent naming conventions
- Apply similar patterns across related concepts
- Maintain logical relationships

### Completeness
- Include all relevant attributes
- Specify relationships clearly
- Add context where helpful

### Accuracy
- Verify your knowledge before expressing it
- Use appropriate quantifiers and modalities
- Check that relationships make logical sense

## Common Patterns

### Part-Whole Relationships
```
<is part of> whole
<contains> part
<includes> component
```

### Cause-Effect Relationships
```
<causes> effect
<leads to> result
<triggers> response
```

### Property Relationships
```
<has property> characteristic
<possesses> attribute
<exhibits> behavior
```

### Process Relationships
```
<performs> action
<executes> function
<carries out> operation
```

## Tips for Writing CNL

1. **Start Simple**: Begin with basic relations and add complexity gradually
2. **Be Specific**: Use precise terms rather than vague ones
3. **Check Logic**: Ensure your relationships make logical sense
4. **Use Examples**: Look at existing CNL in your graph for patterns
5. **Test Understanding**: Try reading your CNL aloud to see if it makes sense

## Common Mistakes to Avoid

- **Inconsistent naming**: Use the same terms for the same concepts
- **Missing context**: Include enough detail to be clear
- **Over-complication**: Don't add unnecessary complexity
- **Logical errors**: Ensure relationships are logically sound
- **Ambiguous references**: Be clear about what you're referring to

## Getting Help with CNL

- **Use the parse button** (when available) to validate your syntax
- **Check the CNL view** to see how your knowledge is structured
- **Look at examples** in existing graphs
- **Start with simple patterns** and build up complexity
- **Ask for help** if you're unsure about syntax

Remember: CNL is designed to be readable and logical. If your CNL doesn't make sense when you read it, it probably needs to be revised! 