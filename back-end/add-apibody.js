const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.controller.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  // Ensure ApiBody is imported if we are going to use it
  let needsApiBodyImport = false;
  
  // regex to find methods with @Body() body: any (or similar) that don't have @ApiBody right above or near them
  // We'll just look for lines containing @Post, @Patch, @Put and then check if they have @Body()
  
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for method signatures containing @Body() body: any
    // Typically they look like: async createCourse(@Body() body: any, ...)
    if (line.includes('@Body() body: any') || line.includes('@Body() body: {') || line.includes('@Body() body')) {
      // Check if any of the previous few lines has @ApiBody
      let hasApiBody = false;
      for (let j = Math.max(0, newLines.length - 10); j < newLines.length; j++) {
        if (newLines[j] && newLines[j].includes('@ApiBody')) {
          hasApiBody = true;
          break;
        }
      }
      
      if (!hasApiBody) {
        // Find the method decorator (@Post, @Put, @Patch) or the line before the method signature
        // We'll inject @ApiBody({ schema: { type: 'object', additionalProperties: true } }) right before the current line
        const match = line.match(/^(\s*)(async )?[a-zA-Z0-9_]+\s*\(/);
        if (match) {
           const indent = match[1];
           newLines.push(`${indent}@ApiBody({ schema: { type: 'object', additionalProperties: true } })`);
           needsApiBodyImport = true;
        }
      }
    }
    
    newLines.push(line);
  }
  
  if (needsApiBodyImport && !content.includes('ApiBody')) {
    // try to add ApiBody to the swagger imports
    const swaggerImportRegex = /import\s+{([^}]*)}\s+from\s+['"]@nestjs\/swagger['"];/;
    const swaggerMatch = originalContent.match(swaggerImportRegex);
    if (swaggerMatch) {
      const imports = swaggerMatch[1];
      const newImports = imports + ', ApiBody';
      content = newLines.join('\n').replace(swaggerMatch[0], `import {${newImports}} from '@nestjs/swagger';`);
    } else {
      content = "import { ApiBody } from '@nestjs/swagger';\n" + newLines.join('\n');
    }
  } else {
    content = newLines.join('\n');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

walkDir(path.join(__dirname, 'src'), processFile);
