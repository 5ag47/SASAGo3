import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const errors = [];
function inspect(folder, forbidden, browserGlobals = false) {
  for (const entry of readdirSync(resolve(root, folder), { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) {
      inspect(path, forbidden, browserGlobals);
      continue;
    }
    if (!/\.(jsx?|mjs)$/.test(entry.name)) continue;
    const source = readFileSync(resolve(root, path), 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g))
      if (forbidden.test(match[1])) errors.push(`${path}: forbidden dependency ${match[1]}`);
    if (
      browserGlobals &&
      /\b(?:window|document|localStorage|sessionStorage|fetch)\b/.test(
        source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''),
      )
    )
      errors.push(
        `${relative(root, resolve(root, path))}: domain code must not depend on browser/network globals`,
      );
  }
}
inspect('src/domain', /(?:react|features|platform|server)/, true);
inspect('src/platform', /(?:features|server\/)/);
inspect('server', /(?:react|features)/);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Architecture boundaries valid.');
