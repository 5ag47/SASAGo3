import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const config = readFileSync(resolve(root, 'wrangler.toml'), 'utf8');
const database = config.match(/^database_name\s*=\s*"([a-z0-9-]+)"/m)?.[1];
assert.ok(database, 'No D1 database configured');
const player = `probe-${randomUUID()}`;
const cli = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
function execute(sql) {
  const result = spawnSync(
    process.execPath,
    [cli, 'd1', 'execute', database, '--remote', '--command', sql, '--json'],
    { cwd: root, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
  );
  if (result.status !== 0)
    throw new Error(`D1 probe failed (exit ${result.status}); private data was not printed.`);
  return JSON.parse(result.stdout);
}
try {
  const result = execute(`
    INSERT INTO players(id,revision,state,updated_at) VALUES('${player}',0,'{"revision":0}',0);
    UPDATE players SET revision=1,state='{"revision":1}',last_key='probe-key' WHERE id='${player}' AND revision=0;
    UPDATE players SET revision=2,state='{"revision":2}' WHERE id='${player}' AND revision=0;
    INSERT OR IGNORE INTO receipts(player,key,hash,revision,created_at) VALUES('${player}','probe-key','probe-hash',1,0);
    INSERT OR IGNORE INTO receipts(player,key,hash,revision,created_at) VALUES('${player}','probe-key','probe-hash',1,0);
    SELECT revision,json_extract(state,'$.revision') AS saved_revision,(SELECT count(*) FROM receipts WHERE player='${player}') AS receipt_count FROM players WHERE id='${player}';
  `);
  const check = result
    .flatMap((item) => item.results ?? [])
    .find((row) => row.saved_revision !== undefined);
  assert.deepEqual(check, { revision: 1, saved_revision: 1, receipt_count: 1 });
  console.log(
    'Remote D1 revision check, JSON persistence and duplicate receipt constraints passed.',
  );
} finally {
  execute(
    `DELETE FROM receipts WHERE player='${player}'; DELETE FROM players WHERE id='${player}';`,
  );
  console.log('Only this disposable probe record was removed.');
}
