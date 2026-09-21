const fs = require('node:fs');
const path = require('node:path');
const { emptyState } = require('./state');

// Both repositories expose the same transaction boundary. Business rules never know
// whether persistence is PostgreSQL (production) or SQLite (local development).
function createRepository(env = process.env) {
    if (env.DATABASE_URL) return new PostgresRepository(env);
    if (env.NODE_ENV === 'production' || env.RENDER) throw new Error('DATABASE_URL zorunlu. Üretimde yerel veritabanına geçiş yapılmaz.');
    return new SqliteRepository(env.SQLITE_PATH || path.join(__dirname, '../data/stock-manager.sqlite'));
}
function prepare(state, before) {
    const businessChanged = JSON.stringify(state.data) !== JSON.stringify(before.data);
    if (businessChanged) state.dataRevision = before.dataRevision + 1;
    return businessChanged || JSON.stringify(state.accounts) !== JSON.stringify(before.accounts);
}
class SqliteRepository {
    constructor(filename) {
        const { DatabaseSync } = require('node:sqlite');
        if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
        this.db = new DatabaseSync(filename); this.queue = Promise.resolve();
        this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
            CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS app_backups (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, reason TEXT NOT NULL, actor TEXT, payload TEXT NOT NULL);`);
        this.db.prepare('INSERT OR IGNORE INTO app_state(id,payload) VALUES(1,?)').run(JSON.stringify(emptyState()));
    }
    async read() { await this.queue; return JSON.parse(this.db.prepare('SELECT payload FROM app_state WHERE id=1').get().payload); }
    transaction(fn, { reason = 'update', actor = '' } = {}) {
        const operation = this.queue.then(async () => {
            this.db.exec('BEGIN IMMEDIATE');
            try {
                const before = JSON.parse(this.db.prepare('SELECT payload FROM app_state WHERE id=1').get().payload), state = structuredClone(before);
                const result = await fn(state);
                if (prepare(state, before)) this.db.prepare('INSERT INTO app_backups(created_at,reason,actor,payload) VALUES(?,?,?,?)').run(new Date().toISOString(), reason, actor, JSON.stringify({ data: before.data, accounts: before.accounts, dataRevision: before.dataRevision }));
                if (JSON.stringify(state) !== JSON.stringify(before)) this.db.prepare('UPDATE app_state SET payload=? WHERE id=1').run(JSON.stringify(state));
                this.db.exec('COMMIT'); return { result, revision: state.dataRevision };
            } catch (error) { this.db.exec('ROLLBACK'); throw error; }
        });
        this.queue = operation.catch(() => {}); return operation;
    }
    async backups() { await this.queue; return this.db.prepare('SELECT id,created_at,reason,actor FROM app_backups ORDER BY id DESC LIMIT 100').all(); }
    async backup(id) { await this.queue; const row = this.db.prepare('SELECT payload FROM app_backups WHERE id=?').get(id); return row ? JSON.parse(row.payload) : null; }
    async close() { await this.queue; this.db.close(); }
}
class PostgresRepository {
    constructor(env, pool) {
        this.pool = pool || new (require('pg').Pool)({ connectionString: env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000, ...(env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: true, ...(env.DATABASE_CA ? { ca: env.DATABASE_CA.replace(/\\n/g, '\n') } : {}) } } : {}) });
        this.ready = this.init();
        this.ready.catch(() => {});
    }
    async init() {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('SELECT pg_advisory_xact_lock(48219021)');
            await client.query(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload JSONB NOT NULL);
                CREATE TABLE IF NOT EXISTS app_backups (id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reason TEXT NOT NULL, actor TEXT, payload JSONB NOT NULL);`);
            await client.query('INSERT INTO app_state(id,payload) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING', [JSON.stringify(emptyState())]);
            await client.query('COMMIT');
        } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    }
    async read() { await this.ready; return (await this.pool.query('SELECT payload FROM app_state WHERE id=1')).rows[0].payload; }
    async transaction(fn, { reason = 'update', actor = '' } = {}) {
        await this.ready;
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("SET LOCAL lock_timeout = '10s'");
            const before = (await client.query('SELECT payload FROM app_state WHERE id=1 FOR UPDATE')).rows[0].payload, state = structuredClone(before);
            const result = await fn(state);
            if (prepare(state, before)) await client.query('INSERT INTO app_backups(reason,actor,payload) VALUES($1,$2,$3::jsonb)', [reason, actor, JSON.stringify({ data: before.data, accounts: before.accounts, dataRevision: before.dataRevision })]);
            if (JSON.stringify(state) !== JSON.stringify(before)) await client.query('UPDATE app_state SET payload=$1::jsonb WHERE id=1', [JSON.stringify(state)]);
            await client.query('COMMIT'); return { result, revision: state.dataRevision };
        } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    }
    async backups() { await this.ready; return (await this.pool.query('SELECT id,created_at,reason,actor FROM app_backups ORDER BY id DESC LIMIT 100')).rows; }
    async backup(id) { await this.ready; return (await this.pool.query('SELECT payload FROM app_backups WHERE id=$1', [id])).rows[0]?.payload || null; }
    async close() { await this.ready; await this.pool.end(); }
}
module.exports = { createRepository, SqliteRepository, PostgresRepository };
