import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const errors = [];
const graph = new Map();
function inspect(folder, forbidden, browserGlobals = false) {
  for (const entry of readdirSync(resolve(root, folder), { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) {
      inspect(path, forbidden, browserGlobals);
      continue;
    }
    if (!/\.(jsx?|mjs)$/.test(entry.name)) continue;
    const source = readFileSync(resolve(root, path), 'utf8');
    const edges = [];
    for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      if (forbidden.test(match[1])) errors.push(`${path}: forbidden dependency ${match[1]}`);
      if (match[1].startsWith('.')) {
        const target = resolve(root, path, '..', match[1]);
        if (!existsSync(target)) errors.push(`${path}: missing import ${match[1]}`);
        else if (/\.(jsx?|mjs)$/.test(target)) edges.push(target);
      }
    }
    graph.set(resolve(root, path), edges);
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
inspect('src/features/year-game', /server\//);
const complete = new Set(),
  active = new Set();
function visit(path, trail = []) {
  if (active.has(path)) {
    errors.push(
      'Circular import: ' +
        [...trail.slice(trail.indexOf(path)), path]
          .map((item) => relative(root, item))
          .join(' -> '),
    );
    return;
  }
  if (complete.has(path)) return;
  active.add(path);
  for (const target of graph.get(path) ?? [])
    if (graph.has(target)) visit(target, [...trail, path]);
  active.delete(path);
  complete.add(path);
}
for (const path of graph.keys()) visit(path);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Architecture boundaries valid.');
