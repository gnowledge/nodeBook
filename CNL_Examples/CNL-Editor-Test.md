# CNL Editor Test - Keyboard Shortcuts and Autocompletion

This file demonstrates the improved CNL Editor functionality with proper keyboard shortcuts and controlled autocompletion.

## Testing Context-Aware Section Button

### Universal Section Control (All Devices)
- **First click** on `# Heading` button: Inserts single `#` at cursor position
- **Subsequent clicks** on `# Heading` button: Shows level controls dropdown
- **Button shows current level**: `# Heading (2)` when on a `##` line
- **Works on any line**: Not just at the beginning

### Section Level Controls Dropdown
- **`-` button**: Decrease section level by 1
- **`+` button**: Increase section level by 1  
- **`×` button**: Remove section markup completely
- **Level indicator**: Shows current level (e.g., "Level 3")
- **Auto-hide**: Closes when clicking outside or after action

### Tab for Normal Indentation
- **Tab** works as expected for normal text indentation
- **Shift+Tab** for outdenting (standard editor behavior)
- **No conflicts** with existing editor shortcuts

## Testing Enter Key Behavior

### Normal Enter Behavior
- Press Enter at the end of a line to create a new line
- The new line should maintain the same indentation as the current line
- No unwanted autocompletion should be inserted

### Enter with Autocompletion
- Press Ctrl+Space to trigger autocompletion
- Press Enter to select a completion
- Press Escape to cancel autocompletion

## Testing Autocompletion

### Controlled Autocompletion
- Autocompletion should NOT appear automatically as you type
- Press Ctrl+Space to manually trigger autocompletion
- Autocompletion should only show when you've typed at least 2 characters
- Autocompletion should not trigger when typing at the end of a line

### CNL-Specific Completions
- Type '#' and press Ctrl+Space for node heading completions
- Type '<' and press Ctrl+Space for relation completions
- Type 'has' and press Ctrl+Space for attribute completions

## Example CNL Structure

Try creating this structure using the Tab shortcuts:

#   [Domain] Eukarya 
##   [Kingdom] Animalia 
###   [Phylum] Chordata  
####   [Class] Mammalia  
#####   [Order] Primates  
######   [Family] Hominidae  
#######  [Genus] Homo  
########  [Species] sapiens 

###   [Phylum] Reptilia  
####   [Class] Archosauria  
#####   [Order] aves  
######   [Family] aves 
#######  Canis lupus [Example]

##   [Kingdom] Plantae 
###   [Phylum] Phytotaxa 
####   [Class] Magnifera  
#####   [Order] Proteaceae  
######   [Family] Proteaceae  
#######  Utricularia  [Example]

### Instructions:
1. Start with a blank line
2. Click **`# Heading`** button to get `# `
3. Type `[Domain] Eukarya`
4. Press Enter, then click **`# Heading`** button to get `## `
5. Type `[Kingdom] Animalia`
6. Press Enter, then click **`# Heading`** button to get `### `
7. Type `[Phylum] Chordata`
8. Click **`# Heading`** button again to see level controls, then use `+`/`-` buttons

## Testing Instructions

1. Open this file in the CNL Editor
2. Test each keyboard shortcut mentioned above
3. Verify that autocompletion behaves as described
4. Verify that Enter key works correctly without unwanted insertions
5. Test the Tab shortcuts for creating hierarchical structures like the example above
