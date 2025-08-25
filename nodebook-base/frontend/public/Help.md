# NodeBook Help & Documentation

Welcome to NodeBook! This comprehensive help guide will get you started with creating knowledge graphs using Controlled Natural Language (CNL).

---

## 🚀 **Quick Start**

### 1. **Choose Your Graph Mode**
NodeBook offers multiple modes for different complexity levels:

- **🧠 MindMap Mode**: Simple hierarchies and brainstorming
- **💡 ConceptMap Mode**: Concept relationships and connections  
- **⚡ TransitionMap Mode**: Process flows and state changes
- **⚙️ FunctionMap Mode**: Computational relationships and derived values

### 2. **Start with MindMap Mode**
For beginners, we recommend starting with MindMap mode:

```cnl
<! MindMap Mode: contains>

# My First Graph
## Main Topic
### Subtopic 1
### Subtopic 2
## Another Topic
```

### 3. **Submit Your CNL**
Use the Editor tab to write your CNL and click "Submit" to create your graph.

---

## 📚 **Comprehensive CNL Guide**

For detailed syntax and examples, see our **[Complete CNL Reference](./CNL-Help.md)**.

### **Key CNL Concepts:**
- **Nodes**: Use `# Node Name [Type]` syntax
- **Relations**: Use `<relation> Target;` syntax  
- **Attributes**: Use `has name: value;` syntax
- **Functions**: Use `has function "functionName";` syntax
- **Descriptions**: Use ```description blocks

---

## 🔧 **Examples & Tutorials**

### **Basic Examples**

#### **Simple MindMap**
```cnl
<! MindMap Mode: contains>

# Project Planning
## Requirements
### Functional
### Non-Functional
## Design
## Implementation
## Testing
```

#### **Chemical Reaction (Transition)**
```cnl
# Photosynthesis [Transition]
<has prior_state> Carbon Dioxide;
<has prior_state> Water;
<has prior_state> Sunlight;
<has post_state> Glucose;
<has post_state> Oxygen;
```

#### **Element with Function (Function)**
```cnl
# Carbon [Element]
has number of protons: 6;
has number of neutrons: 6;
has function "atomicMass";
```

### **Advanced Examples**

#### **Complex Concept Map**
```cnl
# Knowledge Graph [Concept]
<relates to> Graph Theory;
<influences> Data Science;
<supports> Research;

# Graph Theory [Concept]
<is a type of> Mathematics;
<applies to> Computer Science;
```

#### **Business Process (Transition)**
```cnl
# Order Processing [Transition]
<has prior_state> Customer Order;
<has prior_state> Inventory Check;
<has prior_state> Payment Verification;
<has post_state> Order Confirmation;
<has post_state> Shipping Notice;
```

---

## 🎯 **Mode-Specific Guides**

### **MindMap Mode** 🧠
- **Best for**: Brainstorming, note-taking, simple hierarchies
- **Syntax**: Simple markdown headings
- **Features**: Automatic parent-child relationships, optional descriptions
- **Use cases**: Project planning, research notes, learning outlines

### **ConceptMap Mode** 💡
- **Best for**: Concept relationships, knowledge mapping, education
- **Syntax**: Explicit relations between concepts
- **Features**: Rich relationship modeling, concept hierarchies
- **Use cases**: Educational content, research mapping, knowledge organization

### **TransitionMap Mode** ⚡
- **Best for**: Process flows, state changes, workflows
- **Syntax**: Prior state → Transition → Post state
- **Features**: Process modeling, state tracking, input/output mapping
- **Use cases**: Chemical reactions, business processes, scientific workflows

### **FunctionMap Mode** ⚙️
- **Best for**: Mathematical models, derived values, calculations
- **Syntax**: Functions with expressions and scopes
- **Features**: Automatic computation, derived attributes, mathematical expressions
- **Use cases**: Scientific modeling, financial calculations, engineering analysis

---

## ⚙️ **Schema & Validation**

### **Strict Mode vs. Non-Strict Mode**

#### **Strict Mode** (Default: ON)
- **Node Types**: Must be valid types from schema
- **Relation Types**: Must be valid relation types
- **Attribute Types**: Must be valid attribute types
- **Validation**: Full schema validation with error reporting
- **Use case**: Production environments, data quality assurance

#### **Non-Strict Mode**
- **Node Types**: Any type allowed
- **Relation Types**: Any relation name allowed
- **Attribute Types**: Any attribute name allowed
- **Validation**: Minimal validation, maximum flexibility
- **Use case**: Prototyping, experimental graphs, learning

### **Schema Definition**
NodeBook uses JSON schema files to define:
- **Node Types**: Available node categories and their properties
- **Relation Types**: Valid relationships and their constraints
- **Attribute Types**: Available attributes and their data types
- **Function Types**: Mathematical functions and their expressions

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **"Node type not found" Error**
- **Cause**: Using a node type not defined in schema
- **Solution**: Check available types in Schema tab or use non-strict mode

#### **"Relation type not found" Error**
- **Cause**: Using a relation not defined in schema
- **Solution**: Check available relations or use non-strict mode

#### **Function Not Working**
- **Cause**: Missing required attributes or wrong node type
- **Solution**: Ensure all required attributes exist and node type matches function scope

#### **Graph Not Rendering**
- **Cause**: Syntax errors in CNL
- **Solution**: Check CNL syntax, look for missing semicolons or brackets

### **Getting Help**
- **Check Syntax**: Ensure proper CNL syntax
- **Review Schema**: Verify types and relations exist
- **Use Examples**: Reference working examples
- **Community**: Join GitHub discussions

---

## 📖 **Additional Resources**

### **Documentation**
- **[CNL Syntax Reference](./CNL-Help.md)**: Complete CNL syntax guide
- **[Schema Guide](./Schema-Guide.md)**: Schema definition and validation
- **[About NodeBook](./About.md)**: Project information and contribution guide
- **[Developer Notes](./Developer-Notes.md)**: Technical implementation details

### **Examples Repository**
- **Introduction**: Basic CNL concepts and syntax
- **Simple Example**: Basic graph creation
- **REA Example**: Resource-Event-Agent modeling
- **Transition Example**: Process flow modeling
- **Function Example**: Mathematical function usage

### **Community & Support**
- **GitHub Repository**: [Source code and issues](https://github.com/gnowledge/nodeBook)
- **Discussions**: [Community discussions](https://github.com/gnowledge/nodeBook/discussions)
- **Issues**: [Bug reports and feature requests](https://github.com/gnowledge/nodeBook/issues)

---

## 🎉 **Ready to Start?**

1. **Choose a Mode**: Start with MindMap for simple hierarchies
2. **Write CNL**: Use the Editor tab to write your graph definition
3. **Submit**: Click submit to create your graph
4. **Visualize**: Switch to Graph tab to see your creation
5. **Explore**: Use the Nodes tab to view and edit individual nodes

**Need more help?** Check the Examples section or refer to the complete CNL reference guide.

**Happy graphing!** 🚀

