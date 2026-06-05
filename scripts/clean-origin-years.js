#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'app', 'data', 'acquisition-trees');

function processFile(filename) {
  const filePath = path.join(dataDir, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Remove originYear if it exists
    if (data._meta && data._meta.originYear !== undefined) {
      delete data._meta.originYear;
      
      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ ${filename}: Removed originYear field`);
      return true;
    } else {
      console.log(`⏭️  ${filename}: No originYear field to remove`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return false;
  }
}

// Process all JSON files
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
let removed = 0;
let total = files.length;

console.log(`🧹 Cleaning originYear fields from ${total} acquisition tree files...`);

for (const file of files) {
  if (processFile(file)) {
    removed++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total files: ${total}`);
console.log(`   Removed originYear: ${removed}`);
console.log(`   Already clean: ${total - removed}`);

if (removed > 0) {
  console.log(`\n🎉 Cleaned ${removed} files! Earliest stat now calculated dynamically.`);
}