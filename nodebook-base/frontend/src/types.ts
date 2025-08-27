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
}

export interface AttributeType {
  name: string;
  description: string;
  scope: string[];
  data_type?: string;
  unit?: string;
  allowed_values?: any;
  complex_type?: string;
  structure?: Record<string, {
    type: string;
    unit: string | null;
    description: string;
  }>;
}

export interface FunctionType {
  name: string;
  expression: string;
  scope: string[];
  description?: string;
  required_attributes?: string[];
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