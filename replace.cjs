const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'src');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  content = content.replace(/Sanus/g, 'IdeaSaúde');
  content = content.replace(/sanus/g, 'ideasaúde');
  content = content.replace(/emerald-/g, 'blue-');
  content = content.replace(/teal-/g, 'indigo-');
  content = content.replace(/bg-green-/g, 'bg-indigo-'); // just a bit of extra color tweaking if needed
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      replaceInFile(fullPath);
    }
  }
}

processDirectory(directory);
