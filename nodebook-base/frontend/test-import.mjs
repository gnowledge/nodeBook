// test-import.mjs
import * as allTypes from './src/types.ts';
import fs from 'fs';

console.log('--- Reading file content directly ---');
try {
  const content = fs.readFileSync('./src/types.ts', 'utf-8');
  console.log(content);
  if (content.includes('CnlDiffResult')) {
    console.log('\nFile content check: PASSED. "CnlDiffResult" is in the file.');
  } else {
    console.log('\nFile content check: FAILED. "CnlDiffResult" is NOT in the file.');
  }
} catch (e) {
  console.error('Failed to read file:', e);
}


console.log('\n--- Checking Node.js import resolution ---');
console.log('Keys available in imported module:', Object.keys(allTypes));

if ('CnlDiffResult' in allTypes) {
  console.log('\nImport resolution check: PASSED. "CnlDiffResult" was successfully exported and imported.');
} else {
  console.log('\nImport resolution check: FAILED. "CnlDiffResult" was NOT exported or imported correctly.');
}

