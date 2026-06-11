const fs = require('fs');
const path = require('path');

const usedIcons = new Set();

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /import\s+\{([^}]+)\}\s+from\s+["']hugeicons-react["']/g;
      let match;
      let replaced = false;
      
      while ((match = importRegex.exec(content)) !== null) {
        const imports = match[1].split(',').map(s => s.trim().split(' as ')[0]).filter(Boolean);
        imports.forEach(i => usedIcons.add(i));
        replaced = true;
      }
      
      if (replaced) {
        content = content.replace(/from\s+["']hugeicons-react["']/g, 'from "@/components/ui/Hugeicons"');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated imports in ' + fullPath);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));

const outPath = path.join(__dirname, 'src/components/ui/Hugeicons.tsx');
let code = `import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import * as Icons from "@hugeicons/core-free-icons";

// We disable TypeScript for the proxy wrapper to prevent strict type errors if some exact name is missing
const createIcon = (name: any) => {
  return (props: any) => {
    // Attempt multiple casing variations
    const i = (Icons as any)[name] || (Icons as any)[name.replace(/Icon$/, "")] || (Icons as any)[\`\${name}Icon\`];
    if (!i) { 
      // Fallback or warning if it's strictly not found
      return null; 
    }
    return <HugeiconsIcon icon={i} {...props} />;
  }
};

`;

Array.from(usedIcons).forEach(icon => {
  code += `export const ${icon} = createIcon("${icon}");\n`;
});

fs.writeFileSync(outPath, code, 'utf8');
console.log('Generated Hugeicons.tsx with ' + usedIcons.size + ' icons');
