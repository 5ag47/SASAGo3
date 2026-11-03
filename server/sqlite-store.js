import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { migrateState } from '../src/domain/state.js';
export class SqliteStore {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  }
  get(player) {
    const row = this.db.prepare('SELECT state FROM players WHERE id=?').get(player);
    return row ? migrateState(JSON.parse(row.state)) : null;
  }
  create(player, state) {
    this.db
      .prepare('INSERT OR IGNORE INTO players(id, revision, state, updated_at) VALUES(?, ?, ?, ?)')
      .run(player, state.revision, JSON.stringify(state), Date.now());
  }
  receipt(player, key) {
    return (
      this.db
        .prepare('SELECT hash, revision FROM receipts WHERE player=? AND key=?')
        .get(player, key) ?? null
    );
  }
  commit(player, expected, next, key, hash) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const updated = this.db
        .prepare(
          'UPDATE players SET revision=?,state=?,last_key=?,updated_at=? WHERE id=? AND revision=?',
        )
        .run(next.revision, JSON.stringify(next), key, Date.now(), player, expected);
      if (!updated.changes) {
        this.db.exec('ROLLBACK');
        return false;
      }
      this.db
        .prepare('INSERT INTO receipts(player,key,hash,revision,created_at) VALUES(?,?,?,?,?)')
        .run(player, key, hash, next.revision, Date.now());
      this.db.exec('COMMIT');
      return true;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  takeRate(id, window, limit) {
    const row = this.db
      .prepare(
        'INSERT INTO rate_limits(id,window,count) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count',
      )
      .get(id, window);
    this.db.prepare('DELETE FROM rate_limits WHERE window < ?').run(window - 5);
    return row.count <= limit;
  }
  close() {
    this.db.close();
  }
}
