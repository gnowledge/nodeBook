"""
NDF Studio Core Data Models

This module defines the core data models used throughout the NDF Studio backend.
These models represent the fundamental entities in the Node-neighborhood Description Framework.

Classes:
    Relation: Represents a fundamental edge/relationship between nodes
    AttributeNode: Scalar value modeled as a node-connected attribute
    Attribute: Legacy attribute model for backward compatibility
    Node: Legacy mono-morphic node model
    Morph: Represents a variation in neighborhood
    PolyNode: Polymorphic node model with multiple morphs
    Transition: Represents state transitions with optional tense
    Function: Represents functional transformations
    RelationNode: Relation modeled as a node-connected entity
"""

from pydantic import BaseModel
from typing import Optional, List, Union, Literal

# Fundamental edge type
class Relation(BaseModel):
    """
    Represents a fundamental edge/relationship between nodes in the graph.
    
    This model defines the basic structure for relationships between nodes,
    including optional adverbs and modalities to qualify the relationship.
    
    Attributes:
        id (str): Unique identifier for the relation
        name (str): Name/type of the relation (e.g., "contains", "is_a")
        source (str): ID of the source node
        target (str): ID of the target node
        adverb (Optional[str]): Optional adverb to qualify the relation
        modality (Optional[str]): Optional modality (e.g., "possibly", "necessarily")
    """
    id: str
    name: str
    source: str
    target: str
    adverb: Optional[str] = None
    modality: Optional[str] = None

# Scalar value modeled as a node-connected attribute
class AttributeNode(BaseModel):
    """
    Scalar value modeled as a node-connected attribute.
    
    This model represents attributes that are connected to nodes,
    allowing for more complex attribute structures than simple key-value pairs.
    
    Attributes:
        id (Optional[str]): Unique identifier for the attribute node
        name (str): Name of the attribute
        source_id (str): ID of the node this attribute belongs to
        value (Union[str, float, int, bool]): The attribute value
        unit (Optional[str]): Optional unit of measurement
        adverb (Optional[str]): Optional adverb to qualify the attribute
        modality (Optional[str]): Optional modality for the attribute
        morph_id (Optional[List[str]]): List of morph IDs this attribute belongs to
    """
    id: Optional[str] = None
    name: str
    source_id: str
    value: Union[str, float, int, bool]
    unit: Optional[str] = None
    adverb: Optional[str] = None
    modality: Optional[str] = None
    morph_id: Optional[List[str]] = None

# Legacy attribute model for backward compatibility
class Attribute(BaseModel):
    """
    Legacy attribute model for backward compatibility.
    
    This model represents simple key-value attributes attached to nodes.
    It's maintained for backward compatibility with existing code.
    
    Attributes:
        id (str): Unique identifier for the attribute
        node_id (str): ID of the node this attribute belongs to
        name (str): Name of the attribute
        value (Union[str, float, int, bool, None]): The attribute value
        unit (Optional[str]): Optional unit of measurement
        adverb (Optional[str]): Optional adverb to qualify the attribute
        modality (Optional[str]): Optional modality for the attribute
    """
    id: str
    node_id: str
    name: str
    value: Union[str, float, int, bool, None] = None
    unit: Optional[str] = None
    adverb: Optional[str] = None
    modality: Optional[str] = None

# Legacy mono-morphic node model
class Node(BaseModel):
    """
    Legacy mono-morphic node model.
    
    This model represents a simple node with a single neighborhood.
    It's maintained for backward compatibility with existing code.
    
    Attributes:
        id (Optional[str]): Unique identifier for the node
        name (str): Name of the node
        base_name (Optional[str]): Base name without qualifiers
        qualifier (Optional[str]): Optional qualifier for the node
        role (Optional[Literal["class", "individual", "process"]]): Role of the node
        description (Optional[str]): Optional description of the node
        attributes (List[Attribute]): List of attributes attached to the node
        relations (List[Relation]): List of relations connected to the node
    """
    id: Optional[str] = None
    name: str
    base_name: Optional[str] = None
    qualifier: Optional[str] = None  # <-- allow any string, not Literal
    role: Optional[Literal["class", "individual", "process"]] = None
    description: Optional[str] = None
    attributes: List[Attribute] = []
    relations: List[Relation] = []

# Morph represents a variation in neighborhood
class Morph(BaseModel):
    """
    Represents a variation in neighborhood.
    
    A morph defines a specific variation or context of a polymorphic node.
    Each morph can have its own set of relations and attributes.
    
    Attributes:
        morph_id (str): Unique identifier for the morph
        node_id (str): ID of the parent polymorphic node
        name (str): Name of the morph
        relationNode_ids (Optional[List[str]]): List of relation node IDs in this morph
        attributeNode_ids (Optional[List[str]]): List of attribute node IDs in this morph
    """
    morph_id: str
    node_id: str
    name: str
    relationNode_ids: Optional[List[str]] = []
    attributeNode_ids: Optional[List[str]] = []

# Polymorphic node model
class PolyNode(BaseModel):
    """
    Polymorphic node model with multiple morphs.
    
    This model represents a node that can exist in multiple variations (morphs),
    each with its own neighborhood of relations and attributes.
    
    Attributes:
        id (Optional[str]): Unique identifier for the polymorphic node
        name (Optional[str]): Computed name from base_name + adjective
        base_name (str): Required base name for ID generation
        adjective (Optional[str]): Optional adjective to qualify the node
        quantifier (Optional[str]): Optional quantifier (e.g., "all", "some")
        role (Optional[str]): Role of the node, defaults to "individual"
        description (Optional[str]): Optional description of the node
        morphs (Optional[List[Morph]]): List of morphs for this node
        nbh (Optional[str]): Currently active morph name
    """
    id: Optional[str] = None  # Optional since we compute it during creation
    name: Optional[str] = None  # Optional since we can compute it from base_name + adjective
    base_name: str  # Required for ID generation
    adjective: Optional[str] = None
    quantifier: Optional[str] = None
    role: Optional[str] = "individual"  # Default to individual like Node model
    description: Optional[str] = None
    morphs: Optional[List[Morph]] = []
    nbh: Optional[str] = None  # currently active morph

# Transition with optional tense
class Transition(BaseModel):
    """
    Represents state transitions with optional tense.
    
    This model defines transitions between different states or morphs of nodes,
    including temporal information about when the transition occurs.
    
    Attributes:
        id (str): Unique identifier for the transition
        name (Optional[str]): Name of the transition
        adjective (Optional[str]): Optional adjective to qualify the transition
        tense (Optional[str]): Tense of the transition (e.g., "past", "present", "future")
        inputs (List[dict]): List of input nodes with their morphs
        outputs (List[dict]): List of output nodes with their morphs
        description (Optional[str]): Optional description of the transition
    """
    id: str
    name: Optional[str]
    adjective: Optional[str] = None
    tense: Optional[str] = None  # e.g., "past", "present", "future"
    inputs: List[dict]  # {id: node_id, nbh: morph_name}
    outputs: List[dict]
    description: Optional[str] = None

# Functional transformation
class Function(BaseModel):
    """
    Represents functional transformations.
    
    This model defines functions that transform inputs into outputs,
    representing computational or logical operations in the graph.
    
    Attributes:
        id (str): Unique identifier for the function
        name (Optional[str]): Name of the function
        inputs (List[str]): List of input node IDs
        outputs (List[str]): List of output node IDs
        description (Optional[str]): Optional description of the function
    """
    id: str
    name: Optional[str]
    inputs: List[str]
    outputs: List[str]
    description: Optional[str] = None

# Relation modeled as a node-connected entity
class RelationNode(BaseModel):
    """
    Relation modeled as a node-connected entity.
    
    This model represents relations as first-class nodes in the graph,
    allowing for more complex relationship structures.
    
    Attributes:
        id (Optional[str]): Unique identifier for the relation node
        name (str): Name of the relation
        source_id (str): ID of the source node
        target_id (str): ID of the target node
        adverb (Optional[str]): Optional adverb to qualify the relation
        modality (Optional[str]): Optional modality for the relation
        morph_id (Optional[List[str]]): List of morph IDs this relation belongs to
    """
    id: Optional[str] = None
    name: str
    source_id: str
    target_id: str
    adverb: Optional[str] = None
    modality: Optional[str] = None
    morph_id: Optional[List[str]] = None
