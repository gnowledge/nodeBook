# NodeBook

A federated, cross-platform knowledge graph application built with Node.js, React, and Fastify.

## 🚫 **Electron Builds Suspended**

**Note**: Electron desktop app builds are currently suspended due to packaging issues. The application is fully functional as a web service and can be deployed using Docker.

## 🚀 **Quick Start**

### 1. Environment Setup (Recommended)

To ensure you are using the correct version of Node.js, it is recommended to use [nvm](https://github.com/nvm-sh/nvm).

Once you have `nvm` installed, you can run the following command in the project root to automatically switch to the correct Node.js version:

```bash
nvm use
```

### 2. Install Dependencies

You need to install dependencies for both the backend server and the frontend application.

**Backend:**
```bash
cd nodebook-base
npm install
```

**Frontend:**
```bash
cd nodebook-base/frontend
npm install
```

### 3. Run the Application

Use the provided scripts to start the backend and frontend servers. It is recommended to run them in separate terminal windows.

**Start the Backend:**
```bash
./scripts/start_backend.sh
```

**Start the Frontend:**
```bash
./scripts/start_frontend.sh
```

Once running, you can access the application in your browser, typically at `http://localhost:5173`.

## How to Use

The primary way to interact with the graph is through the CNL (Controlled Natural Language) input panel.

- **Define a Node:** Use a markdown heading (`# Node Name`).
- **Define a Relation:** `<relation name> Target Node Name`
- **Define an Attribute:** `has attribute name: value`
- **Define a Unit:** `has attribute name: value *unit*`
- **Add a Description:** Use a fenced code block with the `description` tag.

### Example

```cnl
# India
<is a> Country
<located in> Asia
has population: 1.4 *billion*

```description
India is a country in South Asia.
```
```