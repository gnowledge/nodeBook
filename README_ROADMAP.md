# NDF-Studio Roadmap

_NDF-Studio_ is an open, mobile-friendly knowledge construction
platform that uses Controlled Natural Language (CNL) to represent
knowledge as node-neighborhoods. This roadmap documents the
development milestones and architectural directions toward our first
stable release.

---

## ✅ Current Milestone: Stable Backend + Single Page Frontend

- Backend is stable using FastAPI + NetworkX.
- Frontend is functional on both mobile and desktop.
- Replaced Tailwind with UnoCSS for CSS utility support.
- Monaco-based CNL editor fully functional.
- YAML-based `.ndf` format is human-friendly and rendered from JSON internally.

---

## 🔄 In-Progress / Next Milestones

### 1. CNL Enhancements
- [ ] Support **qualifiers** for nodes (e.g., _"female mathematician"_) → Stored in `node.qualifier`
- [ ] Support **quantifiers** for:
  - Attributes (e.g., _"has size: at least 5 (cm)"_)
  - Relations (e.g., _"most birds can fly"_)
- [ ] Update the parser and CNL grammar accordingly.

### 2. Unique Node Identifiers
- [ ] Implement document-unique or globally consistent `node.id`
- [ ] Support document merging and deduplication using IDs.
- [ ] Enables computation of **scorecards** across documents.

### 3. JSON as Canonical Parsed Format
- [ ] Migrate `parsed.yaml` to backend-native `parsed.json`.
- [ ] Frontend continues to render YAML via JSON→YAML conversion.
- [ ] Aligns with schema validation, testing, and frontend frameworks.

### 4. Smart Template Placement
- [ ] Distinguish insertion triggers:
  - `<...>` → Relation
  - `has ...:` → Attribute
- [ ] Improve template menu UX with semantic categorization.

### 5. Blockly-Enhanced Input (Optional UI)
- [ ] Accordion-style block insertion panel above editor.
- [ ] Basic users: Blockly blocks
- [ ] Advanced users: Monaco text editor
- [ ] Pre-existing Blockly block designs to be reused.

### 6. Scorecard (DevPanel → Statistics Tab)
- [ ] Tentative scoring rubric:
  - Node: 1 point
  - Relation: 2 points
  - Attribute: 3 points
  - Node with qualifier: 2 points
  - Relation and Attribute with qualifier 3 points
  - Quantified relation/attribute: 5 points
  - Modality included for attributes and relations 5 points
  - Logical connective: 10 points
  - Argument composition: TBD
- [ ] Rubric will be peer-reviewed and editable.

### 7. Modeling **Processes**
- [ ] Backend support for storing multiple node-states
- [ ] Add `process_block` in Blockly: transition from prior-state to post-state.
- [ ] Prior-state and post-state are a set of node-states
- [ ] Post-state of one process may serve as prior-state of another, like a petri-net
- [ ] Backend schema updated to support role: `process`, 'state'

### 8. Lightweight Multiuser Support
- [ ] Add support for user IDs without requiring email/mobile auth.
- [ ] Store user workspace under `/graph_data/users/{user_id}`.

### 9. Accessibility Compliance
- [ ] Follow accessibility best practices (WCAG).
- [ ] UI and interaction audit to support learners with disabilities.

### 10. Localization Support
- [ ] Internationalization-ready (i18n)
- [ ] English-only in first release.
- [ ] Language switching via user preference.

### 11. Help & Preferences as Graph
- [ ] Implement Help and Preferences **as nodes** in the graph.
- [ ] Users can explore and edit their settings like knowledge units.

### 12. Desktop Distribution (Electron)
- [ ] Wrap frontend + backend in Electron for offline use.
- [ ] Add Auto-update mechanism when online.

### 13. Testing
- [ ] Unit tests for backend logic
- [ ] Functionality tests for parser, graph storage, and UI
- [ ] Test suite for CI-ready development.

### 14. Developer Documentation
- [ ] Add docstrings in all Python and JS/TS modules
- [ ] Internal dev documentation for:
  - Backend APIs
  - Graph schema
  - CNL syntax

---

## ✅ Completed Milestones (for reference)

- [x] Graph as document model (.ndf)
- [x] Freeform markdown + CNL per node section
- [x] Parsed graph rendering with Cytoscape
- [x] Monaco editor with save/parse hooks
- [x] Block templates for relation/attribute insertion
- [ ] Soft Inverse relation generation, to distinguish between what is asserted and what is inferred (only in the frontend)
- [x] Graph templates and graph metadata
- [x] DisplayHTML card grid for NDF preview
- [x] UnoCSS styling for mobile/desktop layout

---

## 💡 Suggestions / Potential Enhancements

- [ ] PEG grammar support for CNL parsing
- [ ] Real-time CNL syntax highlighting
- [ ] Plugin system for new CNL features
- [ ] Interoperability with RDF / OWL via export adapters
- [ ] Learning analytics and feedback suggestions

---

## Version Milestone Tags

- `v0.1`: Minimal working CNL + Graph + Blockly
- `v0.2`: Scorecard + Process modeling + Electron App
- `v0.3`: Accessibility + Localization + Help system
- `v1.0`: Full offline-ready multiuser app with update support

---

## 🔍 Node Summarization & NLP Integration

- [ ] Reintroduce **automatic summary paragraph** for each node.
- [ ] Use spaCy-based NLP to extract:
  - Common/proper nouns → Node suggestions
  - Verbs/prepositions → Relation triggers
  - Adjective/noun phrases → Attribute suggestions
- [ ] Parsed blocks rendered in `DisplayHTML` as:
  - Suggested Relations
  - Suggested Attributes
  - Suggested Node Types
- [ ] Update `DisplayHTML` cards to show:
  - Node description
  - Extracted blocks (editable later)

## 🧠 Small Language Model (SLM) Exploration

- [ ] Design or fine-tune a **Small Language Model (SLM)** for:
  - Generating **single-paragraph summaries** per node.
  - Operating fully **offline or locally** for cost-free inference.
- [ ] Use open models (e.g., TinyLlama, DistilBERT) and fine-tune on:
  - Student-written node descriptions
  - Public knowledge bases (e.g., Wikipedia)
- [ ] Output should be concise, factual, and paraphrased from CNL blocks.
- [ ] Integrate SLM into parse/save workflow as fallback for missing descriptions.


## Philosophy

> _“Structure should emerge from shared practice, not rigid formalism.”_

---

## License

To be confirmed. AGPLv3 recommended for educational openness.

