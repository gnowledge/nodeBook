# NDF Studio Frontend - Component Architecture

This document provides a comprehensive analysis of the React component hierarchy in the NDF Studio frontend application, starting from the root `App.jsx` component and traversing all child components.

## Component Hierarchy Analysis

### **Root Level Components (App.jsx)**
1. **App.jsx** - Main application component
2. **AuthPage.jsx** - Authentication page wrapper
3. **UserBar.jsx** - Top navigation bar
4. **NDFStudioLayout.jsx** - Main layout component

### **Authentication Components**
5. **Login.jsx** - Login form
6. **Register.jsx** - Registration form

### **Main Layout Components (NDFStudioLayout.jsx)**
7. **NDFStudioPanel.jsx** - Main panel with tabs
8. **WorkspaceStatistics.jsx** - Statistics dashboard
9. **PreferencesPanel.jsx** - User preferences
10. **LogViewer.jsx** - System logs viewer
11. **HelpTab** (inline component) - Help content

### **Work Area Components**
12. **DisplayHTML.jsx** - Document view of graphs
13. **CytoscapeStudio.jsx** - Graph visualization
14. **CNLInput.jsx** - CNL editor
15. **DevPanel.jsx** - Development panel

### **Dev Panel Components (DevPanel.jsx)**
16. **NDFPreview.jsx** - YAML preview
17. **NDFJsonPreview.jsx** - JSON preview
18. **Statistics.jsx** - Graph statistics
19. **NodeTypeList.jsx** - Node type management
20. **RelationTypeList.jsx** - Relation type management
21. **AttributeTypeList.jsx** - Attribute type management

### **Schema Management Components**
22. **NodeTypeModal.jsx** - Node type creation/editing
23. **RelationTypeModal.jsx** - Relation type creation/editing
24. **AttributeTypeModal.jsx** - Attribute type creation/editing

### **Node Management Components**
25. **NodeCard.jsx** - Individual node display and management
26. **NodeForm.jsx** - Node creation form
27. **NodeUpdateForm.jsx** - Node editing form
28. **MorphForm.jsx** - Morph management
29. **MorphItemManager** (inline component) - Morph item management

### **Relation & Attribute Components**
30. **RelationForm.jsx** - Relation creation form
31. **AttributeForm.jsx** - Attribute creation form
32. **TransitionForm.jsx** - Transition creation form

### **Helper & Utility Components**
33. **MessageArea.jsx** - Notification messages
34. **StyledCard.jsx** - Reusable card component
35. **CNLHelperModal.jsx** - CNL construction helper
36. **NodeNameHelperModal.jsx** - Node name helper (deprecated)
37. **BlocklyCNLComposer.jsx** - Visual CNL composer (placeholder)

### **Legacy/Alternative Components**
38. **TabbedGraphEditor.jsx** - Alternative graph editor
39. **DisplayTabs.jsx** - Tabbed display component
40. **HelpPage.jsx** - Help page component

### **Context & Utilities**
41. **UserIdContext.jsx** - User context provider
42. **config.js** - Configuration constants

## Summary

**Total Components: 42**

**Actively Used Components: ~35** (excluding deprecated and placeholder components)

**Key Component Categories:**
- **Core Layout**: 4 components
- **Authentication**: 3 components  
- **Graph Management**: 8 components
- **Schema Management**: 6 components
- **Node Management**: 5 components
- **Forms & Inputs**: 6 components
- **Utilities & Helpers**: 6 components
- **Legacy/Alternative**: 4 components

## Component Status

### **Components that appear to be unused or deprecated:**
- `NodeNameHelperModal.jsx` (deprecated, replaced by CNLHelperModal)
- `BlocklyCNLComposer.jsx` (placeholder/disabled)
- `TabbedGraphEditor.jsx` (alternative implementation)
- `DisplayTabs.jsx` (alternative implementation)
- `HelpPage.jsx` (alternative to inline HelpTab)

## Architecture Overview

The application has a well-structured component hierarchy with clear separation of concerns:

### **Authentication Flow**
```
App.jsx → AuthPage.jsx → Login.jsx/Register.jsx
```

### **Main Application Flow**
```
App.jsx → NDFStudioLayout.jsx → NDFStudioPanel.jsx → [Work Area Components]
```

### **Work Area Components**
- **DisplayHTML.jsx** - Document view with NodeCard components
- **CytoscapeStudio.jsx** - Graph visualization
- **CNLInput.jsx** - CNL editor with Monaco Editor
- **DevPanel.jsx** - Development tools and schema management

### **Node Management Flow**
```
NodeCard.jsx → [NodeForm.jsx, RelationForm.jsx, AttributeForm.jsx, MorphForm.jsx]
```

### **Schema Management Flow**
```
[NodeTypeList.jsx, RelationTypeList.jsx, AttributeTypeList.jsx] → [Modal Components]
```

## Key Features by Component

### **Core Functionality**
- **App.jsx**: Application routing, authentication state management
- **NDFStudioLayout.jsx**: Main layout with tabbed interface
- **NDFStudioPanel.jsx**: Central panel with multiple view modes

### **Graph Management**
- **DisplayHTML.jsx**: Document-style graph view with node cards
- **CytoscapeStudio.jsx**: Interactive graph visualization using Cytoscape.js
- **CNLInput.jsx**: Controlled Natural Language editor

### **Node Operations**
- **NodeCard.jsx**: Individual node display with full CRUD operations
- **NodeForm.jsx**: Node creation with CNL-style input
- **MorphForm.jsx**: Morph management for polymorphic nodes

### **Schema Management**
- **NodeTypeList.jsx**: Node type registry and management
- **RelationTypeList.jsx**: Relation type registry and management
- **AttributeTypeList.jsx**: Attribute type registry and management

### **Development Tools**
- **DevPanel.jsx**: JSON/YAML previews, statistics, schema management
- **LogViewer.jsx**: System and user activity logs
- **Statistics.jsx**: Graph analytics and scoring

## Security Implementation

All critical components have been updated to include proper authentication:

### **API Calls with Authorization**
- All fetch calls include `Authorization: Bearer ${token}` headers
- User context is properly managed through `UserIdContext`
- Authentication state is checked before making API calls

### **Protected Operations**
- Graph creation, deletion, and modification
- Node creation, editing, and deletion
- Relation and attribute management
- Schema type management
- User preferences and statistics

## Development Notes

### **Component Dependencies**
- Most components depend on `UserIdContext` for user information
- API calls use centralized `config.js` for base URLs
- Monaco Editor is used for code editing (CNL, JSON, YAML)
- Cytoscape.js is used for graph visualization

### **State Management**
- React hooks (useState, useEffect) for local state
- Context API for global user state
- Local storage for authentication tokens

### **Styling**
- UnoCSS for utility-first CSS framework
- Responsive design with mobile-friendly layouts
- Custom component styling with CSS-in-JS patterns

## Future Considerations

### **Potential Improvements**
- Consider implementing React Router for better navigation
- Add error boundaries for better error handling
- Implement lazy loading for large components
- Add unit tests for critical components

### **Component Cleanup**
- Remove deprecated components (NodeNameHelperModal.jsx)
- Consolidate alternative implementations
- Standardize component interfaces

---

*This analysis was generated by traversing the component hierarchy starting from App.jsx and documenting all imported and rendered components.*
