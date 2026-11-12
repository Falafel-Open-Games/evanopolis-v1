import { Pool } from "pg";
import type { MatchPersistence, PersistedMatch } from "./match-persistence.js";

export class PostgresMatchPersistence<State> implements MatchPersistence<State> {
  private readonly pool: Pool;
  private initialized: Promise<void> | undefined;

  constructor(connection_string: string) {
    if (connection_string.trim() === "") {
      throw new Error("match database connection string is required");
    }
    this.pool = new Pool({ connectionString: connection_string });
  }

  async load(match_id: string): Promise<PersistedMatch<State> | undefined> {
    await this.ensureInitialized();
    const result = await this.pool.query<{ payload: PersistedMatch<State> }>(
      "SELECT payload FROM evanopolis_match_state WHERE match_id = $1",
      [match_id]
    );
    return result.rows[0]?.payload;
  }

  async save(match: PersistedMatch<State>): Promise<void> {
    await this.ensureInitialized();
    await this.pool.query(
      `INSERT INTO evanopolis_match_state (match_id, revision, payload, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (match_id) DO UPDATE
       SET revision = EXCLUDED.revision,
           payload = EXCLUDED.payload,
           updated_at = NOW()
       WHERE evanopolis_match_state.revision <= EXCLUDED.revision`,
      [match.match_id, match.revision, JSON.stringify(match)]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private ensureInitialized(): Promise<void> {
    this.initialized ??= this.initialize();
    return this.initialized;
  }

  private async initialize(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS evanopolis_match_state (
         match_id TEXT PRIMARY KEY,
         revision INTEGER NOT NULL CHECK (revision >= 0),
         payload JSONB NOT NULL,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );
    await this.pool.query(
      "CREATE INDEX IF NOT EXISTS evanopolis_match_state_updated_at_idx ON evanopolis_match_state (updated_at)"
    );
  }
}
