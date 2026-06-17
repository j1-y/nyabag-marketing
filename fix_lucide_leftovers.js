/* eslint-disable @typescript-eslint/no-require-imports */
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

      // Fix "type " import from lucide-react
      if (content.includes('from "lucide-react"')) {
        const importRegex = /import\s+\{([^}]+)\}\s+from\s+["']lucide-react["']/;
        const match = importRegex.exec(content);
        if (match) {
          let imports = match[1].split(',').map(s => s.trim()).filter(Boolean);
          if (imports.includes('type') || imports.includes('type ')) {
            imports = imports.filter(i => i !== 'type' && i !== 'type ');
            // If they used Icon, we should provide LucideIcon
            if (content.includes(': Icon;') || content.includes('Icon[];') || content.includes(': Icon =')) {
               if (!imports.includes('LucideIcon')) imports.push('LucideIcon');
            }
            content = content.replace(importRegex, `import { ${imports.join(', ')} } from "lucide-react"`);
            modified = true;
          }
        }
      }

      // Replace TS type usage of `Icon` to `LucideIcon`
      if (content.includes(': Icon') && !content.includes('type Icon =')) {
        content = content.replace(/: Icon/g, ': LucideIcon');
        modified = true;
      }
      if (content.includes('<Icon')) {
         // This is valid component usage, e.g. <Icon size={size} />
      }

      // Fix `weight` prop
      if (content.includes('weight=')) {
        content = content.replace(/weight="regular"/g, '');
        content = content.replace(/weight="fill"/g, 'fill="currentColor"');
        modified = true;
      }

      // Fix icon: Link to icon: LinkIcon where LinkIcon is imported
      if (content.includes('icon: Link,') && content.includes('Link as LinkIcon')) {
        content = content.replace(/icon: Link,/g, 'icon: LinkIcon,');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed leftovers in ' + fullPath);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
