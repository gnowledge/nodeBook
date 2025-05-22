import React, { useEffect, useState } from 'react'
import { fetchNodes, createNode } from './services/api.js'
import CytoscapeStudio from './CytoscapeStudio'; // adjust path as needed

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
     <div>
      <CytoscapeStudio />
    </div>

    </div>

  )
}

