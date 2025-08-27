# Functions

In nodeBook we interpret functions as **derived attributes**. They will be
included in the data exactly as attributes, except that the values
will be computed.

For example: Oxygen's atomic number is same as the number of
protons. We add the attribute number of protons as a regular
attribute, however for atomic number we use a function that says how
to compute it. in this simple case, it is same as the number of
protons. However this special attribute, will work for all the
elements.

Another example: Oxygen's atomic mass can be computed by adding the
number of neutrons and protons.

A Physics example: Given the position data and time of a car, we can
compute the distance travelled, displacement, speed, velocity,
acceleration etc.  if we know the mass, then we can also compute
force.

This is how functions are interpretted, and we expect the students to
learn the meaning of what they are from this approach. In this way
they will also know why scientists use equations, which are nothing
but derived attributes.

## Physics Functions

NodeBook now supports advanced physics calculations through derived functions. These functions automatically calculate physical quantities like distance, displacement, speed, velocity, and acceleration based on position and time attributes.

### Available Physics Functions

1. **Distance**: Calculates Euclidean distance between two 3D positions
2. **Displacement**: Calculates displacement from initial position to current position  
3. **Speed**: Calculates speed (distance traveled over time)
4. **Velocity Magnitude**: Calculates velocity magnitude (displacement over time)
5. **Acceleration**: Calculates acceleration (change in velocity over time)

### Mathematical Operations Supported

- **Basic Arithmetic**: `+`, `-`, `*`, `/`
- **Power**: `power(base, exponent)` - e.g., `power(x, 2)` for x²
- **Square Root**: `sqrt(value)` - e.g., `sqrt(25)` for √25
- **Absolute Value**: `abs(value)` - e.g., `abs(-5)` for |5|

### Let Statement Syntax

NodeBook supports a powerful `let` statement syntax that makes functions more readable and educational:

```
let $x_1$ be "position x";
let $y_1$ be "position y";
let delta_x be $x_1$ - $x_2$;
let distance be sqrt(power(delta_x, 2) + power(delta_y, 2));
```

This syntax:
- Makes functions self-documenting
- Teaches proper mathematical notation
- Supports LaTeX rendering for beautiful math
- Uses intermediate variables for clarity

### Example Usage

```
Car "MyCar" {
  has "position x" = 25.0
  has "position y" = 15.0
  has "time" = 5.0
  has "previous time" = 4.0
  
  calculate "distance"
  calculate "speed"
}
```

### Educational Benefits

- **Pre-College Physics**: Vectors vs scalars, kinematics, 3D geometry
- **Mathematical Skills**: Pythagorean theorem, square roots, powers
- **Real-World Applications**: Car movement, ball physics, rocket trajectories

For detailed documentation and examples, see:
- [Physics Functions Guide](frontend/public/physics-functions-guide.md)
- [Working Example](frontend/public/physics-example.cnl)

## Schema Functions Tab

Use the Functions tab in Schema to define new functions and view existing ones. The physics functions are pre-configured and ready to use.

