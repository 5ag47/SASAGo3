import { migrateState } from '../src/domain/state.js';
export class D1Store {
  constructor(db) {
    this.db = db;
  }
  async get(player) {
    const row = await this.db.prepare('SELECT state FROM players WHERE id=?').bind(player).first();
    return row ? migrateState(JSON.parse(row.state)) : null;
  }
  async create(player, state) {
    await this.db
      .prepare('INSERT OR IGNORE INTO players(id,revision,state,updated_at) VALUES(?,?,?,?)')
      .bind(player, state.revision, JSON.stringify(state), Date.now())
      .run();
  }
  async receipt(player, key) {
    return this.db
      .prepare('SELECT hash,revision FROM receipts WHERE player=? AND key=?')
      .bind(player, key)
      .first();
  }
  async commit(player, expected, next, key, hash) {
    const results = await this.db.batch([
      this.db
        .prepare(
          'UPDATE players SET revision=?,state=?,last_key=?,updated_at=? WHERE id=? AND revision=?',
        )
        .bind(next.revision, JSON.stringify(next), key, Date.now(), player, expected),
      this.db
        .prepare(
          'INSERT OR IGNORE INTO receipts(player,key,hash,revision,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM players WHERE id=? AND revision=? AND last_key=?)',
        )
        .bind(player, key, hash, next.revision, Date.now(), player, next.revision, key),
    ]);
    return results[0].meta.changes === 1;
  }
  async takeRate(id, window, limit) {
    const row = await this.db
      .prepare(
        'INSERT INTO rate_limits(id,window,count) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window RETURNING count',
      )
      .bind(id, window)
      .first();
    return row.count <= limit;
  }
}
