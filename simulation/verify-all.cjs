// Compile the reporting wrapper without modifying the approved comparator.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, 'verify-all.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
const localRequire = name => {
  if (name === './compare') return require('./compare.cjs');
  if (name === './simulate') return require('./run.cjs');
  if (name.startsWith('../src/')) return require('../tests/helpers/loadTypeScript.cjs').loadTypeScript(name.slice(7) + '.ts');
  return require(name);
};
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire);
module.exports = loaded.exports;
if (require.main === module) loaded.exports.deliverVerification(__dirname);
