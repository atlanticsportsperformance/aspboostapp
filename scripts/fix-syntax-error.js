const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'dashboard', 'workouts', 'exercise-detail-panel.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The issue: Missing closing parenthesis for the inner ternary
// Line 517 has </> which closes the fragment
// But we need a closing ) after </> and before the outer ternary's ) : (

// Replace line 517's </> with </>)
content = content.replace(
  /(\s+)<\/>\n(\s+)\) : \(\n(\s+)\/\* Per-Set Mode \*\//,
  '$1</>\n$1)\n$2) : (\n$3/* Per-Set Mode */'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✓ Fixed nested ternary syntax in exercise-detail-panel.tsx');
