// src/types.ts

export interface Node {
  id: string;
  base_name: string;
  name: string;
  [key: string]: any;
}

export interface Edge {
  source: string;
  target: string;
  label: string;
}

export interface RelationType {
  name: string;
}

export interface AttributeType {
  name: string;
  data_type: string;
}
