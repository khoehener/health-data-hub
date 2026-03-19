import { Database } from "sql.js";
import { runQuery } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search } from "lucide-react";

interface AnomalyDetectionProps {
  database: Database;
}

interface Anomaly {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  table: string;
  count: number;
}

function detectAnomalies(db: Database): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Duplicate patient entries
  try {
    const dupes = runQuery(db, `SELECT patient_id, COUNT(*) c FROM epa_1 GROUP BY patient_id HAVING c > 10 ORDER BY c DESC LIMIT 5`);
    if (dupes.values.length > 0) {
      anomalies.push({
        title: "Mehrfacheinträge pro Patient",
        description: `${dupes.values.length} Patienten haben ungewöhnlich viele Einträge (>10). Mögliche Duplikate oder Fehlzuordnungen.`,
        severity: "medium",
        table: "epa_1",
        count: dupes.values.length,
      });
    }
  } catch {}

  // 2. Orphan cases (cases in epa_2 not in epa_1)
  try {
    const orphans = runQuery(db, `SELECT COUNT(DISTINCT e2.case_id) FROM epa_2 e2 LEFT JOIN epa_1 e1 ON e2.case_id = e1.case_id WHERE e1.case_id IS NULL`);
    const orphanCount = (orphans.values[0]?.[0] as number) || 0;
    if (orphanCount > 0) {
      anomalies.push({
        title: "Verwaiste Fälle",
        description: `${orphanCount} Fälle in epa_2 haben keinen zugehörigen Eintrag in epa_1. Mögliche Mapping-Fehler.`,
        severity: "high",
        table: "epa_2",
        count: orphanCount,
      });
    }
  } catch {}

  // 3. Null critical fields
  try {
    const nullPatients = runQuery(db, `SELECT COUNT(*) FROM epa_2 WHERE patient_id IS NULL OR patient_id = ''`);
    const cnt = (nullPatients.values[0]?.[0] as number) || 0;
    if (cnt > 0) {
      anomalies.push({
        title: "Fehlende Patienten-IDs",
        description: `${cnt} Einträge in epa_2 ohne Patienten-ID. Diese Datensätze können keinem Patienten zugeordnet werden.`,
        severity: "high",
        table: "epa_2",
        count: cnt,
      });
    }
  } catch {}

  // 4. Medication without patient
  try {
    const medOrphans = runQuery(db, `SELECT COUNT(*) FROM medication WHERE patient_id IS NULL OR patient_id = ''`);
    const medCnt = (medOrphans.values[0]?.[0] as number) || 0;
    if (medCnt > 0) {
      anomalies.push({
        title: "Medikation ohne Patient",
        description: `${medCnt} Medikationseinträge ohne zugehörige Patienten-ID.`,
        severity: "medium",
        table: "medication",
        count: medCnt,
      });
    }
  } catch {}

  // 5. Invalid risk scores
  try {
    const invalidRisk = runQuery(db, `SELECT COUNT(*) FROM epa_2 WHERE EPA9002 IS NOT NULL AND (EPA9002 < 0 OR EPA9002 > 10)`);
    const riskCnt = (invalidRisk.values[0]?.[0] as number) || 0;
    if (riskCnt > 0) {
      anomalies.push({
        title: "Ungültige Risikowerte",
        description: `${riskCnt} Einschätzungen mit Risikowerten außerhalb des erwarteten Bereichs (0–10).`,
        severity: "medium",
        table: "epa_2",
        count: riskCnt,
      });
    }
  } catch {}

  // 6. Empty ward assignments
  try {
    const emptyWard = runQuery(db, `SELECT COUNT(*) FROM epa_1 WHERE ward IS NULL OR TRIM(ward) = ''`);
    const wardCnt = (emptyWard.values[0]?.[0] as number) || 0;
    if (wardCnt > 0) {
      anomalies.push({
        title: "Fehlende Stationszuordnung",
        description: `${wardCnt} Einträge ohne Stationszuweisung. Manuelle Zuordnung empfohlen.`,
        severity: "low",
        table: "epa_1",
        count: wardCnt,
      });
    }
  } catch {}

  // If no anomalies found
  if (anomalies.length === 0) {
    anomalies.push({
      title: "Keine Anomalien erkannt",
      description: "Die automatische Prüfung hat keine Auffälligkeiten in den Daten festgestellt.",
      severity: "low",
      table: "-",
      count: 0,
    });
  }

  return anomalies;
}

const severityConfig = {
  high: { label: "Hoch", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Mittel", className: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  low: { label: "Niedrig", className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
};

export function AnomalyDetection({ database }: AnomalyDetectionProps) {
  const anomalies = detectAnomalies(database);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Erkannte Anomalien & Inkonsistenzen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.map((a, i) => {
          const sev = severityConfig[a.severity];
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-chart-4" : "text-chart-2"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{a.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${sev.className}`}>{sev.label}</Badge>
                  {a.table !== "-" && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded">{a.table}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
              {a.count > 0 && (
                <span className="text-lg font-bold text-foreground">{a.count}</span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
