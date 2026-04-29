import snowflake from 'snowflake-sdk'

snowflake.configure({ logLevel: 'ERROR' })

let connectionPool: snowflake.Connection | null = null

function getConnection(): Promise<snowflake.Connection> {
  if (connectionPool) return Promise.resolve(connectionPool)

  const conn = snowflake.createConnection({
    account:       process.env.SNOWFLAKE_ACCOUNT!,
    username:      process.env.SNOWFLAKE_USERNAME!,
    password:      process.env.SNOWFLAKE_PASSWORD!,
    authenticator: 'SNOWFLAKE',
    role:          process.env.SNOWFLAKE_ROLE || 'SYSADMIN',
    warehouse:     process.env.SNOWFLAKE_WAREHOUSE!,
    database:      process.env.SNOWFLAKE_DATABASE!,
    schema:        process.env.SNOWFLAKE_SCHEMA!,
  })

  return new Promise((resolve, reject) => {
    conn.connect((err, c) => {
      if (err) { reject(err); return }
      connectionPool = c
      resolve(c)
    })
  })
}

export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const conn = await getConnection()
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      complete: (err, _stmt, rows) => {
        if (err) { reject(err); return }
        // Normalize column names to lowercase
        const normalized = (rows || []).map(row => {
          const out: Record<string, unknown> = {}
          for (const key of Object.keys(row as object)) {
            out[key.toLowerCase()] = (row as Record<string, unknown>)[key]
          }
          return out
        })
        resolve(normalized as T[])
      },
    })
  })
}
