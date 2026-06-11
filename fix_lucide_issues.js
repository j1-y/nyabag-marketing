const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Fix "use client"
      if (content.includes('"use client"') || content.includes("'use client'")) {
        content = content.replace(/['"]use client['"];?\s*/g, '');
        content = '"use client";\n\n' + content;
        modified = true;
      }

      // Fix Link conflicts
      if (content.includes('import {') && content.includes('} from "lucide-react"')) {
        const importRegex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/;
        const match = importRegex.exec(content);
        if (match) {
          let imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
          if (imports.includes('Link')) {
            imports = imports.filter(i => i !== 'Link');
            imports.push('Link as LinkIcon');
            content = content.replace(importRegex, `import { ${imports.join(', ')} } from "lucide-react"`);
            // Find <Link> without href and change to <LinkIcon>
            // We'll just replace <Link with <LinkIcon if it has size= or similar icon props
            content = content.replace(/<Link(\s+size|\s+className|\s+weight|\s*\/?\s*>)/g, '<LinkIcon$1');
            modified = true;
          }
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed ' + fullPath);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
