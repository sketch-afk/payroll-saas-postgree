import pkg from "pg";
const { Pool } = pkg;

// This ensures we reuse the connection pool across hot-reloads in development
// and across serverless function calls in production.
if (!global.pgPool) {
  const isCloud = !!process.env.DATABASE_URL;
  
  const config = isCloud 
    ? { 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } 
      }
    : {
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || "payroll",
      };

  global.pgPool = new Pool({ 
    ...config, 
    max: 10,       // Adjust based on your Neon tier
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000 
  });
}

const pool = global.pgPool;

function normalizeSql(sql, binds) {
  const values = [];
  const names = {};
  
  // POSTGRES FIX: Added (?<!:) to ignore ::int or ::numeric casts.
  // It will now only match single colons like :cid or :name.
  const text = sql.replace(/(?<!:):([a-zA-Z0-9_]+)/g, (match, name) => {
    if (!(name in binds)) {
      throw new Error(`Missing bind value for parameter ${name}`);
    }
    if (!(name in names)) {
      names[name] = values.length + 1;
      values.push(binds[name]);
    }
    return `$${names[name]}`;
  });
  
  return { text, values };
}

export async function query(sql, binds = {}) {
  // Use pool.query directly to let the pool handle connect/release automatically
  const { text, values } = normalizeSql(sql, binds);
  return await pool.query(text, values);
}

export async function queryOne(sql, binds = {}) {
  const result = await query(sql, binds);
  return result.rows?.[0] ?? null;
}

// Export the pool if you ever need raw access (e.g., for transactions)
export default pool;