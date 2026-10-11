const fs = require('fs');
const content = fs.readFileSync('JS/app.common.js', 'utf8');
// Remove the duplicate corrupted tail: }ed subject ...
const fixed = content.replace(/\}ed subject "\$\{updatedName\}"\.`, 'success'\);\r?\n\s*\}\r?\n\s*\]\);\r?\n\}/, '}');
if (fixed === content) {
  console.log('Pattern not found, trying alternate...');
  // Try line-by-line
  const lines = content.split('\n');
  const badLineIdx = lines.findIndex(l => l.includes('}ed subject'));
  if (badLineIdx !== -1) {
    console.log('Found bad line at:', badLineIdx + 1, ':', JSON.stringify(lines[badLineIdx]));
    // Remove lines badLineIdx through badLineIdx+3
    lines.splice(badLineIdx, 4);
    fs.writeFileSync('JS/app.common.js', lines.join('\n'), 'utf8');
    console.log('Removed bad lines');
  } else {
    console.log('Bad line not found');
  }
} else {
  fs.writeFileSync('JS/app.common.js', fixed, 'utf8');
  console.log('Fixed via regex');
}
