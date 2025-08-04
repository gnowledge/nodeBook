const fs = require('fs').promises;
const { Graph } = require('./graph');

/**
 * Reads a .ndf file and returns a Graph instance.
 * Assumes the file content is JSON.
 * @param {string} filePath
 * @returns {Promise<Graph>}
 */
async function readNdf(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(data);
    return Graph.fromJSON(json);
  } catch (error) {
    // If the file doesn't exist or is empty, return a new graph
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      console.log('No existing graph found or file is empty. Starting fresh.');
      return new Graph();
    }
    throw error;
  }
}

/**
 * Writes a Graph instance to a .ndf file as JSON.
 * @param {string} filePath
 * @param {Graph} graph
 * @returns {Promise<void>}
 */
async function writeNdf(filePath, graph) {
  const json = graph.toJSON();
  await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf8');
}

module.exports = { readNdf, writeNdf };
