import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'data', 'sanctions.csv');
const publicDirPath = path.join(process.cwd(), 'public', 'data');
const jsonPath = path.join(publicDirPath, 'sanctions.json');

// Ensure directory exists
if (!fs.existsSync(publicDirPath)) {
  fs.mkdirSync(publicDirPath, { recursive: true });
}

try {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',');

  const result = lines.slice(1).map(line => {
    // Basic CSV parser that handles quotes
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!values) return null;
    
    const obj = {};
    headers.forEach((header, i) => {
      let val = values[i] ? values[i].replace(/"/g, '') : '';
      obj[header.trim()] = val;
    });
    return obj;
  }).filter(Boolean);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log('Successfully converted sanctions.csv to sanctions.json');
} catch (error) {
  console.error('Error converting CSV:', error);
  process.exit(1);
}