# NDF Backend

The **Node-neighborhood Description Framework (NDF)** is a lightweight, file-based graph knowledge system designed for learners, educators, and researchers who want to build and explore meaningful networks of knowledge through neighborhoods rather than rigid triples.

This is the backend repository built with **FastAPI** and **NetworkX**, using **YAML files** to represent each node's local neighborhood (NBH) as the unit of meaning.

---

## 🌱 Philosophy

NDF contrasts with RDF and traditional semantic web models by:
- Treating **neighborhoods** (NBHs) as the fundamental units of knowledge, not individual triples.
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
  id: water
  label: Water
  role: individual           # or "class"
  qualifier: essential       # optional (e.g., "female" in "female scientist")
  attributes:
    - name: state
      value: liquid
      quantifier: some
      modality: always
relations:
  - type: has_part
    target: hydrogen
    subject_quantifier: all
    object_quantifier: one
    modality: necessary
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
- Provide **graph-based alternative** to rigid semantic models
- Build a **scalable**, federated knowledge ecosystem rooted in human reasoning

---

## 📂 Directory Structure

```
ndf-backend/
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

Developed as part of the **Living Academy** and the **Lifelong Kindergarten** vision for open-ended, exploratory education.

## Running Backend Tests

To run the backend test suite for morph management and other features:

1. **Activate your virtual environment** (if not already):
   ```bash
   source venv/bin/activate
   ```

2. **Run tests from the project root** (not from inside the backend directory):
   ```bash
   python -m pytest backend/tests/ -v -s
   ```
   or simply:
   ```bash
   pytest backend/tests/ -v -s
   ```

   - The `-v` flag gives verbose output.
   - The `-s` flag allows print/debug output to show in the terminal.

3. **Troubleshooting Import Errors**
   - Always run tests from the project root so that `backend.*` imports work.
   - If you see `ModuleNotFoundError: No module named 'backend'`, make sure you are not inside the `backend/` directory when running pytest.
   - You can also set the `PYTHONPATH` manually:
     ```bash
     PYTHONPATH=. pytest backend/tests/ -v -s
     ```

4. **Cleaning Test Data**
   - If you want a clean slate, delete the test user's data:
     ```bash
     rm -rf graph_data/users/testuser
     ```

5. **Test Output**
   - Test logs and debug output will appear in the terminal.
   - All backend file operations and registry updates are visible in the logs.

---

For more details, see the test files in `backend/tests/` and the backend implementation in `backend/routes/` and `backend/core/`.
