# Complex Data Types Guide

## Overview
NodeBook now supports complex data types that allow you to define structured attributes with internal components. This makes the system more elegant and educational, teaching students about data structures and type systems.

## What Are Complex Data Types?

Complex data types are attributes that contain multiple values organized in a structured way, similar to how `datetime` contains year, month, day, hour, minute, and second.

### Examples:
- **Position**: `(x, y, z)` coordinates
- **Time**: `(value, unit)` with value and unit
- **GPS**: `(lat, long, alt, timestamp)` coordinates with time

## Available Complex Data Types

### 1. Position
**Type**: `complex`  
**Complex Type**: `position`  
**Structure**:
```json
{
  "x": {"type": "float", "unit": "meters (m)", "description": "X-coordinate"},
  "y": {"type": "float", "unit": "meters (m)", "description": "Y-coordinate"},
  "z": {"type": "float", "unit": "meters (m)", "description": "Z-coordinate"}
}
```

**Usage in CNL**:
```
Car "MyCar" {
  has "position" = (25.0, 15.0, 0.0)
}
```

### 2. Time
**Type**: `complex`  
**Complex Type**: `time`  
**Structure**:
```json
{
  "value": {"type": "float", "unit": "seconds (s)", "description": "Time value"},
  "unit": {"type": "string", "unit": null, "description": "Time unit"}
}
```

**Usage in CNL**:
```
Car "MyCar" {
  has "time" = (5.0, "seconds")
}
```

### 3. GPS
**Type**: `complex`  
**Complex Type**: `gps`  
**Structure**:
```json
{
  "lat": {"type": "float", "unit": "degrees", "description": "Latitude"},
  "long": {"type": "float", "unit": "degrees", "description": "Longitude"},
  "alt": {"type": "float", "unit": "meters (m)", "description": "Altitude"},
  "timestamp": {"type": "datetime", "unit": null, "description": "GPS timestamp"}
}
```

**Usage in CNL**:
```
Drone "MyDrone" {
  has "gps" = (37.7749, -122.4194, 100.0, "2024-01-01T12:00:00Z")
}
```

## How Complex Data Types Work

### 1. Schema Definition
Complex data types are defined in the Attribute Types schema with:
- `data_type: "complex"`
- `complex_type: "type_name"`
- `structure: {...}` defining internal components

### 2. Value Assignment
Values are assigned using tuple notation:
```
has "position" = (x, y, z)
has "time" = (value, unit)
```

### 3. Access in Functions
Functions can access individual components:
```
let $p$ be "position";
let $x$ be $p$.x;
let $y$ be $p$.y;
let $z$ be $p$.z;
```

## Benefits of Complex Data Types

### 1. **Educational Value**
- Students learn about data structures
- Understanding of type systems
- Real-world modeling concepts

### 2. **Elegant Functions**
- Clean mathematical notation
- No more separate x, y, z attributes
- Functions look like proper equations

### 3. **Real-World Modeling**
- GPS coordinates as single attribute
- Position as single 3D point
- Time with value and unit

### 4. **Leverages Existing System**
- Uses polymorphic nodes
- Works with transitions
- Morph-based state changes

## Using Complex Data Types with Morphs

### Basic Morph Pattern
```
# Morph 1: Initial state
Car "MyCar" {
  has "position" = (0.0, 0.0, 0.0)
  has "time" = (0.0, "seconds")
}

# Morph 2: After movement
Car "MyCar" {
  has "position" = (25.0, 15.0, 0.0)
  has "time" = (5.0, "seconds")
}

# Morph 3: Further movement
Car "MyCar" {
  has "position" = (50.0, 30.0, 0.0)
  has "time" = (10.0, "seconds")
}
```

### Function Access
Functions can access different morph states:
```
let $p_1$ be "position" from morph 2;  // current position
let $p_0$ be "position" from morph 1;  // initial position
let $t_1$ be "time" from morph 2;      // current time
let $t_0$ be "time" from morph 1;      // initial time

let delta_p be $p_1$ - $p_0$;
let delta_t be $t_1$ - $t_0$;
```

## Creating Custom Complex Data Types

### Structure Definition
```json
{
  "name": "custom_type",
  "data_type": "complex",
  "complex_type": "custom",
  "structure": {
    "component1": {"type": "float", "unit": "unit1", "description": "Description"},
    "component2": {"type": "string", "unit": null, "description": "Description"}
  }
}
```

### Example: Velocity Vector
```json
{
  "name": "velocity",
  "data_type": "complex",
  "complex_type": "vector3d",
  "structure": {
    "vx": {"type": "float", "unit": "m/s", "description": "X-velocity"},
    "vy": {"type": "float", "unit": "m/s", "description": "Y-velocity"},
    "vz": {"type": "float", "unit": "m/s", "description": "Z-velocity"}
  }
}
```

## Best Practices

### 1. **Naming Conventions**
- Use descriptive names: `position`, `gps`, `velocity`
- Avoid generic names like `data`, `info`

### 2. **Structure Design**
- Keep components logically related
- Use consistent units within a type
- Provide clear descriptions

### 3. **Value Assignment**
- Use consistent tuple order
- Match structure definition
- Include units where applicable

### 4. **Function Usage**
- Access components using dot notation
- Use meaningful variable names
- Leverage morph system for state changes

## Examples

### Physics Example
```
# Define object with position and time
Particle "PhysicsParticle" {
  has "position" = (10.0, 20.0, 5.0)
  has "time" = (3.0, "seconds")
}

# Function calculation
let $p$ be "position";
let $t$ be "time";
let magnitude be sqrt(power($p$.x, 2) + power($p$.y, 2) + power($p$.z, 2));
```

### GPS Tracking Example
```
# Define vehicle with GPS
Vehicle "MyVehicle" {
  has "gps" = (37.7749, -122.4194, 100.0, "2024-01-01T12:00:00Z")
}

# Access GPS components
let $gps$ be "gps";
let latitude be $gps$.lat;
let longitude be $gps$.long;
let altitude be $gps$.alt;
```

## Next Steps
- Experiment with existing complex data types
- Create custom complex data types
- Use morphs for state transitions
- Build functions that work with complex types
- Explore the transition system integration

Complex data types make NodeBook more powerful and educational while maintaining elegance and mathematical clarity! 🚀
