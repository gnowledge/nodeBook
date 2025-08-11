function generateNodeCard(node) {
  return `
    <div class="node-card">
      <div class="node-card-header">
        <h3>${node.name}</h3>
        <span class="node-role">${node.role}</span>
      </div>
      <div class="node-card-image">
        <img src="images/${node.id}.png" alt="Subgraph for ${node.name}" />
      </div>
      ${node.description ? `<div class="node-description">${node.description}</div>` : ''}
    </div>
  `;
}

module.exports = { generateNodeCard };
