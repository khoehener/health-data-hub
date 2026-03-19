import initSqlJs, { Database } from "sql.js";

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      `https://sql.js.org/dist/${file}`,
  });

  const response = await fetch("/healthcare_unified.db");
  const buffer = await response.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buffer));
  return db;
}

export interface QueryResult {
  columns: string[];
  values: (string | number | null)[][];
}

export function runQuery(database: Database, sql: string): QueryResult {
  const results = database.exec(sql);
  if (results.length === 0) return { columns: [], values: [] };
  return {
    columns: results[0].columns,
    values: results[0].values as (string | number | null)[][],
  };
}

export function runUpdate(database: Database, sql: string, params?: (string | number | null)[]): void {
  if (params) {
    database.run(sql, params);
  } else {
    database.run(sql);
  }
}

export async function downloadDatabase(): Promise<void> {
  if (!db) return;
  const data = db.export();
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "healthcare_unified.db";
  a.click();
  URL.revokeObjectURL(url);
}
