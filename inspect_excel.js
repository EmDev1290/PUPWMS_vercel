const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const dir = path.join(__dirname, 'System_content_info');
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.xlsx'));
const output = {};
for (const file of files) {
  const full = path.join(dir, file);
  const wb = xlsx.readFile(full);
  output[file] = wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }).slice(0, 20);
    return { sheet: name, rows };
  });
}
fs.writeFileSync(path.join(__dirname, 'sample_excel_templates.json'), JSON.stringify(output, null, 2), 'utf8');
console.log('saved sample_excel_templates.json');
