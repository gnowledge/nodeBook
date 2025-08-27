import React, { useState, useEffect } from 'react';
import './ScientificLibraryTester.css';

interface ScientificFunction {
  library: string;
  name: string;
  description: string;
  category: string;
  examples: string[];
  fullName: string;
}

export function ScientificLibraryTester() {
  const [libraries, setLibraries] = useState<string[]>([]);
  const [functions, setFunctions] = useState<ScientificFunction[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testExpression, setTestExpression] = useState<string>('');
  const [testScope, setTestScope] = useState<string>('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch available libraries
  useEffect(() => {
    fetchLibraries();
  }, []);

  // Fetch functions when library or category changes
  useEffect(() => {
    if (selectedLibrary || selectedCategory) {
      fetchFunctions();
    }
  }, [selectedLibrary, selectedCategory]);

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }

      const response = await fetch('/api/scientific/libraries', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLibraries(data);
        if (data.length > 0) {
          setSelectedLibrary(data[0]);
        }
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch libraries');
      }
    } catch (err) {
      setError('Error fetching libraries');
    } finally {
      setLoading(false);
    }
  };

  const fetchFunctions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }

      let url = '/api/scientific/functions';
      const params = new URLSearchParams();
      
      if (selectedLibrary) params.append('library', selectedLibrary);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFunctions(data);
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch functions');
      }
    } catch (err) {
      setError('Error fetching functions');
    } finally {
      setLoading(false);
    }
  };

  const evaluateExpression = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }
      
      const response = await fetch('/api/scientific/evaluate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: testExpression,
          scope: testScope ? JSON.parse(testScope) : {}
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(data);
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Expression evaluation failed');
      }
    } catch (err) {
      setError('Error evaluating expression');
    } finally {
      setLoading(false);
    }
  };

  const validateExpression = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }
      
      const response = await fetch('/api/scientific/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: testExpression
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setError('✅ Expression is valid!');
        } else {
          setError(`❌ Expression is invalid: ${data.error}`);
        }
      } else if (response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to validate expression');
      }
    } catch (err) {
      setError('Error validating expression');
    } finally {
      setLoading(false);
    }
  };

  const getCategories = () => {
    const categories = [...new Set(functions.map(f => f.category))];
    return categories.sort();
  };

  const handleSearch = () => {
    fetchFunctions();
  };

  const insertFunction = (funcName: string) => {
    setTestExpression(prev => prev + funcName);
  };

  return (
    <div className="scientific-library-tester">
      <div className="tester-header">
        <h2>🧪 Scientific Library Tester</h2>
        <p>Test and explore Math.js functions in NodeBook</p>
      </div>

      <div className="tester-grid">
        {/* Library Selection */}
        <div className="tester-section">
          <h3>📚 Available Libraries</h3>
          <div className="library-selector">
            {libraries.map(lib => (
              <button
                key={lib}
                className={`library-btn ${selectedLibrary === lib ? 'active' : ''}`}
                onClick={() => setSelectedLibrary(lib)}
              >
                {lib}
              </button>
            ))}
          </div>
        </div>

        {/* Function Discovery */}
        <div className="tester-section">
          <h3>🔍 Function Discovery</h3>
          <div className="search-controls">
            <input
              type="text"
              placeholder="Search functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
          </div>
          
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {getCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Function List */}
        <div className="tester-section">
          <h3>📋 Available Functions ({functions.length})</h3>
          <div className="functions-list">
            {functions.map(func => (
              <div key={func.fullName} className="function-item">
                <div className="function-header">
                  <span className="function-name">{func.name}</span>
                  <span className="function-category">{func.category}</span>
                </div>
                <p className="function-description">{func.description}</p>
                <div className="function-examples">
                  {func.examples.map((example, idx) => (
                    <code key={idx} className="function-example">{example}</code>
                  ))}
                </div>
                <button
                  className="insert-function-btn"
                  onClick={() => insertFunction(func.name)}
                >
                  Insert
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Expression Testing */}
        <div className="tester-section">
          <h3>🧮 Expression Testing</h3>
          <div className="expression-tester">
            <label>
              Expression:
              <textarea
                value={testExpression}
                onChange={(e) => setTestExpression(e.target.value)}
                placeholder="Enter mathematical expression (e.g., sqrt(16) + power(2, 3))"
                rows={3}
              />
            </label>
            
            <label>
              Scope (JSON):
              <textarea
                value={testScope}
                onChange={(e) => setTestScope(e.target.value)}
                placeholder='{"x": 5, "y": 3}'
                rows={2}
              />
            </label>
            
            <div className="test-buttons">
              <button onClick={validateExpression} disabled={loading}>
                Validate
              </button>
              <button onClick={evaluateExpression} disabled={loading}>
                Evaluate
              </button>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {testResult && (
              <div className="test-result">
                <h4>Result:</h4>
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading...</div>
        </div>
      )}
    </div>
  );
}
