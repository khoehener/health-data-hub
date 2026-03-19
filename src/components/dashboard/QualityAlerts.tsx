import { Database } from "sql.js";
import { runQuery } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, ArrowRight } from "lucide-react";

interface QualityAlertsProps {
  database: Database;
}

interface Alert {
  message: string;
  severity: "critical" | "warning" | "info";
  action: string;
}

function generateAlerts(db: Database): Alert[] {
  const alerts: Alert[] = [];

  // Check table existence for expected tables
  const expectedTables = ["epa_1", "epa_2", "medication", "vitals", "labs", "device"];
  const existing = runQuery(db, "SELECT name FROM sqlite_master WHERE type='table'");
  const existingNames = new Set(existing.values.map(v => String(v[0])));
  const missing = expectedTables.filter(t => !existingNames.has(t));
  if (missing.length > 0) {
    alerts.push({
      message: `Erwartete Tabelle(n) fehlen: ${missing.join(", ")}`,
      severity: "critical",
      action: "Datenquelle prüfen und Tabellen nachimportieren",
    });
  }

  // Check for consistent patient_id mapping across tables
  try {
    const epa1Patients = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM epa_1");
    const epa2Patients = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM epa_2");
    const p1 = (epa1Patients.values[0]?.[0] as number) || 0;
    const p2 = (epa2Patients.values[0]?.[0] as number) || 0;
    const diff = Math.abs(p1 - p2);
    if (diff > 0 && (p1 > 0 && p2 > 0)) {
      alerts.push({
        message: `Patientenabgleich: ${p1} Patienten in epa_1 vs. ${p2} in epa_2 (Differenz: ${diff})`,
        severity: diff > 10 ? "warning" : "info",
        action: "ID-Mapping zwischen epa_1 und epa_2 überprüfen",
      });
    }
  } catch {}

  // Check for very low completeness tables
  try {
    for (const table of ["vitals", "labs"]) {
      if (!existingNames.has(table)) continue;
      const cnt = runQuery(db, `SELECT COUNT(*) FROM "${table}"`);
      const rows = (cnt.values[0]?.[0] as number) || 0;
      if (rows === 0) {
        alerts.push({
          message: `Tabelle "${table}" ist leer – keine Daten vorhanden`,
          severity: "warning",
          action: `Datenimport für ${table} durchführen`,
        });
      }
    }
  } catch {}

  // Check medication mapping consistency
  try {
    const noName = runQuery(db, `SELECT COUNT(*) FROM medication WHERE medication_name IS NULL OR TRIM(medication_name) = ''`);
    const cnt = (noName.values[0]?.[0] as number) || 0;
    if (cnt > 0) {
      alerts.push({
        message: `${cnt} Medikationseinträge ohne Medikamentenname`,
        severity: "warning",
        action: "Medikamenten-Mapping korrigieren",
      });
    }
  } catch {}

  // Data freshness hint
  alerts.push({
    message: "Daten werden aus einer statischen SQLite-Datei geladen – kein Live-Update",
    severity: "info",
    action: "Für aktuelle Daten neue DB-Datei hochladen",
  });

  return alerts;
}

const severityStyle = {
  critical: { label: "Kritisch", dot: "bg-destructive", text: "text-destructive" },
  warning: { label: "Warnung", dot: "bg-chart-4", text: "text-chart-4" },
  info: { label: "Info", dot: "bg-primary", text: "text-primary" },
};

export function QualityAlerts({ database }: QualityAlertsProps) {
  const alerts = generateAlerts(database);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Qualitäts- & Mapping-Warnungen
          {alerts.filter(a => a.severity === "critical").length > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-1">
              {alerts.filter(a => a.severity === "critical").length} kritisch
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const style = severityStyle[alert.severity];
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{alert.message}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{alert.action}</span>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${style.text} flex-shrink-0`}>
                  {style.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
