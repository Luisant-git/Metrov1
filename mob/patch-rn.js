const fs = require('fs');
const path = require('path');

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      patchDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const before = content;
      // Replace this.#prop with this._prop
      content = content.replace(/this\.#([a-zA-Z_]\w*)/g, 'this._$1');
      
      // Replace #prop; with _prop; (class field declarations)
      content = content.replace(/(\s+)#([a-zA-Z_]\w*)(\s*[:;=])/g, '$1_$2$3');
      
      if (before !== content) {
        fs.writeFileSync(fullPath, content);
        console.log('Patched ' + fullPath);
      }
    }
  }
}

patchDir(path.join(__dirname, 'node_modules/react-native/src/private/webapis'));
console.log('Patching React Native complete!');
