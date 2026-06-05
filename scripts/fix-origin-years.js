#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'app', 'data', 'acquisition-trees');

function findOldestDate(node) {
  let oldestDate = null;
  let oldestTime = Infinity;
  
  if (node.date) {
    const time = new Date(node.date).getTime();
    if (!isNaN(time) && time < oldestTime) {
      oldestDate = node.date;
      oldestTime = time;
    }
  }
  
  if (node.assetsGivenUp) {
    for (const child of node.assetsGivenUp) {
      const childOldest = findOldestDate(child);
      if (childOldest) {
        const childTime = new Date(childOldest).getTime();
        if (!isNaN(childTime) && childTime < oldestTime) {
          oldestDate = childOldest;
          oldestTime = childTime;
        }
      }
    }
  }
  
  return oldestDate;
}

function calculateOriginYear(treeData) {
  const oldestDate = findOldestDate(treeData.tree);
  if (oldestDate) {
    return new Date(oldestDate).getFullYear();
  }
  // Fallback to current year if no dates found
  return new Date().getFullYear();
}

function processFile(filename) {
  const filePath = path.join(dataDir, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Check if originYear is missing
    if (!data._meta.originYear) {
      const originYear = calculateOriginYear(data);
      data._meta.originYear = originYear;
      
      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ ${filename}: Added originYear=${originYear}`);
      return true;
    } else {
      console.log(`⏭️  ${filename}: Already has originYear=${data._meta.originYear}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return false;
  }
}

// Process all JSON files
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
let updated = 0;
let total = files.length;

console.log(`🔧 Processing ${total} acquisition tree files...`);

for (const file of files) {
  if (processFile(file)) {
    updated++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total files: ${total}`);
console.log(`   Updated: ${updated}`);
console.log(`   Already had originYear: ${total - updated}`);

if (updated > 0) {
  console.log(`\n🎉 Fixed ${updated} files! The "Earliest" stat should now work for all teams.`);
}