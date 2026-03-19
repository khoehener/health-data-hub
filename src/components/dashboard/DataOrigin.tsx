import { Database } from "sql.js";
import { runQuery } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database as DbIcon, Layers } from "lucide-react";

interface DataOriginProps {
  database: Database;
}

export function DataOrigin({ database }: DataOriginProps) {
  const tables = runQuery(database, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  
  const tableInfo = tables.values.map(([name]) => {
    const tableName = String(name);
    const count = runQuery(database, `SELECT COUNT(*) FROM "${tableName}"`);
    const cols = runQuery(database, `PRAGMA table_info("${tableName}")`);
    return {
      name: tableName,
      rows: (count.values[0]?.[0] as number) || 0,
      columns: cols.values.map(c => ({ name: String(c[1]), type: String(c[2] || "TEXT"), nullable: c[3] === 0 })),
    };
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <DbIcon className="h-4 w-4 text-primary" />
          Datenherkunft & Struktur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tableInfo.map(t => (
            <Card key={t.name} className="bg-secondary/30 border-none">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-semibold">{t.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {t.rows.toLocaleString("de-DE")} Zeilen • {t.columns.length} Spalten
                </div>
                <div className="flex flex-wrap gap-1">
                  {t.columns.slice(0, 8).map(c => (
                    <span key={c.name} className="text-[10px] bg-background px-1.5 py-0.5 rounded font-mono">
                      {c.name}
                      <span className="text-muted-foreground ml-1">{c.type}</span>
                    </span>
                  ))}
                  {t.columns.length > 8 && (
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                      +{t.columns.length - 8} weitere
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Quelle: Lokale SQLite-Datenbank (<code className="bg-secondary px-1 rounded">healthcare_unified.db</code>). 
          Daten werden vollständig im Browser geladen und verarbeitet – keine serverseitige Übertragung.
        </p>
      </CardContent>
    </Card>
  );
}
