
from pydantic import BaseModel
from typing import Optional, List, Union

# Fundamental edge type
class Relation(BaseModel):
    id: str
    name: str
    source: str
    target: str
    adverb: Optional[str] = None
    modality: Optional[str] = None

# Scalar value modeled as a node-connected attribute
class AttributeNode(BaseModel):
    id: str
    name: str
    source_id: str
    value: Union[str, float, int, bool]
    unit: Optional[str] = None
    adverb: Optional[str] = None
    modality: Optional[str] = None

# Legacy attribute model for backward compatibility
class Attribute(BaseModel):
    id: str
    node_id: str
    name: str
    value: Union[str, float, int, bool, None] = None
    unit: Optional[str] = None
    adverb: Optional[str] = None
    modality: Optional[str] = None

# Legacy mono-morphic node model
class Node(BaseModel):
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
    name: str
    relations: Optional[List[Relation]] = []

# Polymorphic node model
class PolyNode(BaseModel):
    id: str
    name: Optional[str] = None
    role: Optional[str] = "class"
    description: Optional[str] = None
    morphs: Optional[List[Morph]] = []
    nbh: Optional[str] = None  # currently active morph

# Transition with optional tense
class Transition(BaseModel):
    id: str
    name: Optional[str]
    adjective: Optional[str] = None
    tense: Optional[str] = None  # e.g., "past", "present", "future"
    inputs: List[dict]  # {id: node_id, nbh: morph_name}
    outputs: List[dict]
    description: Optional[str] = None

# Functional transformation
class Function(BaseModel):
    id: str
    name: Optional[str]
    inputs: List[str]
    outputs: List[str]
    description: Optional[str] = None
