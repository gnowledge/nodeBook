
# Guide to succeed in CNL Parsing, this is not a syntax guide for CNL 

Write utility functions that does one thing and only one thing at a
time, write a test case for each of them and store the results
in-memory. the models.js 

## Processing Nodes
- extractNodes
- baseName
- adjective
- nodeid = adjective_baseName
- extractDescription if present
- extractRelations if present
- extractAttributes if present
- extractMorphs if present
- create json dict as defined in models.js

## Processing Relations

- relationName: if the mode is strict, check if the relation exists in schema, raise error
- targetNode: if target node doesn't exist, create it by same process as above
- check if the relation belongs to which morph, reference to morph
- check if adverb is expressed
- check if modality is expressed
- calculate id of the relation along with the adjective, quantifier and modality if avialable
- create json as defined in models.js

## Processing Attributes

- relationName: if the mode is strict, check if the attribute exists in schema, else raise error
- check if the attribute belongs to which morph, reference to morph
- check if adjective is expressed
- check if modality is expressed
- check if unit is expressed 
- calculate id of the attribute along with the adjective and quantifier if available
- create json as defined in models.js

## Composing Node Neighborhood

- Node's nbh cannot be composed without creating relations and attributes
- Once the template json of a node is created, it needs to be udpated as and when we process more relations and attributes
- default nbh reference to base morph

## Compose final json
- collect all the nodes in an array
- collect all the attributes in an array
- collect all the relations in an array

## Also add graph name and metadata
- grame name
- author
- modified at
- created at
- description of the graph 
