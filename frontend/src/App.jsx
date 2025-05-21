import React, { useEffect, useState } from 'react'
import { fetchNodes, createNode } from './services/api.js'

export default function App() {
  const [nodes, setNodes] = useState([])
  const [newNode, setNewNode] = useState('')

  useEffect(() => {
      fetchNodes().then((res) => {
	  console.log("Fetched nodes:", res)
	  setNodes(res)
      }).catch((err) => {
	  console.error("Failed to fetch nodes:", err)
      })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newNode.trim()) return
    try {
	await createNode({ name: newNode })
	const res = await fetchNodes()
	console.log("Creating node:", newNode)
	setNodes(res)
	setNewNode('')
    } catch (err) {
	console.error("Error creating node:", err)
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>NDF Studio</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={newNode}
          placeholder="Enter node name"
          onChange={(e) => setNewNode(e.target.value)}
        />
        <button type="submit">Add Node</button>
      </form>

      <ul>
        {nodes.map((n, idx) => (
          <li key={idx}>{typeof n === 'string' ? n : n.name || JSON.stringify(n)}</li>
        ))}
      </ul>
    </div>
  )
}

