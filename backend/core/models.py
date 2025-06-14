from pydantic import BaseModel
from typing import Optional, Union

class Attribute(BaseModel):
    id: str
    name: str
    value: Union[str, float, int, bool, None] = None
    unit: Optional[str] = None
    adverb: Optional[str] = None
    modality: Optional[str] = None

class Relation(BaseModel):
    id: str
    name: str
    source: str
    target: str
    adverb: Optional[str] = None
    modality: Optional[str] = None
