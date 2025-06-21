# Global Schema Definitions

This directory contains the global schema definitions for NDF Studio. These schemas provide a foundation of commonly used node types, attribute types, relation types, transition types, and function types that are available to all users.

## Files

- `node_types.json` - Core node types including class, individual, transition, function, and popular ontology classes
- `attribute_types.json` - Comprehensive attribute types covering identifiers, temporal, spatial, physical, and metadata properties
- `relation_types.json` - Essential relation types for hierarchical, spatial, temporal, social, and functional relationships
- `transition_types.json` - Transition types for state changes and processes
- `function_types.json` - Function types for computational operations

## Schema Categories

### Node Types (30 total)
- **Core Types**: class, individual, transition, function
- **Top-level Ontology Classes**: Person, Organization, Place, Event, Object, Document, Concept, Time, Location, Element, Substance, Quantity
- **Geographic**: City, Country, Region
- **Physical Objects**: Vehicle, Particle, Electron, Ion, Field
- **States of Matter**: Gas, Liquid, Solid
- **Living Things**: Organism, Planet
- **Processes**: Reaction
- **Abstract**: Agent

### Attribute Types (50+ total)
- **Identifiers**: name, description, identifier, url, email, phone
- **Temporal**: birth_date, death_date, founded_date, start_date, end_date, created_date, modified_date
- **Spatial**: latitude, longitude, elevation, area
- **Physical Properties**: mass, temperature, velocity, energy, charge, width, height, depth, weight, volume, density
- **Metadata**: status, type, category, tag, version, language, format, size
- **Document Properties**: author, publisher, isbn, issn
- **Commercial**: price, currency, rating, score
- **Quantitative**: count, percentage, frequency, duration, distance

### Relation Types (30+ total)
- **Hierarchical**: is_a, part_of, contains, parent_of
- **Spatial**: located_in, neighbour_of
- **Temporal**: before, happened_at, happened_during
- **Social**: friend_of, sibling_of, spouse_of, works_for, collaborates_with
- **Organizational**: member_of, founded, owns, employs
- **Creative**: created, authored, published
- **Event-related**: attended, organized
- **Functional**: uses, produces, sells, buys, depends_on
- **Causal**: causes, influences
- **Educational**: studies, teaches, specializes_in
- **Similarity**: similar_to, related_to
- **Process**: replaces, connects, leads_to

## Schema Consistency

All schemas are now consistent with:
- **Proper Case**: All class names use proper case (e.g., "Person" not "person")
- **Complete Coverage**: All domain and range references in relations and attributes correspond to existing node types
- **Hierarchical Structure**: Node types have proper parent-child relationships
- **Logical Grouping**: Related types are grouped together (e.g., states of matter, geographic entities)

## Usage

These global schemas are read-only and serve as a foundation. Users can create their own schema elements in their user space that extend or specialize these global definitions.

## Contributing

To add new global schema elements:

1. **Node Types**: Add to `node_types.json` with appropriate description and parent class
2. **Attribute Types**: Add to `attribute_types.json` with data type, domain, and unit information
3. **Relation Types**: Add to `relation_types.json` with inverse name, symmetry, and transitivity properties
4. **Transition Types**: Add to `transition_types.json` for state change definitions
5. **Function Types**: Add to `function_types.json` for computational operations

All additions should follow the existing schema structure and include comprehensive descriptions. 