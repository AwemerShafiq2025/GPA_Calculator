import pg from 'pg';

class StatelessStorage {
  async saveCustomScale(_userId, _grades) {
    return { ok: true, mode: 'stateless' };
  }
}

class PostgresStorage {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString });
  }

  async ensure() {
    await this.pool.query(`
      create table if not exists custom_scales (
        user_id text primary key,
        grades jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
  }

  async saveCustomScale(userId, grades) {
    await this.ensure();
    await this.pool.query(
      `insert into custom_scales (user_id, grades, updated_at)
       values ($1, $2, now())
       on conflict (user_id) do update set grades = excluded.grades, updated_at = now()`,
      [userId, grades]
    );
    return { ok: true, mode: 'postgres' };
  }
}

export function createStorage() {
  if (process.env.STORAGE_MODE === 'postgres' && process.env.DATABASE_URL) {
    return new PostgresStorage(process.env.DATABASE_URL);
  }
  return new StatelessStorage();
}
