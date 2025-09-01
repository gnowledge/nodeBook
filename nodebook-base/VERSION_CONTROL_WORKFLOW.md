# NodeBook Version Control Workflow

## 🎯 **Overview**

NodeBook now implements a modern, user-friendly version control workflow that aligns with contemporary online editor expectations. This system provides automatic data protection while maintaining clean, meaningful version history.

## 🔄 **Workflow Components**

### **1. Auto-Save (Background)**
- **What**: Automatically saves CNL text to local file every 2 seconds after user stops typing
- **When**: Happens silently in the background
- **Purpose**: Prevents data loss from crashes, browser issues, or collaboration conflicts
- **User Experience**: No user action required - completely transparent

### **2. Save (Manual)**
- **What**: Manually saves CNL text to local file
- **When**: User clicks "Save" button or uses Ctrl+S
- **Purpose**: Explicit save point for user peace of mind
- **Git Impact**: No Git commit created - only local file save

### **3. Submit (Process + Version)**
- **What**: Processes CNL text, regenerates graph, and creates Git commit
- **When**: User clicks "Submit" button
- **Purpose**: Creates a meaningful version with descriptive commit message
- **Git Impact**: Creates Git commit with message like "Processed CNL: 3 nodes, 2 relations, 1 attribute"

### **4. Manual Commit (Version Control)**
- **What**: Creates Git commit with custom message
- **When**: User uses Version Control panel
- **Purpose**: Advanced version control for power users
- **Git Impact**: Creates Git commit with user-defined message

## 📊 **Version Management**

### **Manifest Updates**
- **Before**: Used linear version numbers (1, 2, 3...)
- **Now**: Uses Git commit hashes (e.g., `a1b2c3d`)
- **Benefits**: 
  - Links directly to Git history
  - No version number inflation
  - Meaningful commit messages
  - Full audit trail

### **Commit Message Format**
```
Processed CNL: 3 nodes, 2 relations, 1 attribute
```
- Automatically generated based on CNL content
- Shows actual changes made
- Helps users understand what each version contains

## 🎓 **User Experience for Students & Teachers**

### **Simple Mental Model**
- **"Save"**: "Save my work without creating a version"
- **"Submit"**: "Process my CNL and save as a new version"
- **"Version History"**: "See all my versions with descriptions"

### **No Technical Knowledge Required**
- Users don't need to understand Git
- Auto-save protects against data loss
- Submit creates meaningful versions automatically
- Version history shows clear descriptions

### **Workflow Examples**

#### **Example 1: Student Writing CNL**
1. Student types CNL text
2. Auto-save happens every 2 seconds (invisible)
3. Student clicks "Submit" when ready
4. System processes CNL and creates version "Processed CNL: 2 nodes, 1 relation"
5. Student can see this version in history

#### **Example 2: Teacher Reviewing Work**
1. Teacher opens student's graph
2. Views version history with clear descriptions
3. Can revert to any previous version if needed
4. Each version shows exactly what was changed

## 🔧 **Technical Implementation**

### **Auto-Save Mechanism**
- 2-second debounced timer after user stops typing
- Saves to local file only (no Git commit)
- Silent operation - no user notifications
- Handles network failures gracefully

### **Git Integration**
- Each graph has its own Git repository
- Commits created only on Submit or Manual Commit
- Commit messages automatically generated from CNL content
- Fallback to linear versioning if Git unavailable

### **Data Protection**
- Auto-save prevents data loss
- Local saves are fast and reliable
- Git commits provide version history
- No data loss from crashes or browser issues

## 🚀 **Live Collaboration Ready**

### **Auto-Save Benefits**
- Real-time collaboration without data loss
- Conflict resolution support
- Automatic backup during editing
- Seamless user experience

### **Version Control Benefits**
- Clear collaboration history
- Ability to revert collaborative changes
- Audit trail for group work
- Branch support for complex workflows

## 📋 **Best Practices**

### **For Students**
- Use "Submit" when you want to save a version
- Don't worry about "Save" - it happens automatically
- Check version history to see your progress
- Use descriptive commit messages for manual commits

### **For Teachers**
- Review version history to see student progress
- Use revert functionality to help students recover from mistakes
- Encourage regular submissions for clear progress tracking
- Use manual commits for major milestones

### **For Administrators**
- Auto-save reduces support requests for data loss
- Git-based versioning provides audit trail
- Clean version history improves system performance
- Ready for enterprise-level collaboration features

## 🔮 **Future Enhancements**

### **Phase 2: Advanced Features**
- Branch support for complex workflows
- Merge conflict resolution
- Collaborative versioning
- Advanced Git operations

### **Phase 3: Enterprise Features**
- Role-based access control
- Advanced audit trails
- Integration with external version control systems
- Compliance and governance features

## ❓ **FAQ**

**Q: What happens if I don't click Save?**
A: Your work is automatically saved every 2 seconds after you stop typing.

**Q: When should I use Submit vs Save?**
A: Use Save for peace of mind, Submit when you want to create a version.

**Q: How do I see my version history?**
A: Click Version → View History in the editor toolbar.

**Q: Can I undo a Submit?**
A: Yes, you can revert to any previous version using the version control panel.

**Q: What if Git isn't available?**
A: The system falls back to linear versioning automatically.

---

*This workflow is designed to be intuitive for non-technical users while providing powerful version control capabilities for advanced users.*
