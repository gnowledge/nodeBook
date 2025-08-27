# Scientific Library Guide

## Overview
NodeBook now integrates with professional scientific computing libraries to provide access to a vast ecosystem of mathematical functions. This system gives users access to battle-tested mathematical capabilities while maintaining the educational focus.

## Available Libraries

### 1. Math.js
**Description**: Extensive math library with expression parser and units  
**Version**: Latest  
**Focus**: Core mathematics, expressions, units, complex numbers

**Key Categories**:
- **Basic Math**: Addition, subtraction, multiplication, division
- **Powers & Roots**: Power, square root, cube root, nth root
- **Trigonometry**: Sine, cosine, tangent, arcsine, arccosine, arctangent
- **Logarithms**: Natural log, base-10 log, base-2 log
- **Constants**: π (pi), e, i (imaginary unit)
- **Statistics**: Mean, median, standard deviation, variance
- **Complex Numbers**: Real part, imaginary part, conjugate
- **Units**: Unit creation and conversion

### 2. Stdlib
**Description**: Comprehensive standard library for scientific computing  
**Version**: Latest  
**Focus**: Advanced scientific computing, numerical methods

**Key Categories**:
- **Numerical Methods**: Interpolation, integration, differentiation
- **Linear Algebra**: Matrices, determinants, inverses, eigenvalues
- **Statistics**: Correlation, regression, hypothesis testing
- **Signal Processing**: FFT, digital filtering
- **Special Functions**: Gamma, beta, error functions

## API Endpoints

### Library Information
```
GET /api/scientific/libraries          # List all available libraries
GET /api/scientific/libraries/:library # Get specific library info
```

### Function Discovery
```
GET /api/scientific/functions                    # All functions
GET /api/scientific/functions?library=mathjs    # Functions by library
GET /api/scientific/functions?category=Trigonometry # Functions by category
GET /api/scientific/functions?search=sin        # Search functions
GET /api/scientific/functions/:library/:name    # Specific function info
```

### Expression Handling
```
POST /api/scientific/validate  # Validate mathematical expression
POST /api/scientific/evaluate  # Execute expression with scope
```

## Using Scientific Functions

### 1. **Function Discovery**
Browse available functions by library, category, or search:
```javascript
// Get all Math.js functions
const mathjsFunctions = await fetch('/api/scientific/functions?library=mathjs');

// Get trigonometry functions
const trigFunctions = await fetch('/api/scientific/functions?category=Trigonometry');

// Search for specific functions
const searchResults = await fetch('/api/scientific/functions?search=sqrt');
```

### 2. **Function Information**
Each function provides:
- **Name**: Function identifier
- **Description**: What the function does
- **Category**: Mathematical category
- **Examples**: Usage examples
- **Library**: Source library

### 3. **Expression Validation**
Validate expressions before using them:
```javascript
const validation = await fetch('/api/scientific/validate', {
  method: 'POST',
  body: JSON.stringify({
    expression: 'sqrt(power(x, 2) + power(y, 2))'
  })
});
```

### 4. **Expression Execution**
Execute expressions with variable scope:
```javascript
const result = await fetch('/api/scientific/evaluate', {
  method: 'POST',
  body: JSON.stringify({
    expression: 'sqrt(power(x, 2) + power(y, 2))',
    scope: { x: 3, y: 4 }
  })
});
// Result: { result: 5, expression: "...", scope: {...} }
```

## Function Categories

### Basic Math
- **add(a, b)**: Addition
- **subtract(a, b)**: Subtraction  
- **multiply(a, b)**: Multiplication
- **divide(a, b)**: Division
- **abs(x)**: Absolute value
- **round(x)**: Round to nearest integer

### Powers & Roots
- **pow(a, b)**: Power (a^b)
- **sqrt(x)**: Square root (√x)
- **cbrt(x)**: Cube root (∛x)
- **nthRoot(x, n)**: Nth root (ⁿ√x)

### Trigonometry
- **sin(x)**: Sine function
- **cos(x)**: Cosine function
- **tan(x)**: Tangent function
- **asin(x)**: Arcsine function
- **acos(x)**: Arccosine function
- **atan(x)**: Arctangent function

### Logarithms
- **log(x)**: Natural logarithm (ln x)
- **log10(x)**: Base-10 logarithm (log₁₀ x)
- **log2(x)**: Base-2 logarithm (log₂ x)

### Constants
- **pi**: Mathematical constant π (3.14159...)
- **e**: Mathematical constant e (2.71828...)
- **i**: Imaginary unit √(-1)

### Statistics
- **mean([x1, x2, ...])**: Arithmetic mean
- **median([x1, x2, ...])**: Median value
- **std([x1, x2, ...])**: Standard deviation
- **variance([x1, x2, ...])**: Variance

### Complex Numbers
- **re(z)**: Real part of complex number
- **im(z)**: Imaginary part of complex number
- **conj(z)**: Complex conjugate

### Units
- **unit(value, unit)**: Create unit with value
- **unit(value, unit).to(targetUnit)**: Convert units

## Advanced Functions (Stdlib)

### Numerical Methods
- **interpolate(x, y, xi)**: Interpolation between points
- **integrate(f, a, b)**: Numerical integration
- **differentiate(f, x)**: Numerical differentiation

### Linear Algebra
- **matrix([[a,b],[c,d]])**: Create matrix
- **det(A)**: Matrix determinant
- **inv(A)**: Matrix inverse
- **eigenvalues(A)**: Matrix eigenvalues

### Statistics
- **correlation(x, y)**: Correlation coefficient
- **regression(x, y)**: Linear regression
- **tTest(sample1, sample2)**: T-test for hypothesis testing

## Best Practices

### 1. **Function Selection**
- Choose functions appropriate for your mathematical level
- Start with basic Math.js functions for pre-college work
- Use Stdlib functions for advanced scientific computing

### 2. **Expression Building**
- Validate expressions before using them
- Use proper mathematical notation
- Test with simple values first

### 3. **Performance**
- Cache function lists for better performance
- Use appropriate functions for your use case
- Consider library-specific optimizations

### 4. **Error Handling**
- Always validate expressions
- Handle execution errors gracefully
- Provide meaningful error messages

## Educational Benefits

### 1. **Professional Tools**
- Access to industry-standard mathematical libraries
- Learn real scientific computing practices
- Understand mathematical function ecosystems

### 2. **Mathematical Concepts**
- Explore different mathematical categories
- Understand function relationships
- Learn proper mathematical notation

### 3. **Computational Thinking**
- Expression validation and execution
- Error handling and debugging
- Performance considerations

### 4. **Real-World Applications**
- Scientific computing workflows
- Mathematical modeling
- Data analysis and statistics

## Examples

### Basic Physics Calculation
```javascript
// Kinetic energy: KE = 0.5 * m * v²
const expression = '0.5 * mass * power(velocity, 2)';
const scope = { mass: 10, velocity: 5 };

const result = await fetch('/api/scientific/evaluate', {
  method: 'POST',
  body: JSON.stringify({ expression, scope })
});
// Result: 125 (joules)
```

### Statistical Analysis
```javascript
// Standard deviation of dataset
const expression = 'std([1, 2, 3, 4, 5])';

const result = await fetch('/api/scientific/evaluate', {
  method: 'POST',
  body: JSON.stringify({ expression })
});
// Result: 1.5811...
```

### Trigonometric Calculation
```javascript
// Distance using angle and hypotenuse
const expression = 'hypotenuse * cos(angle)';
const scope = { hypotenuse: 10, angle: math.pi / 4 };

const result = await fetch('/api/scientific/evaluate', {
  method: 'POST',
  body: JSON.stringify({ expression, scope })
});
// Result: 7.0711...
```

## Next Steps
- Explore available functions by category
- Experiment with expression validation
- Build complex mathematical expressions
- Integrate with your NodeBook functions
- Create educational mathematical models

The scientific library system provides access to professional-grade mathematical capabilities while maintaining the educational focus of NodeBook! 🚀
