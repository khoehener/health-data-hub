import { useEffect, useState, useCallback } from "react";
import { Database } from "sql.js";
import { getDatabase, runQuery } from "@/lib/database";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { WardChart } from "@/components/dashboard/WardChart";
import { AssessmentTypeChart } from "@/components/dashboard/AssessmentTypeChart";
import { DataTable } from "@/components/dashboard/DataTable";
import { Activity, Loader2 } from "lucide-react";

interface DashboardData {
  totalPatients: number;
  totalCases: number;
  totalAssessments: number;
  totalWards: number;
  wardDistribution: { name: string; count: number }[];
  assessmentTypes: { name: string; value: number }[];
}

function loadDashboardData(db: Database): DashboardData {
  // epa_2 stats
  const patients2 = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM epa_2");
  const cases2 = runQuery(db, "SELECT COUNT(DISTINCT case_id) FROM epa_2");
  const total2 = runQuery(db, "SELECT COUNT(*) FROM epa_2");

  // epa_1 stats
  const patients1 = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM epa_1");
  const total1 = runQuery(db, "SELECT COUNT(*) FROM epa_1");

  const totalPatients = Math.max(
    (patients2.values[0]?.[0] as number) || 0,
    (patients1.values[0]?.[0] as number) || 0
  );
  const totalCases = ((cases2.values[0]?.[0] as number) || 0);
  const totalAssessments = ((total2.values[0]?.[0] as number) || 0) + ((total1.values[0]?.[0] as number) || 0);

  // Ward distribution from epa_1
  const wards = runQuery(db, "SELECT ward, COUNT(*) as cnt FROM epa_1 GROUP BY ward ORDER BY cnt DESC");
  const wardDistribution = wards.values.map(r => ({
    name: String(r[0] || "Unbekannt"),
    count: r[1] as number,
  }));

  const totalWards = wardDistribution.length;

  // Assessment types from epa_2
  const types = runQuery(db, "SELECT EPA0001TX, COUNT(*) as cnt FROM epa_2 WHERE EPA0001TX IS NOT NULL GROUP BY EPA0001TX ORDER BY cnt DESC");
  const assessmentTypes = types.values.map(r => ({
    name: String(r[0]),
    value: r[1] as number,
  }));

  return { totalPatients, totalCases, totalAssessments, totalWards, wardDistribution, assessmentTypes };
}

export default function Index() {
  const [db, setDb] = useState<Database | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDatabase()
      .then((database) => {
        setDb(database);
        setData(loadDashboardData(database));
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const handleDataChanged = useCallback(() => {
    if (db) setData(loadDashboardData(db));
  }, [db]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Datenbank wird geladen…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">Fehler: {error}</p>
      </div>
    );
  }

  if (!db || !data) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Healthcare Dashboard</h1>
            <p className="text-xs text-muted-foreground">EPA Einschätzungen & Patientendaten</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <StatsCards
          totalPatients={data.totalPatients}
          totalCases={data.totalCases}
          totalAssessments={data.totalAssessments}
          totalWards={data.totalWards}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WardChart data={data.wardDistribution} />
          <AssessmentTypeChart data={data.assessmentTypes} />
        </div>

        <DataTable database={db} onDataChanged={handleDataChanged} />
      </main>
    </div>
  );
}
