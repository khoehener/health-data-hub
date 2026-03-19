import { Database } from "sql.js";
import { runQuery } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface DataQualityProps {
  database: Database;
}

interface TableQuality {
  table: string;
  totalRows: number;
  columns: { name: string; nullCount: number; totalRows: number; completeness: number }[];
  overallCompleteness: number;
}

export function DataQuality({ database }: DataQualityProps) {
  const tables = runQuery(database, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");

  const quality: TableQuality[] = tables.values.map(([name]) => {
    const tableName = String(name);
    const countRes = runQuery(database, `SELECT COUNT(*) FROM "${tableName}"`);
    const totalRows = (countRes.values[0]?.[0] as number) || 0;
    const colsRes = runQuery(database, `PRAGMA table_info("${tableName}")`);

    let totalCells = 0;
    let totalFilled = 0;

    const columns = colsRes.values.map(c => {
      const colName = String(c[1]);
      const nullRes = runQuery(database, `SELECT COUNT(*) FROM "${tableName}" WHERE "${colName}" IS NULL OR TRIM("${colName}") = ''`);
      const nullCount = (nullRes.values[0]?.[0] as number) || 0;
      const completeness = totalRows > 0 ? ((totalRows - nullCount) / totalRows) * 100 : 100;
      totalCells += totalRows;
      totalFilled += totalRows - nullCount;
      return { name: colName, nullCount, totalRows, completeness };
    });

    const overallCompleteness = totalCells > 0 ? (totalFilled / totalCells) * 100 : 100;
    return { table: tableName, totalRows, columns, overallCompleteness };
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Datenqualität & Vollständigkeit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quality.map(q => (
          <div key={q.table} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{q.table}</span>
              <span className={`text-sm font-medium ${q.overallCompleteness >= 90 ? "text-chart-2" : q.overallCompleteness >= 70 ? "text-chart-4" : "text-destructive"}`}>
                {q.overallCompleteness.toFixed(1)}%
              </span>
            </div>
            <Progress value={q.overallCompleteness} className="h-2" />
            {/* Show columns with worst completeness */}
            {q.columns
              .filter(c => c.completeness < 100)
              .sort((a, b) => a.completeness - b.completeness)
              .slice(0, 3)
              .map(c => (
                <div key={c.name} className="flex items-center gap-2 text-xs pl-4">
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.nullCount} fehlend ({(100 - c.completeness).toFixed(1)}%)
                  </span>
                </div>
              ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
