const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'ind-nl-2026-03-11.csv');
const jsonPath = path.join(__dirname, 'ind_sponsors.json');

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split(/\r?\n/);

const sponsors = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Since we only care about the last column (data/company name), and the preceding columns are predictable:
  // "order","url","phone","company_name"
  // Let's use a regex to extract the company name.
  // The first three columns are "123","http...","456",
  
  // A robust approach without external libraries:
  let match = line.match(/^"([^"]*)","([^"]*)","([^"]*)","(.*)"$/);
  // sometimes it might not have quotes around some fields?
  // Looking at the view_file output, all fields are consistently quoted.
  
  if (match) {
    let companyName = match[4];
    // Unescape double quotes: """"Aa-Dee"""" -> ""Aa-Dee""
    // Standard CSV escapes " as "".
    companyName = companyName.replace(/""/g, '"');
    
    // Some names from scraper might have excess quotes like ""Aa-Dee"" Machinefabriek, we could clean them:
    companyName = companyName.replace(/^"+|"+$/g, '').trim(); 
    
    if (companyName) {
      sponsors.add(companyName);
    }
  } else {
    // Fallback if the line format is slightly different
    console.warn(`Could not parse line ${i}: ${line.substring(0, 50)}...`);
  }
}

const arr = Array.from(sponsors);
arr.sort((a,b) => a.localeCompare(b));

fs.writeFileSync(jsonPath, JSON.stringify(arr, null, 2), 'utf8');
console.log(`Successfully extracted ${arr.length} sponsors to ${jsonPath}`);
