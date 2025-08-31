export interface Node {
  id: string;
  base_name: string;
  name: string;
  adjective: string | null;
  quantifier: string | null;
  role: string;
  description: string | null;
  parent_types: string[];
}

export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  name: string;
}

export interface Attribute {
  id: string;
  source_id: string;
  name: string;
  value: any;
}

export interface NodeType {
  name: string;
  description: string;
  parent_types: string[];
}

export interface RelationType {
  name: string;
  description: string;
  domain: string[];
  range: string[];
  symmetric: boolean;
  transitive: boolean;
}

export interface AttributeType {
  name: string;
  description: string;
  data_type: string;
  required: boolean;
  validation: string;
  unit?: string;
}

export interface FunctionType {
  name: string;
  description: string;
  expression: string;
  scope: string[];
  variables: string[];
  library: string;
  category: string;
}

export interface Graph {
  id: string;
  name: string;
  description: string;
  author: string;
  email: string;
  publication_state: 'Private' | 'P2P' | 'Public';
  createdAt: string;
  updatedAt: string;
}

// Extended interface for public graphs (includes owner information)
export interface PublicGraph extends Graph {
  owner: string;
  isPublic: true;
}