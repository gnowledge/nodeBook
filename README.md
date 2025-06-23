# NDF Studio

**Node-neighborhood Description Framework (NDF)** — A desktop-first
  knowledge modeling app built with:

- 🖥️ Electron for cross-platform desktop shell
- ⚛️ Vite + React for frontend
- 🧠 FastAPI + NetworkX for backend graph modeling
- 🧩 flatfile backend: YAML-based persistence
- 🔌 Local-first, offline-friendly, with optional cloud sync (future)

---

## 📁 Project Structure

```
ndf-studio/
├── backend/           # See full structure below: FastAPI + NetworkX
│   └── main.py
├── frontend/          # Vite + React
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── services/api.js
├── electron/          # Electron shell
│   ├── main.js
│   └── package.json
└── graph_data/        # YAML files for nodes and relations
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
# Install frontend
cd frontend
npm install

# Build frontend
npm run build

# Install Electron shell
cd ../electron
npm install
```

---

### 2. Run the desktop app

```bash
npm run start  # from inside electron/
```

Electron will:
- Launch the backend (`uvicorn`)
- Serve the compiled frontend
- Open the app window

---

### 3. Developer mode

```bash
# Terminal 1: run frontend dev server
cd frontend
npm run dev

# Terminal 2: run Electron in dev mode
cd electron
npm run dev
```

---

## 🧠 Features

- Add nodes with optional qualifiers
- Store attributes and semantic relations
- View and edit YAML-based knowledge units
- Export/import support planned
- D3.js or Cytoscape-based graph view upcoming

---

## ⚙️ Scripts

From `electron/package.json`:

```json
"scripts": {
  "start": "electron .",
  "dev": "NODE_ENV=development electron .",
  "build-and-run": "cd ../frontend && npm run build && cd ../electron && npm run start"
}
```

---

## 📦 Packaging (optional)

To create distributables:

```bash
npm install --save-dev electron-builder
npx electron-builder
```

---

## 📝 License

AGPLv3 — Free and Open-source and remixable for educational, civic,
and public use.




# NDF Backend

The **Node-neighborhood Description Framework (NDF)** is a
lightweight, file-based graph knowledge system designed for learners,
educators, and researchers who want to build and explore meaningful
networks of knowledge through neighborhoods rather than rigid triples.

This is the backend repository built with **FastAPI** and
**NetworkX**, using **YAML files** to represent each node's local
neighborhood (NBH) as the unit of meaning.

---

## 🌱 Philosophy

NDF contrasts with RDF and traditional semantic web models by:
- Treating **neighborhoods** (NBHs) as the fundamental units of knowledge, not individual triples, though fully compatible in terms of encoding to RDF.
- Embracing a **constructivist, learner-friendly design**—no rigid ontology, schema enforcement is soft.
- Enabling **emergent semantics** through iterative exploration, use, and refinement of type hierarchies.

Students and users are encouraged to:
- Build from the bottom-up
- Define their own schemas
- Learn through doing and refining

---

## 📁 Core Data Structure

Each node is stored as a YAML file under `graph_data/`:

```yaml
node:
  id: india
  label: India
  role: individual           # or "class"
  qualifier: OPTIONAL       # optional (e.g., "asian" in "asian country")
  attributes:
    - name: area
      value: 32,87,263
      unit:  sq. km
      quantifier: OPTIONAL
      modality: OPTIONAL
relations:
  - type: located in
    target: Asia
    subject_quantifier: OPTIONAL
    object_quantifier: OPTIONAL
    modality: OPTIONAL
```

---

## 🔧 Features

- CRUD routes for:
  - Nodes
  - Attributes
  - Relations
  - nodeTypes / attributeTypes / relationTypes
- Auto-handling of inverse relations (e.g., `has_part` ↔ `part_of`)
- Optional soft schema validation:
  - Only enforced if `domain` and `range` are defined
- Minimal preloaded schema:
  - `is_a` and `member_of` as core relation types
- Reasoning engine (planned) based on transitive `is_a` inference

---

## 📌 Educational Design

- Learners can create **nodes** and **connect them** freely.
- Softly encouraged to define:
  - whether a node is a **class** or an **individual**
  - sub-types (`is_a`) and memberships (`member_of`)
- Advanced features like domain/range validation and ontology editing unlock as learners gain fluency
- Future feature: "Simulate Strict Typing" toggle for advanced validation

---

## 🚀 Running the App

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the API server

```bash
uvicorn main:app --reload
```

### 3. View docs

Open [http://localhost:8000/docs](http://localhost:8000/docs) to explore the API with Swagger UI.

---

## 🧠 Project Goals

- Promote **network thinking** in education
- Provide **graph-based alternative** to rigid object-oriented business logic
- Build a **scalable**, federated knowledge ecosystem rooted in human reasoning

---

## 📂 Directory Structure

```
backend/
├── main.py                      # FastAPI entry point
├── routes/                      # API routes
│   ├── nodes.py
│   ├── graph_ops.py
│   └── schema.py
├── schema/                      # Editable schema files
│   ├── node_types.yaml
│   ├── attribute_types.yaml
│   └── relation_types.yaml
├── graph_data/                  # Flat-file graph DB
└── requirements.txt
```

---

## 📖 License

This project is licensed under the **AGPL v3** to ensure knowledge and improvements remain open.

---

## 🌍 Project Origin

An initiative of https://www.gnowledge.org 

## Quick Start Scripts

For easy development, we provide several startup scripts:

### Individual Services

**Start Backend Only:**
```bash
./start_backend.sh
```
- Checks virtual environment and directory
- Sets correct PYTHONPATH
- Starts backend on http://localhost:8000

**Start Frontend Only:**
```bash
./start_frontend.sh
```
- Checks directory and dependencies
- Starts frontend on http://localhost:5173 (or next available port)

### Combined Services

**Start Both Backend and Frontend:**
```bash
./start_services.sh
```
- Checks virtual environment and directory
- Starts both services in parallel
- Press Ctrl+C to stop both

### Manual Start (Alternative)

If you prefer to start services manually:

**Backend:**
```bash
source venv/bin/activate
PYTHONPATH=/home/nagarjun/dev/ndf-studio/backend python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install  # if needed
npm run dev
```

## Prerequisites

- Python 3.8+ with virtual environment activated
- Node.js 16+ with npm
- All dependencies installed (see Installation section above)
