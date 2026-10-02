// "Developer mode" DB client — identical to admin-dashboard-andrejkatin's/consent-andrejkatin's
// own local-db.mjs (duplicated per this platform's established cross-repo convention). A drop-in
// stand-in for @neondatabase/serverless's neon() when DB_MODE=local — supports the same two call
// shapes used across this whole codebase family (tagged-template, and sql.query(text, params)).
import pg from 'pg';

export function createLocalSql(connectionString) {
  const pool = new pg.Pool({ connectionString });

  async function sql(strings, ...values) {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}` + strings[i + 1];
    const result = await pool.query(text, values);
    return result.rows;
  }
  sql.query = async (text, params = []) => (await pool.query(text, params)).rows;
  return sql;
}
