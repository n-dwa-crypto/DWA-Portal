import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const publicDirPath = path.join(process.cwd(), 'public', 'data');

// Ensure public/data directory exists
if (!fs.existsSync(publicDirPath)) {
  fs.mkdirSync(publicDirPath, { recursive: true });
}

// Function to convert a single CSV file to JSON
const convertCsvToJson = (fileName) => {
  const csvPath = path.join(dataDir, fileName);
  const jsonFileName = fileName.replace('.csv', '.json');
  const jsonPath = path.join(publicDirPath, jsonFileName);

  try {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const headers = lines[0].split(',');

    const result = lines.slice(1).map(line => {
      // Robust CSV parser that handles quotes and commas within quotes
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!values) return null;
      
      const obj = {};
      headers.forEach((header, i) => {
        let val = values[i] ? values[i].replace(/"/g, '') : '';
        // Try to parse numbers
        if (!isNaN(val) && val.trim() !== '') {
          obj[header.trim()] = Number(val);
        } else {
          obj[header.trim()] = val;
        }
      });
      return obj;
    }).filter(Boolean);

    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`Successfully converted ${fileName} to ${jsonFileName}`);
  } catch (error) {
    console.error(`Error converting ${fileName}:`, error);
  }
};

// Process all CSV files in the data directory
try {
  const files = fs.readdirSync(dataDir);
  const csvFiles = files.filter(file => file.endsWith('.csv'));
  
  csvFiles.forEach(convertCsvToJson);
} catch (error) {
  console.error('Error reading data directory:', error);
  process.exit(1);
}