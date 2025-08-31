import { loader } from '@monaco-editor/react';

// Configure Monaco Editor loader
loader.config({
  'vs/nls': {
    availableLanguages: {
      '*': 'en'
    }
  }
});

// Completely disable Monaco Editor workers to prevent loading errors
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    // Return empty string to disable workers completely
    return '';
  }
};

export default loader;
