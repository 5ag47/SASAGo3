import { DatabaseSync } from 'node:sqlite';
import { migrateState, validateState } from '../../src/domain/state.js';
// SQL is accepted only after authenticating our own encrypted archive.
// All restoration and writes in this drill are isolated in memory.
export function verifyBackup(payload) {
  if (typeof payload?.sql !== 'string') throw new Error('BACKUP_SQL_MISSING');
  const db = new DatabaseSync(':memory:', { allowExtension: false });
  try {
    db.exec(payload.sql);
    if (
      db.prepare('PRAGMA quick_check').get().quick_check !== 'ok' ||
      db.prepare('PRAGMA foreign_key_check').all().length
    )
      throw new Error('BACKUP_INTEGRITY');
    let players = 0;
    for (const row of db.prepare('SELECT state,revision FROM players').iterate()) {
      const state = migrateState(JSON.parse(row.state));
      if (!validateState(state) || state.revision !== row.revision)
        throw new Error('BACKUP_STATE_INVALID');
      players++;
    }
    const row = db.prepare('SELECT id,revision FROM players LIMIT 1').get();
    let revisionCheck = null;
    if (row) {
      db.exec('SAVEPOINT restore_drill');
      const update = db.prepare('UPDATE players SET revision=revision+1 WHERE id=? AND revision=?');
      const first = update.run(row.id, row.revision).changes,
        stale = update.run(row.id, row.revision).changes;
      db.exec('ROLLBACK TO restore_drill; RELEASE restore_drill');
      revisionCheck = first === 1 && stale === 0;
      if (!revisionCheck) throw new Error('BACKUP_REVISION_CHECK');
    }
    return {
      integrity: 'ok',
      players,
      receipts: db.prepare('SELECT count(*) AS count FROM receipts').get().count,
      revisionCheck,
    };
  } finally {
    db.close();
  }
}
