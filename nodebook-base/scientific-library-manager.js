const math = require('mathjs');
// const stdlib = require('@stdlib/stdlib'); // TODO: Add when package is available

/**
 * Scientific Library Manager for NodeBook
 * Integrates Math.js and Stdlib for pre-college mathematical functions
 */
class ScientificLibraryManager {
  constructor() {
    this.libraries = {
      'mathjs': {
        name: 'Math.js',
        description: 'Extensive math library with expression parser and units',
        version: math.version,
        functions: this.discoverMathJSFunctions()
      }
      // TODO: Add stdlib when package is available
      // 'stdlib': {
      //   name: 'Stdlib',
      //   description: 'Comprehensive standard library for scientific computing',
      //   version: 'latest',
      //   functions: this.discoverStdlibFunctions()
      // }
    };
    
    this.registeredFunctions = new Map();
    this.initializeFunctions();
  }

  /**
   * Discover available Math.js functions
   */
  discoverMathJSFunctions() {
    const functions = {
      // Basic arithmetic
      'add': { description: 'Addition: a + b', category: 'Basic Math', examples: ['add(2, 3)', '2 + 3'] },
      'subtract': { description: 'Subtraction: a - b', category: 'Basic Math', examples: ['subtract(5, 2)', '5 - 2'] },
      'multiply': { description: 'Multiplication: a * b', category: 'Basic Math', examples: ['multiply(4, 3)', '4 * 3'] },
      'divide': { description: 'Division: a / b', category: 'Basic Math', examples: ['divide(10, 2)', '10 / 2'] },
      
      // Powers and roots
      'pow': { description: 'Power: a^b', category: 'Powers & Roots', examples: ['pow(2, 3)', '2^3'] },
      'sqrt': { description: 'Square root: √a', category: 'Powers & Roots', examples: ['sqrt(16)', '√16'] },
      'cbrt': { description: 'Cube root: ∛a', category: 'Powers & Roots', examples: ['cbrt(27)', '∛27'] },
      'nthRoot': { description: 'Nth root: ⁿ√a', category: 'Powers & Roots', examples: ['nthRoot(32, 5)', '⁵√32'] },
      
      // Trigonometry
      'sin': { description: 'Sine function', category: 'Trigonometry', examples: ['sin(π/2)', 'sin(90°)'] },
      'cos': { description: 'Cosine function', category: 'Trigonometry', examples: ['cos(0)', 'cos(0°)'] },
      'tan': { description: 'Tangent function', category: 'Trigonometry', examples: ['tan(π/4)', 'tan(45°)'] },
      'asin': { description: 'Arcsine function', category: 'Trigonometry', examples: ['asin(1)', 'arcsin(1)'] },
      'acos': { description: 'Arccosine function', category: 'Trigonometry', examples: ['acos(0)', 'arccos(0)'] },
      'atan': { description: 'Arctangent function', category: 'Trigonometry', examples: ['atan(1)', 'arctan(1)'] },
      
      // Logarithms
      'log': { description: 'Natural logarithm: ln(a)', category: 'Logarithms', examples: ['log(2.718)', 'ln(e)'] },
      'log10': { description: 'Base-10 logarithm: log₁₀(a)', category: 'Logarithms', examples: ['log10(100)', 'log₁₀(100)'] },
      'log2': { description: 'Base-2 logarithm: log₂(a)', category: 'Logarithms', examples: ['log2(8)', 'log₂(8)'] },
      
      // Constants
      'pi': { description: 'Mathematical constant π', category: 'Constants', examples: ['pi', 'π'] },
      'e': { description: 'Mathematical constant e', category: 'Constants', examples: ['e', '2.718...'] },
      'i': { description: 'Imaginary unit', category: 'Constants', examples: ['i', '√(-1)'] },
      
      // Absolute value and rounding
      'abs': { description: 'Absolute value: |a|', category: 'Basic Math', examples: ['abs(-5)', '|-5|'] },
      'round': { description: 'Round to nearest integer', category: 'Basic Math', examples: ['round(3.7)', '⌊3.7⌉'] },
      'floor': { description: 'Floor function: ⌊a⌋', category: 'Basic Math', examples: ['floor(3.7)', '⌊3.7⌋'] },
      'ceil': { description: 'Ceiling function: ⌈a⌉', category: 'Basic Math', examples: ['ceil(3.2)', '⌈3.2⌉'] },
      
      // Statistics
      'mean': { description: 'Arithmetic mean', category: 'Statistics', examples: ['mean([1,2,3,4,5])', 'x̄'] },
      'median': { description: 'Median value', category: 'Statistics', examples: ['median([1,2,3,4,5])', 'median'] },
      'std': { description: 'Standard deviation', category: 'Statistics', examples: ['std([1,2,3,4,5])', 'σ'] },
      'variance': { description: 'Variance', category: 'Statistics', examples: ['variance([1,2,3,4,5])', 'σ²'] },
      
      // Complex numbers
      're': { description: 'Real part of complex number', category: 'Complex Numbers', examples: ['re(3+4i)', 'Re(z)'] },
      'im': { description: 'Imaginary part of complex number', category: 'Complex Numbers', examples: ['im(3+4i)', 'Im(z)'] },
      'conj': { description: 'Complex conjugate', category: 'Complex Numbers', examples: ['conj(3+4i)', 'z*'] },
      
      // Units and conversions
      'unit': { description: 'Create unit with value', category: 'Units', examples: ['unit(5, "m")', '5 meters'] },
      'to': { description: 'Convert units', category: 'Units', examples: ['unit(5, "m").to("ft")', '5m → ft'] }
    };
    
    return functions;
  }

  /**
   * Discover available Stdlib functions
   * TODO: Uncomment when @stdlib/stdlib package is available
   */
  discoverStdlibFunctions() {
    // TODO: Implement when stdlib package is available
    return {};
    
    // const functions = {
    //   // Numerical methods
    //   'interpolate': { description: 'Interpolation between points', category: 'Numerical Methods', examples: ['interpolate(x, y, xi)'] },
    //   'integrate': { description: 'Numerical integration', category: 'Numerical Methods', examples: ['integrate(f, a, b)'] },
    //   'differentiate': { description: 'Numerical differentiation', category: 'Numerical Methods', examples: ['differentiate(f, x)'] },
    //   
    //   // Linear algebra
    //   'matrix': { description: 'Create matrix', category: 'Linear Algebra', examples: ['matrix([[1,2],[3,4]])'] },
    //   'det': { description: 'Matrix determinant', category: 'Linear Algebra', examples: ['det(A)'] },
    //   'inv': { description: 'Matrix inverse', category: 'Linear Algebra', examples: ['inv(A)'] },
    //   'eigenvalues': { description: 'Matrix eigenvalues', category: 'Linear Algebra', examples: ['eigenvalues(A)'] },
    //   
    //   // Statistics
    //   'correlation': { description: 'Correlation coefficient', category: 'Statistics', examples: ['correlation(x, y)'] },
    //   'regression': { description: 'Linear regression', category: 'Statistics', examples: ['regression(x, y)'] },
    //   'tTest': { description: 'T-test for hypothesis testing', category: 'Statistics', examples: ['tTest(sample1, sample2)'] },
    //   
    //   // Signal processing
    //   'fft': { description: 'Fast Fourier Transform', category: 'Signal Processing', examples: ['fft(signal)'] },
    //   'filter': { description: 'Digital filtering', category: 'Signal Processing', examples: ['filter(signal, filter)'] },
    //   
    //   // Special functions
    //   'gamma': { description: 'Gamma function', category: 'Special Functions', examples: ['gamma(x)'] },
    //   'beta': { description: 'Beta function', category: 'Special Functions', examples: ['beta(x, y)'] },
    //   'erf': { description: 'Error function', category: 'Special Functions', examples: ['erf(x)'] }
    // };
    // 
    // return functions;
  }

  /**
   * Initialize and register all functions
   */
  initializeFunctions() {
    // Register Math.js functions
    Object.entries(this.libraries.mathjs.functions).forEach(([name, info]) => {
      this.registerFunction('mathjs', name, info);
    });
    
    // TODO: Register Stdlib functions when package is available
    // Object.entries(this.libraries.stdlib.functions).forEach(([name, info]) => {
    //   this.registerFunction('stdlib', name, info);
    // });
  }

  /**
   * Register a function from a library
   */
  registerFunction(library, name, info) {
    const functionKey = `${library}:${name}`;
    this.registeredFunctions.set(functionKey, {
      library,
      name,
      ...info,
      fullName: `${library}:${name}`
    });
  }

  /**
   * Get all available functions
   */
  getAllFunctions() {
    return Array.from(this.registeredFunctions.values());
  }

  /**
   * Get functions by library
   */
  getFunctionsByLibrary(library) {
    return Array.from(this.registeredFunctions.values())
      .filter(func => func.library === library);
  }

  /**
   * Get functions by category
   */
  getFunctionsByCategory(category) {
    return Array.from(this.registeredFunctions.values())
      .filter(func => func.category === category);
  }

  /**
   * Search functions by name or description
   */
  searchFunctions(query) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.registeredFunctions.values())
      .filter(func => 
        func.name.toLowerCase().includes(lowerQuery) ||
        func.description.toLowerCase().includes(lowerQuery) ||
        func.category.toLowerCase().includes(lowerQuery)
      );
  }

  /**
   * Get function information
   */
  getFunctionInfo(library, name) {
    const functionKey = `${library}:${name}`;
    return this.registeredFunctions.get(functionKey);
  }

  /**
   * Validate expression using available functions
   */
  validateExpression(expression) {
    try {
      // For now, use Math.js parser for validation
      const node = math.parse(expression);
      return { valid: true, node };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Execute expression using Math.js
   */
  executeExpression(expression, scope = {}) {
    try {
      return math.evaluate(expression, scope);
    } catch (error) {
      throw new Error(`Expression execution failed: ${error.message}`);
    }
  }

  /**
   * Get library information
   */
  getLibraryInfo(library) {
    return this.libraries[library] || null;
  }

  /**
   * Get all available libraries
   */
  getAvailableLibraries() {
    return Object.keys(this.libraries);
  }
}

module.exports = ScientificLibraryManager;
