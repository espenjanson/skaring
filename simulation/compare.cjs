// Compile the standalone comparator in memory with the existing TypeScript dependency.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, 'compare.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
const localRequire = name => name.startsWith('../src/')
  ? require('../tests/helpers/loadTypeScript.cjs').loadTypeScript(name.slice('../src/'.length) + '.ts')
  : require(name);
new Function('exports', 'module', 'require', compiled)(loaded.exports, loaded, localRequire);
module.exports = loaded.exports;
if (require.main === module) {
  try { process.exitCode = loaded.exports.main(process.argv.slice(2)); }
  catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
