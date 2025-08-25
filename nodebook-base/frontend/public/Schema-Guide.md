# NodeBook Schema Guide

This guide explains how NodeBook's schema system works, how to define custom schemas, and the differences between strict and non-strict modes.

---

## 🏗️ **What is a Schema?**

A schema in NodeBook defines the **rules and structure** for your knowledge graphs. It specifies:

- **Node Types**: What kinds of nodes can exist
- **Relation Types**: What relationships are allowed between nodes
- **Attribute Types**: What attributes nodes can have
- **Function Types**: What mathematical functions are available

Think of it as the "grammar" that defines valid CNL syntax and ensures data consistency.

---

## 📁 **Schema File Structure**

NodeBook uses JSON files stored in the `schemas/` directory:

```
schemas/
├── node_types.json      # Node type definitions
├── relation_types.json  # Relation type definitions
├── attribute_types.json # Attribute type definitions
└── function_types.json  # Function type definitions
```

---

## 🎯 **Node Types Schema**

### **File**: `schemas/node_types.json`

Defines what types of nodes can exist in your graphs.

#### **Basic Structure**
```json
[
  {
    "name": "Person",
    "description": "A human being",
    "parent_types": ["Agent"]
  },
  {
    "name": "Organization",
    "description": "A group of people organized for a purpose",
    "parent_types": ["Agent"]
  }
]
```

#### **Fields**
- **`name`**: Unique identifier for the node type
- **`description`**: Human-readable description
- **`parent_types`**: Array of parent node types (for inheritance)

#### **Example Node Types**
```json
[
  {
    "name": "class",
    "description": "A class or category of entities",
    "parent_types": []
  },
  {
    "name": "individual",
    "description": "A specific instance of a class",
    "parent_types": []
  },
  {
    "name": "Transition",
    "description": "A process that transforms inputs to outputs",
    "parent_types": ["class"]
  },
  {
    "name": "Element",
    "description": "A pure substance consisting of one type of atom",
    "parent_types": ["Substance"]
  }
]
```

---

## 🔗 **Relation Types Schema**

### **File**: `schemas/relation_types.json`

Defines what relationships can exist between nodes.

#### **Basic Structure**
```json
[
  {
    "name": "knows",
    "description": "One person knows another person",
    "domain": ["Person"],
    "range": ["Person"]
  },
  {
    "name": "works_for",
    "description": "A person works for an organization",
    "domain": ["Person"],
    "range": ["Organization"]
  }
]
```

#### **Fields**
- **`name`**: Unique identifier for the relation type
- **`description`**: Human-readable description
- **`domain`**: Array of allowed source node types
- **`range`**: Array of allowed target node types
- **`symmetric`**: Boolean indicating if relation is bidirectional
- **`transitive`**: Boolean indicating if relation can be chained
- **`inverse_name`**: Name of the inverse relation

#### **Example Relation Types**
```json
[
  {
    "name": "has prior_state",
    "description": "Defines the inputs and conditions for a transition",
    "domain": ["Transition"],
    "range": []
  },
  {
    "name": "has post_state",
    "description": "Defines the outputs of a transition",
    "domain": ["Transition"],
    "range": []
  },
  {
    "name": "is_a",
    "inverse_name": "has_subtype",
    "description": "Indicates that a node is an instance of a class",
    "domain": ["individual"],
    "range": ["class"],
    "symmetric": false,
    "transitive": true
  }
]
```

---

## 📊 **Attribute Types Schema**

### **File**: `schemas/attribute_types.json`

Defines what attributes nodes can have.

#### **Basic Structure**
```json
[
  {
    "name": "age",
    "description": "Age of a person in years",
    "data_type": "number",
    "allowed_values": null,
    "default_value": null
  },
  {
    "name": "status",
    "description": "Current status of an entity",
    "data_type": "string",
    "allowed_values": ["active", "inactive", "pending"],
    "default_value": "active"
  }
]
```

#### **Fields**
- **`name`**: Unique identifier for the attribute type
- **`description`**: Human-readable description
- **`data_type`**: Expected data type (string, number, boolean, etc.)
- **`allowed_values`**: Array of valid values (null for any value)
- **`default_value`**: Default value for new instances

#### **Example Attribute Types**
```json
[
  {
    "name": "number of protons",
    "description": "Number of protons in an atomic nucleus",
    "data_type": "number",
    "allowed_values": null,
    "default_value": null
  },
  {
    "name": "chemical formula",
    "description": "Chemical formula of a substance",
    "data_type": "string",
    "allowed_values": null,
    "default_value": null
  }
]
```

---

## ⚙️ **Function Types Schema**

### **File**: `schemas/function_types.json`

Defines mathematical functions that can compute derived attributes.

#### **Basic Structure**
```json
[
  {
    "name": "atomicMass",
    "expression": "\"number of protons\" + \"number of neutrons\"",
    "scope": ["Element", "class"]
  }
]
```

#### **Fields**
- **`name`**: Unique identifier for the function
- **`expression`**: Mathematical expression using attribute names in quotes
- **`scope`**: Array of node types this function applies to

#### **Example Function Types**
```json
[
  {
    "name": "atomicMass",
    "expression": "\"number of protons\" + \"number of neutrons\"",
    "scope": ["Element", "class"]
  },
  {
    "name": "molecularWeight",
    "expression": "\"atomic mass\" * \"number of atoms\"",
    "scope": ["Molecule", "class"]
  }
]
```

---

## 🔒 **Strict Mode vs. Non-Strict Mode**

### **Strict Mode (Default: ON)**

When strict mode is enabled, NodeBook enforces all schema rules:

#### **Validation Rules**
- **Node Types**: Must be valid types from `node_types.json`
- **Relation Types**: Must be valid types from `relation_types.json`
- **Attribute Types**: Must be valid types from `attribute_types.json`
- **Function Types**: Must be valid types from `function_types.json`

#### **Benefits**
- **Data Quality**: Ensures consistency across graphs
- **Error Prevention**: Catches invalid syntax early
- **Schema Compliance**: Forces adherence to defined structure
- **Production Ready**: Suitable for production environments

#### **Use Cases**
- Production knowledge graphs
- Collaborative projects requiring consistency
- Educational environments with defined curricula
- Research projects with specific ontologies

### **Non-Strict Mode**

When strict mode is disabled, NodeBook allows maximum flexibility:

#### **Validation Rules**
- **Node Types**: Any type name allowed
- **Relation Types**: Any relation name allowed
- **Attribute Types**: Any attribute name allowed
- **Function Types**: Any function name allowed

#### **Benefits**
- **Maximum Flexibility**: No constraints on naming
- **Rapid Prototyping**: Quick experimentation
- **Learning**: Focus on syntax without schema concerns
- **Custom Ontologies**: Define structure as you go

#### **Use Cases**
- Learning and experimentation
- Rapid prototyping
- Custom ontologies
- Research exploration

---

## ⚙️ **Configuring Strict Mode**

### **In the UI**
1. Go to **Menu → Preferences**
2. Toggle **Strict Mode** on/off
3. Changes apply immediately

### **Programmatically**
```javascript
// Enable strict mode
localStorage.setItem('strictMode', 'true');

// Disable strict mode
localStorage.setItem('strictMode', 'false');
```

---

## 🔧 **Creating Custom Schemas**

### **Step 1: Define Node Types**
```json
[
  {
    "name": "Software",
    "description": "Computer software and applications",
    "parent_types": ["class"]
  },
  {
    "name": "Programming Language",
    "description": "A formal language for computer programming",
    "parent_types": ["Software"]
  }
]
```

### **Step 2: Define Relation Types**
```json
[
  {
    "name": "written_in",
    "description": "Software written in a programming language",
    "domain": ["Software"],
    "range": ["Programming Language"]
  },
  {
    "name": "compiles_to",
    "description": "Programming language compiles to target platform",
    "domain": ["Programming Language"],
    "range": ["Platform"]
  }
]
```

### **Step 3: Define Attribute Types**
```json
[
  {
    "name": "version",
    "description": "Software version number",
    "data_type": "string",
    "allowed_values": null,
    "default_value": "1.0.0"
  },
  {
    "name": "license",
    "description": "Software license type",
    "data_type": "string",
    "allowed_values": ["MIT", "GPL", "Apache", "Proprietary"],
    "default_value": "MIT"
  }
]
```

### **Step 4: Define Function Types**
```json
[
  {
    "name": "ageInYears",
    "expression": "currentYear - \"release_year\"",
    "scope": ["Software"]
  }
]
```

---

## 🚨 **Schema Validation Errors**

### **Common Error Messages**

#### **"Node type 'X' is not defined in the schema"**
- **Cause**: Using a node type not in `node_types.json`
- **Solution**: Add the type to schema or use non-strict mode

#### **"Relation type 'X' is not defined in the schema"**
- **Cause**: Using a relation not in `relation_types.json`
- **Solution**: Add the relation to schema or use non-strict mode

#### **"Attribute type 'X' is not defined in the schema"**
- **Cause**: Using an attribute not in `attribute_types.json`
- **Solution**: Add the attribute to schema or use non-strict mode

#### **"Function 'X' is not defined in the schema"**
- **Cause**: Using a function not in `function_types.json`
- **Solution**: Add the function to schema or use non-strict mode

### **Domain/Range Validation Errors**
- **"Relation 'X' cannot connect nodes of types 'Y' and 'Z'"**
- **Cause**: Relation domain/range constraints violated
- **Solution**: Check schema constraints or modify relation definition

---

## 🎯 **Best Practices**

### **Schema Design**
1. **Start Simple**: Begin with basic types and expand
2. **Use Inheritance**: Leverage parent_types for hierarchy
3. **Clear Naming**: Use descriptive, consistent names
4. **Documentation**: Provide clear descriptions for all types
5. **Validation**: Test schemas with sample data

### **Mode Selection**
1. **Development**: Use non-strict mode for rapid prototyping
2. **Testing**: Use strict mode to validate schema compliance
3. **Production**: Always use strict mode for data quality
4. **Collaboration**: Coordinate strict mode settings with team

### **Schema Evolution**
1. **Version Control**: Track schema changes in version control
2. **Backward Compatibility**: Maintain compatibility when possible
3. **Migration**: Plan for schema updates in production
4. **Documentation**: Update documentation with schema changes

---

## 🔍 **Debugging Schemas**

### **Schema Validation Tools**
1. **Schema Tab**: View current schema in the UI
2. **Console Logs**: Check browser console for validation errors
3. **Network Tab**: Monitor API calls for schema-related errors
4. **Test Data**: Use small test graphs to validate schemas

### **Common Issues**
1. **JSON Syntax**: Ensure valid JSON format
2. **File Permissions**: Check file access permissions
3. **Schema Loading**: Verify schema files are loaded correctly
4. **Cache Issues**: Clear browser cache if schemas don't update

---

## 📚 **Advanced Topics**

### **Dynamic Schemas**
- Schemas can be modified at runtime
- Changes apply to new graphs immediately
- Existing graphs maintain their original schema

### **Schema Inheritance**
- Node types can inherit from multiple parents
- Relation constraints respect inheritance
- Functions can apply to parent types

### **Custom Validators**
- Extend validation beyond basic type checking
- Implement business logic validation
- Add custom error messages

---

## 🆘 **Getting Help**

### **Resources**
- **Schema Examples**: Check existing schema files
- **Documentation**: Refer to this guide and CNL help
- **Community**: Join GitHub discussions
- **Issues**: Report schema-related bugs

### **Support**
- **GitHub Issues**: [Report problems](https://github.com/gnowledge/nodeBook/issues)
- **Discussions**: [Ask questions](https://github.com/gnowledge/nodeBook/discussions)
- **Documentation**: [Browse guides](./Help.md)

---

**Ready to define your schema?** Start with the basics and gradually build complexity as your knowledge graphs evolve!
