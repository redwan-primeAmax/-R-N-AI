import fs from 'fs';
import path from 'path';

function findZips(dir: string) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (file !== 'node_modules' && file !== '.git') {
          findZips(fullPath);
        }
      } else if (file.endsWith('.zip')) {
        console.log(fullPath);
      }
    }
  } catch (e) {}
}

findZips('.');
