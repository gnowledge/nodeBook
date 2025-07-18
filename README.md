# NodeBook

![nodeBook logo](frontend/public/nodebook.png)

nodeBook is a graph based note taking application keeping learners of any subject as the end users. The core design principle is moving from linear text to graph (nodes and edges), and from graph to text helps in bringing meaning to the foreground pushing vocabulary to the background.  Ultimate objective is not to learn anything by rote. The graph based representation constructed explicitly by the user makes learning slow, but authentic.  

It is an implimentation of **Node-neighborhood Description Framework (NDF)** inspired from a frame based knowledge representation.  

To ensure that the graph documents created by the user are always accessible in an open standard, we represent the document for the machines in JSON, while for the human beings in a **Controlled Natural Language (CNL)**.  The users can learn CNL as they move from being a novice to an expert level, following the user controlled difficulty levels. Score is calculated informing how good the users are in representing knowledge as a graph. 

It starts with representing knowledge as atomic facts in the form of subject-predicate-object, while also informing possible inferences, displaying the derived knowledge from expressed knowledge.  This makes the user understand how reasoning works. 

nodeBook also supports representing transitions (processes) and functions (TBD) as derived attribute values. 

## Features

- **Graph-based Knowledge Modeling**: Create, edit, and visualize knowledge graphs with nodes, relations, attributes, and transitions.
- **Controlled Natural Language (CNL)**: Users will be trained along the way to view and write in CNL for graph data, with syntax guidance and progressive difficulty levels. 
- **User Registration & Approval**: New users join with an introductory note and wait for admin approval.  Assumption, used in a school, college or a group supported by a mentor in anacademic environment
- **Role-based Access**: Admin panel for user management, approvals, system-wide logs and system statistics.
- **Dynamic Server Address**: Frontend can connect to any backend server, set by the user.
- **Electron AppImage**: Desktop app with all frontend features, no backend or Python bundled.
- **Shareable Graph URLs**: Copy and share direct links to specific graphs.
- **Markdown Support**: Node descriptions and documentation support markdown, including graph links.
- **Session Management**: Secure JWT authentication, inactivity handling, and robust error feedback.
- **Logging**: CUD (Create, Update, Delete) actions are logged; system logs are visible to admins.
- **Documentation**: Documentation for users and developers frequently updated at https://docs.nodeBook.in.

## Technical Information

The backend and frontend can be configured to run on the same or different machiens.

- Backend 
  - Programming Language: Python
  - Graph database is a flat text files, in JSON format passing through NetworkX
  - Graph data is also expressed in markdown format using a Controlled Natural Language (CNL)
  - All nodes and edges are registered with unique id for reuse and merging operations
  - Graphdata of each user lies in a userspace, protected through authkey (only when used through API)
  - Authentication uses FastAPI Users (default db is sqlite, can be changed by users for production for large volume of users)
  - Backend API is routed through FASTAPI and requests and responses are validated through pydantic
  - API routes published at https://backend.server/docs
  - Optional Small Language Model (AI) may be used to generate a compact description for each node
  - spaCy NLP (Natural Language Processing) library is used for parsing linear text into parts of speach, indicating how the neighborhood (edges) can be expressed
  - docker compose for the backend server
  - each graph can be saved as a compressed <graph-name>.ndf format (nobinary data is stored in the ndf file), when decompressed expands into a single folder.
- Frontend
  - Vite + React
  - CNL Editor uses Monaco editor in markdown mode
  - Node's edges are defined using a CNL code block 
  - Each Node is presented as NodeCard with the edges shown in CNL as well as rendered in HTML
  - Graph is presented through Cytoscape.js library
  - Raw data is shown in JSON, YAML, and CNL formats
  - Scorecard computes score using a transparent rubric
  - Frontend can be used independently and can be connected to different servers  


## Project Structure

```
nodeBook/
├── backend/         # FastAPI backend, user and graph data, API routes
├── frontend/        # React/Electron frontend, user interface
├── electron/        # Electron shell and build scripts
├── scripts/         # Deployment, migration, and utility scripts
├── graph_data/      # User and global graph data (created at runtime)
├── docs/            # Documentation and user guides
└── README.md        # this file
└── License          # AGPL v3

```


## Getting Started for Developers

### 1. **Backend Setup**

- Python 3.12+ and virtualenv recommended.
- Install dependencies:
  ```bash
  cd backend
  pip install -r requirements.txt
  ```
- Run post-install script (creates admin user, downloads spaCy model):
  ```bash
  python scripts/post_install.py
  ```
- Start the backend:
  ```bash
  uvicorn main:app --reload
  ```

### 2. **Frontend Setup**

- Node.js 18+ recommended.
- Install dependencies:
  ```bash
  cd frontend
  npm install
  ```
- Start the frontend (browser):
  ```bash
  npm run dev
  ```
- Build for production:
  ```bash
  npm run build
  ```

### 3. **Electron AppImage (Desktop App)**

- Build the Electron app:
  ```bash
  cd electron
  npm install
  npm run build
  ```
- The AppImage will be in `electron/dist/`.


## User Registration & Approval

- **Registration**: New users must provide a username, email, password, institution, and a short introduction. (We don't validate the email. No email is sent or received by the system)
- **Approval**: Admins review and approve/reject new users in the Admin Panel.
- **Login**: Only approved and active users can log in.



## Admin Features

- **User Management**: Promote/demote users, delete users, edit user info.
- **Pending Approvals**: Approve or reject new user registrations.
- **System Statistics**: View user and system stats.
- **Logs**: View and export system logs (admin only).



## Deployment & Scripts

- **`scripts/post_install.py`**: Sets up admin user and downloads required NLP models.
- **Docker**: Dockerfiles for backend and frontend are provided for containerized deployment.
- **AppImage**: Electron build scripts create a portable desktop app.

## Documentation

- See `docs/` for:
  - API documentation
  - User guides
  - CNL syntax and examples
  - Developer notes
  - Dynamically published at https://docs.nodeBook.in 

---

## Security & Logging

- Only CUD actions are logged for regular users.
- System logs and user management are restricted to admins.
- JWT tokens are checked for inactivity and expiration.

---

## 📝 License

This project is licensed under the **AGPL v3**, which grants freedom to read, modify, distribute the changes under the same license. Read full details from https://www.gnu.org/licenses/agpl-3.0.en.html 

---

## 🌍 Project Origin

The archhitectural details of this software are derived from the research and development work of [https://www.gnowledge.org](https://www.gnowledge.org)

---

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

---

## Prerequisites

- Python 3.12+ with virtual environment activated
- Node.js 18+ with npm
- All dependencies installed (see Installation section above)

---

**Note:**  
- The project is under active development. Features and APIs may change.
- For questions or support, please contact the maintainers or open an issue.
