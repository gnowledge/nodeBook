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

### 2. Displacement
**Function Name**: `displacement`  
**Description**: Calculates the displacement from initial position to current position  
**Formula**: `√[(x-x₀)² + (y-y₀)² + (z-z₀)²]`  
**Required Attributes**:
- `position x`, `position y`, `position z` (current position)
- `initial position x`, `initial position y`, `initial position z` (starting position)

**Use Case**: Measuring the straight-line distance from where an object started to where it is now

### 3. Speed
**Function Name**: `speed`  
**Description**: Calculates the speed (distance traveled over time)  
**Formula**: `distance / (time - previous time)`  
**Required Attributes**:
- All attributes from `distance` function
- `time` (current time)
- `previous time` (previous time)

**Use Case**: Measuring how fast an object is moving (scalar quantity)

### 4. Velocity Magnitude
**Function Name**: `velocity_magnitude`  
**Description**: Calculates the magnitude of velocity (displacement over time)  
**Formula**: `displacement / (time - previous time)`  
**Required Attributes**:
- All attributes from `displacement` function
- `time` (current time)
- `previous time` (previous time)

**Use Case**: Measuring the rate of change of position (vector quantity magnitude)

### 5. Acceleration
**Function Name**: `acceleration`  
**Description**: Calculates acceleration (change in velocity over time)  
**Formula**: `(velocity₂ - velocity₁) / (time - previous time)`  
**Required Attributes**:
- All attributes from `speed` function
- `previous previous position x/y/z` (two positions back)
- `previous previous time` (two times back)

**Use Case**: Measuring how quickly an object's speed is changing

## Mathematical Operations Supported

The physics functions use these mathematical operations:
- **Basic Arithmetic**: `+`, `-`, `*`, `/`
- **Power**: `power(base, exponent)` - e.g., `power(x, 2)` for x²
- **Square Root**: `sqrt(value)` - e.g., `sqrt(25)` for √25
- **Absolute Value**: `abs(value)` - e.g., `abs(-5)` for |5|

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

## Next Steps
- Experiment with different position values
- Try creating graphs with multiple objects
- Explore the relationship between distance, speed, and acceleration
- Use these functions for real-world physics problems

The physics functions system is designed to make complex calculations accessible while maintaining mathematical accuracy and educational value.
