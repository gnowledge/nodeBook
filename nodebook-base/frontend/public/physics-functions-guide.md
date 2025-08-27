# Physics Functions Guide

## Overview
NodeBook now supports advanced physics calculations through derived functions. These functions automatically calculate physical quantities like distance, displacement, speed, velocity, and acceleration based on position and time attributes.

## Available Physics Functions

### 1. Distance
**Function Name**: `distance`  
**Description**: Calculates the Euclidean distance between two 3D positions  
**Formula**: `√[(x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²]`  
**Required Attributes**:
- `position x`, `position y`, `position z` (current position)
- `previous position x`, `previous position y`, `previous position z` (previous position)

**Use Case**: Measuring how far an object has moved from its previous position

**Function Expression**:
```
let position_1 be ($"position x", "position y", "position z"$);
let position_2 be ($"previous position x", "previous position y", "previous position z"$);
let delta_x be "position x" - "previous position x";
let delta_y be "position y" - "previous position y";
let delta_z be "position z" - "previous position z";
sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2))
```

### 2. Displacement
**Function Name**: `displacement`  
**Description**: Calculates the displacement from initial position to current position  
**Formula**: `√[(x-x₀)² + (y-y₀)² + (z-z₀)²]`  
**Required Attributes**:
- `position x`, `position y`, `position z` (current position)
- `initial position x`, `initial position y`, `initial position z` (starting position)

**Use Case**: Measuring the straight-line distance from where an object started to where it is now

**Function Expression**:
```
let position_current be ($"position x", "position y", "position z"$);
let position_initial be ($"initial position x", "initial position y", "initial position z"$);
let delta_x be "position x" - "initial position x";
let delta_y be "position y" - "initial position y";
let delta_z be "position z" - "initial position z";
sqrt(power(delta_x, 2) + power(delta_y, 2) + power(delta_z, 2))
```

### 3. Speed
**Function Name**: `speed`  
**Description**: Calculates the speed (distance traveled over time)  
**Formula**: `distance / (time - previous time)`  
**Required Attributes**:
- All attributes from `distance` function
- `time` (current time)
- `previous time` (previous time)

**Use Case**: Measuring how fast an object is moving (scalar quantity)

**Function Expression**:
```
let distance be sqrt(power("position x" - "previous position x", 2) + power("position y" - "previous position y", 2) + power("position z" - "previous position z", 2));
let delta_t be "time" - "previous time";
distance / delta_t
```

### 4. Velocity Magnitude
**Function Name**: `velocity_magnitude`  
**Description**: Calculates the magnitude of velocity (displacement over time)  
**Formula**: `displacement / (time - previous time)`  
**Required Attributes**:
- All attributes from `displacement` function
- `time` (current time)
- `previous time` (previous time)

**Use Case**: Measuring the rate of change of position (vector quantity magnitude)

**Function Expression**:
```
let displacement be sqrt(power("position x" - "initial position x", 2) + power("position y" - "initial position y", 2) + power("position z" - "initial position z", 2));
let delta_t be "time" - "previous time";
displacement / delta_t
```

### 5. Acceleration
**Function Name**: `acceleration`  
**Description**: Calculates acceleration (change in velocity over time)  
**Formula**: `(velocity₂ - velocity₁) / (time - previous time)`  
**Required Attributes**:
- All attributes from `speed` function
- `previous previous position x/y/z` (two positions back)
- `previous previous time` (two times back)

**Use Case**: Measuring how quickly an object's speed is changing

**Function Expression**:
```
let velocity_1 be sqrt(power("position x" - "previous position x", 2) + power("position y" - "previous position y", 2) + power("position z" - "previous position z", 2)) / ("time" - "previous time");
let velocity_2 be sqrt(power("previous position x" - "previous previous position x", 2) + power("previous position y" - "previous previous position y", 2) + power("previous position z" - "previous previous position z", 2)) / ("previous time" - "previous previous time");
let delta_v be velocity_1 - velocity_2;
let delta_t be "time" - "previous time";
delta_v / delta_t
```

## Mathematical Operations Supported

The physics functions use these mathematical operations:
- **Basic Arithmetic**: `+`, `-`, `*`, `/`
- **Power**: `power(base, exponent)` - e.g., `power(x, 2)` for x²
- **Square Root**: `sqrt(value)` - e.g., `sqrt(25)` for √25
- **Absolute Value**: `abs(value)` - e.g., `abs(-5)` for |5|

## Let Statement Syntax

NodeBook supports a powerful `let` statement syntax that makes functions more readable and educational:

### Basic Let Statement
```
let variable_name be expression;
```

### Vector Notation with LaTeX
```
let position_1 be ($x_1, y_1, z_1$);
let position_2 be ($x_2, y_2, z_2$);
```

### Intermediate Variables
```
let delta_x be "position x" - "previous position x";
let delta_t be "time" - "previous time";
```

### Multiple Let Statements
```
let distance be sqrt(power(delta_x, 2) + power(delta_y, 2));
let speed be distance / delta_t;
```

### Benefits of Let Statements
1. **Readability**: Functions become self-documenting
2. **Educational**: Students learn proper mathematical notation
3. **Maintainability**: Easy to modify and debug
4. **Reusability**: Intermediate variables can be reused
5. **LaTeX Support**: Beautiful mathematical notation rendering

## Example Usage in CNL

### Car Movement Example
```
# Define a car with position tracking
Car "MyCar" {
  has "position x" = 10.0
  has "position y" = 5.0
  has "position z" = 0.0
  has "previous position x" = 8.0
  has "previous position y" = 4.0
  has "previous position z" = 0.0
  has "time" = 5.0
  has "previous time" = 4.0
  
  # Calculate distance traveled
  calculate "distance"
  
  # Calculate speed
  calculate "speed"
}

# Define initial position
Car "MyCar" {
  has "initial position x" = 0.0
  has "initial position y" = 0.0
  has "initial position z" = 0.0
  
  # Calculate displacement from start
  calculate "displacement"
}
```

### Ball Physics Example
```
# Define a ball with 3D position tracking
Ball "PhysicsBall" {
  has "position x" = 15.0
  has "position y" = 20.0
  has "position z" = 10.0
  has "previous position x" = 12.0
  has "previous position y" = 18.0
  has "previous position z" = 8.0
  has "time" = 3.0
  has "previous time" = 2.0
  
  # Calculate how far the ball moved
  calculate "distance"
  
  # Calculate the ball's speed
  calculate "speed"
}
```

## Educational Benefits

### Pre-College Physics Concepts
- **Vectors vs Scalars**: Understanding the difference between distance (scalar) and displacement (vector)
- **Kinematics**: Position, velocity, and acceleration relationships
- **3D Geometry**: Working with x, y, z coordinates
- **Time Derivatives**: Understanding rates of change

### Mathematical Skills
- **Pythagorean Theorem**: Applied in 3D space
- **Square Roots and Powers**: Mathematical operations
- **Units and Measurements**: Proper SI units (meters, seconds)
- **Data Analysis**: Working with multiple data points

## Best Practices

### 1. Consistent Units
- Always use SI units (meters for distance, seconds for time)
- Ensure all position values use the same coordinate system
- Keep time measurements consistent

### 2. Data Quality
- Provide realistic position values
- Ensure time values are sequential and positive
- Use sufficient decimal precision for calculations

### 3. Function Selection
- Use `distance` for movement measurement
- Use `displacement` for position change from start
- Use `speed` for rate of movement
- Use `acceleration` for rate of speed change

## Troubleshooting

### Common Issues
1. **Missing Attributes**: Ensure all required attributes are defined
2. **Invalid Values**: Check that numeric values are valid numbers
3. **Time Order**: Ensure time values are in chronological order
4. **Coordinate System**: Use consistent units and coordinate system

### Error Messages
- **"Required attributes missing"**: Add missing position or time attributes
- **"Invalid mathematical expression"**: Check for syntax errors in formulas
- **"Division by zero"**: Ensure time differences are not zero

## Advanced Usage

### Multiple Objects
You can track multiple objects and compare their physics:
```
Car "Car1" { calculate "speed" }
Car "Car2" { calculate "speed" }
# Compare speeds in your analysis
```

### Time Series Analysis
Track an object over multiple time points:
```
Ball "BouncingBall" {
  # Position at t=0
  has "initial position x" = 0.0
  
  # Position at t=1
  has "previous position x" = 5.0
  
  # Position at t=2
  has "position x" = 8.0
  
  calculate "acceleration"
}
```

## Creating Custom Functions

### Using the Let Statement Syntax

You can create your own physics functions using the same `let` statement approach:

#### Example: Kinetic Energy
```
let mass be "mass";
let velocity be "speed";
let kinetic_energy be 0.5 * mass * power(velocity, 2);
kinetic_energy
```

#### Example: Force (F = ma)
```
let mass be "mass";
let acceleration be "acceleration";
let force be mass * acceleration;
force
```

#### Example: Momentum
```
let mass be "mass";
let velocity be "speed";
let momentum be mass * velocity;
momentum
```

### Best Practices for Custom Functions

1. **Use Descriptive Names**: `delta_x` instead of `dx`
2. **Break Down Complex Calculations**: Use intermediate variables
3. **Use LaTeX for Vectors**: `($x, y, z$)` for 3D coordinates
4. **Comment Your Logic**: Add explanatory comments
5. **Test with Simple Values**: Verify your function works correctly

### Function Structure Template
```
let variable_1 be expression_1;
let variable_2 be expression_2;
let result be final_calculation;
result
```

## Next Steps
- Experiment with different position values
- Try creating graphs with multiple objects
- Explore the relationship between distance, speed, and acceleration
- Use these functions for real-world physics problems
- Create your own custom physics functions
- Experiment with the let statement syntax

The physics functions system is designed to make complex calculations accessible while maintaining mathematical accuracy and educational value. The let statement syntax makes it easy to understand and modify functions, perfect for learning and experimentation.
