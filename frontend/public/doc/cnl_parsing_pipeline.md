# Parse CNL Logic for Developers

Each step below is a refactored function when necessary

- loads cnl.md output is true/false, if true proceed to extract_sections
- extract_sections, output is a list of markdown sections with the text
- node_list: []
- attribute_list: [] 
- relation_list: []

## graph_description: 

If there is any free floating text prior to a section heading, not embedded after a markdown section heading, set it as graph_description, preserve all markdown markup.

## process_sections: there can be more than one section in a graph document

for each section: there can be more than one

- extract_node_name_as_is: output a string that holds markup of quantifier as well as qualifier/adjective Note: we will not throw this, it is useful for UI as it has markup, this is node_name
  - extract_base_name: input is output of extract_node_name_as_is, outputs base_name after ignoring all text within the markup
  - extract_qualifier: input is output of extract_node_name_as_is, outputs qualifier if exists, text embedded in markdown bold grouping
  - extract_quantifier: input is output of extract_node_name_as_is, outputs quantifier if exists, text embedded in markdown italics grouping
  - node_name = output of extract_node_name_as_is
  - compose_node_id: quantifier_qualifier_base_name
  - extract-description: output description text as is if present, it may have markdown markup or plain unicode text.
- update_node_list: insert node_id in the local variable node_list
- save_section_node: if not exist in the node_registry, at this stage node may has empty relations and attributes, but has all data elements of a node: id, quantifier, qualifier, base_name, name and description. update node_registry


## parse_CNL_block

- extract_text_from_cnl_block: if present extract what is embedded within :::cnl <text> ::: 

  - extract_attributes: sentence that starts with 'has' attribute_name: value_as_is
    - target_node: node_id
    - attibute_name: mandatory, if not present no attribute will be set
    - value: mandatory, if not present no attribute will be set
    - unit: if present, text embedded in markdown italics
    - extract_adverrb: if present. text embedded markdown underline ++text++
    - extract_modality: if present, text embedded square brackets [text]
    - insert_attribute: first in the local variable attribute_list, and then in the attribute array of the node_id (already exists), 

  - extract_relations: sentence that starts with <relation_name>
    - source_node: node_id
    - extract_target_node_name_as_is: output a string that holds markup of quantifier as well as qualifier/adjective Note: we will not throw this, it is useful for UI as it has markup, this is target_node_name
    - extract_target_base_name: input is output of extract_node_name_as_is, outputs base_name after ignoring all text within the markup
    - extract_target_qualifier: input is output of extract_node_name_as_is, outputs qualifier if exists, text embedded in markdown bold grouping
    - extract_target_quantifier: input is output of extract_node_name_as_is, outputs quantifier if exists, text embedded in markdown italics grouping
    - target_node_name = output of extract_target_node_name_as_is 
    - compose_target_node_id: quantifier_qualifier_base_name
    - save_target_node:  insert node_id node_list, if not exist in the node_registry. at this stage target_node has empty relations and attributes, but has all data elements of a node: id, quantifier, qualifier, base_name, name.  at this stage target_node has no description, which can be updated only after creating the node from the UI
  - insert_relation: first in the local variable relation_list, and then in the relation array of the node_id

## compose_graph: output 
  - empty json {}
  - insert graph_description: if present
  - for each item in the local variable node_list
    - insert each <node_id>.json from /userid/nodes/ 
  - save_composed_json: composed.json  
  - save_composed_yaml: for UI

In this logic, we avoid the need for parsed.json, because we hold graph_description, node_list, attribute_list and relation_list as local variables.

# Analysis Result with suggestions

What Your Pipeline Covers
File Loading & Section Extraction

Loads the CNL markdown file and checks validity.
Extracts sections as markdown blocks.
Local Variables

Maintains node_list, attribute_list, relation_list, and graph_description as local variables.
Graph Description

Captures any free-floating text before the first section as graph_description, preserving markdown.
Section Processing

For each section:
Extracts node name (with markup).
Extracts base name, qualifier (bold), quantifier (italics).
Composes a node ID.
Extracts description (if present).
Updates node_list and node_registry.
CNL Block Parsing

Extracts text from :::cnl ... ::: blocks.
Attribute extraction:
Handles attributes with name, value, unit (italics), adverb (underline), modality (square brackets).
Updates both attribute_list and the node’s attribute array.
Relation extraction:
Handles relations with source/target nodes, extracting all markup for the target node.
Updates both relation_list and the node’s relation array.
Ensures target nodes are created in the registry if not present.
Graph Composition

Outputs a composed JSON and YAML.
Inserts graph_description if present.
For each node in node_list, inserts its JSON from /userid/nodes/.
Avoids the need for a separate parsed.json by using local variables.
Strengths
Explicit, stepwise logic: Each step is clearly defined and modular.
Markup preservation: Markup is preserved for UI use.
Separation of concerns: Parsing, extraction, and composition are distinct.
Extensible: Easy to add new node/attribute/relation types or markup conventions.
Potential Gaps or Clarifications
Section Heading Detection

# Clarifications 

## How are section headings defined? (e.g., ##, ###?) Is there a minimum heading level?

- we will consider any secction heading as a node of any level, provided it has a CNL block in it. 
- secctions of any level without a CNL block will not parsed, but preserved in the CNL.md 

What if a section is missing a heading?

- ignored for parsing, but preserved in CNL.md

## Node Registry

Is the node registry in-memory for the request, or persisted? (You mention /userid/nodes/—is this a file or DB?)

- the backend maintains a node_registry.json in the directory of each user: /graph_data/users/user_id/node_registry.json 
- since nodes are the basic units to which edges are specified, an accurate node_registry is essentail. When a graph is deleted, nodes are deleted and node_registry updated
- nodes that are not part of any graph are as being part of a graph called 'orphan' 
- sample node_regisry.json
{
  "india": {
    "name": "India",
    "graphs": [
      "india"
    ],
    "created_at": "2025-06-07T17:46:31.209804",
    "updated_at": "2025-06-11T14:36:43.762849"
  },
  "biology": {
    "name": "Biology",
    "graphs": [
      "biology"
    ],
    "created_at": "2025-06-07T18:35:39.877288",
    "updated_at": "2025-06-09T11:49:52.456865"
  }
}


## Attribute/Relation Uniqueness

How are duplicate attributes or relations handled? (e.g., same attribute set twice)

- a very good gap identified. it is a very good idea to maintain a edge_registry.  There is no DB for edges, they saved in the node_id.json in the user directory. We need to compose_edge_id function is required: it is composed by: relation_id/attribute_id
- relation_id = relation_name_adverb_modality
- attribute_id = attribute_name_adverb_modality
- we can add in the registry, which node's NBH they are present
- we will keep this on hold in the current iteration. 

## Are relations directional? (It appears so, but worth confirming.)

- yes 
- based on the schema, where inverse relation names are available, we will support inferred inverese relations. 


## Error Handling

What happens if required fields are missing (e.g., attribute name or value)?
How are malformed CNL blocks handled?

- we will show a report, without stopping parsing. Failed attempts will be reported to correct, or seek help from mentors or in the forum. 

## YAML/JSON Output

Is the YAML just a serialization of the JSON, or does it have a different structure for UI?

- just a serialization of the JSON, 
- we show this as a readonly file
- we can also show the JSON as well, to educate how the data is stored

# Node Description

For target nodes created via relations, you note that description is empty and can be updated later. Is there a mechanism to update this from the UI and recompose the graph?

- DisplayHTML where the nodes are displayed as cards on a grid, can support inplace editing or through a modal. (not implemented, todo)

## Unit/Adverb/Modality Extraction

Are these always optional? What if multiple are present in a single attribute line?

- comma seperated input within the markup can be accepted. todo

#  Scalability

If the document is very large, will all nodes/attributes/relations fit in memory as local variables?

- since these are mannually created document graphs, and not loaded from a triple store, it is very unlikely that users will reach that level. 
- as we have node_registry, there is no need to create all knowledge as one single graph. Nodes are available from other graphs through the registry, hence merging and navigation through other graphs is possible. We will encourage users to create one graph each context or a few sections in each graph.

# Testing

Will you need to support round-trip tests (parse → compose → parse again)?

- round-trip tests during the development are useful

# Markdown Edge Cases

How do you handle nested markup (e.g., bold inside italics)?

- ignore inner most

What if a node name or attribute value contains markdown special characters?

- if the user insists they need them, we will have to teach them how to escape or support a stronger grouping {{preserved markdown code}} todo

