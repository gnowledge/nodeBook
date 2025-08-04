# p2p-nodebook User Guide

This guide explains how to use the `p2p-nodebook` application. You can manage a local graph database and synchronize it across multiple devices.

## Core Concepts

- **Local-First:** Your graph data is stored entirely on your device in a `hyper-db` directory. The app works offline.
- **Device Key:** Each instance of your graph has a unique, secure key that acts as its address. You use this key to sync data between your devices.

## Basic Commands

All commands are run from the `p2p-nodebook` directory using `node index.js <command>`.

### 1. Add a Node

Adds a new node (a person, place, or concept) to your graph.

```bash
node index.js add-node <node-id> "<node-label>"
```

**Example:**
```bash
# Add a node with the ID 'user1' and label "First User"
node index.js add-node user1 "First User"
```

### 2. Add an Edge

Creates a directed connection between two existing nodes.

```bash
node index.js add-edge <source-id> <target-id> "<edge-label>"
```

**Example:**
```bash
# Create an edge from 'user1' to 'user2'
node index.js add-edge user1 user2 "is friends with"
```

### 3. List Graph Contents

Displays all the nodes and edges currently in your local graph. It also shows your graph's unique key.

```bash
node index.js list
```

## Multi-Device Synchronization

This is the core P2P feature. Follow these steps to sync your graph from **Device A** (which has the data) to **Device B** (which is new).

### Step 1: On Device A (Your primary device)

First, you need to get your graph's unique key.

```bash
node index.js key
```

It will output a long string of characters. This is your secret key for this graph.
```
Graph key: 06e4ead38ef590b4e37432dce894dab7461a99824c970b71bdaf20cde7b9c18c
```

### Step 2: On Device A

Now, start the listener. This makes your device "discoverable" on the network, ready to share its data with anyone who has the key.

```bash
node index.js listen
```

The terminal will show that it's listening. Keep this process running.

### Step 3: On Device B (Your second device)

On your second device, where you have a fresh copy of the `p2p-nodebook` code, run the `sync` command using the key you got from Device A.

```bash
node index.js sync <key-from-device-a>
```

**Example:**
```bash
node index.js sync 06e4ead38ef590b4e37432dce894dab7461a99824c970b71bdaf20cde7b9c18c
```

The app will find Device A on the network and download all the graph data. After it's done, you can run `node index.js list` on Device B, and you will see the exact same nodes and edges as on Device A.

From now on, you can run `listen` on either device and `sync` on the other to keep them up-to-date.
