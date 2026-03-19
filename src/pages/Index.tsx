import { useEffect, useState, useCallback } from "react";
import { Database } from "sql.js";
import { getDatabase, runQuery } from "@/lib/database";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { WardChart } from "@/components/dashboard/WardChart";
import { AssessmentTypeChart } from "@/components/dashboard/AssessmentTypeChart";
import { RiskAnalysisChart } from "@/components/dashboard/RiskAnalysisChart";
import { MedicationChart } from "@/components/dashboard/MedicationChart";
import { AdminStatusChart } from "@/components/dashboard/AdminStatusChart";
import { PredictiveInsights } from "@/components/dashboard/PredictiveInsights";
import { DataTable } from "@/components/dashboard/DataTable";
import { DataOrigin } from "@/components/dashboard/DataOrigin";
import { DataQuality } from "@/components/dashboard/DataQuality";
import { AnomalyDetection } from "@/components/dashboard/AnomalyDetection";
import { QualityAlerts } from "@/components/dashboard/QualityAlerts";
import { MappingCorrection } from "@/components/dashboard/MappingCorrection";
import { Activity, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardData {
  totalPatients: number;
  totalCases: number;
  totalAssessments: number;
  totalWards: number;
  totalMedications: number;
  wardDistribution: { name: string; count: number }[];
  assessmentTypes: { name: string; value: number }[];
  riskByType: { type: string; high: number; elevated: number; unlikely: number }[];
  topMedications: { name: string; count: number }[];
  adminStatus: { name: string; value: number }[];
  insights: { title: string; description: string; severity: "high" | "medium" | "low"; metric: string; detail: string }[];
}

function loadDashboardData(db: Database): DashboardData {
  // Basic stats
  const patients2 = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM epa_2");
  const patients1 = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM epa_1");
  const cases2 = runQuery(db, "SELECT COUNT(DISTINCT case_id) FROM epa_2");
  const total2 = runQuery(db, "SELECT COUNT(*) FROM epa_2");
  const total1 = runQuery(db, "SELECT COUNT(*) FROM epa_1");

  const totalPatients = Math.max(
    (patients2.values[0]?.[0] as number) || 0,
    (patients1.values[0]?.[0] as number) || 0
  );
  const totalCases = (cases2.values[0]?.[0] as number) || 0;
  const totalAssessments = ((total2.values[0]?.[0] as number) || 0) + ((total1.values[0]?.[0] as number) || 0);

  // Ward distribution
  const wards = runQuery(db, "SELECT ward, COUNT(*) as cnt FROM epa_1 GROUP BY ward ORDER BY cnt DESC");
  const wardDistribution = wards.values.map(r => ({
    name: String(r[0] || "Unbekannt"),
    count: r[1] as number,
  }));
  const totalWards = wardDistribution.length;

  // Assessment types
  const types = runQuery(db, "SELECT EPA0001TX, COUNT(*) as cnt FROM epa_2 WHERE EPA0001TX IS NOT NULL GROUP BY EPA0001TX ORDER BY cnt DESC");
  const assessmentTypes = types.values.map(r => ({
    name: String(r[0]),
    value: r[1] as number,
  }));

  // Risk analysis by assessment type
  const riskRaw = runQuery(db, `
    SELECT EPA0001TX, EPA9002, COUNT(*) c 
    FROM epa_2 
    WHERE EPA9002 IS NOT NULL AND EPA0001TX IS NOT NULL 
    GROUP BY EPA0001TX, EPA9002 
    ORDER BY EPA0001TX
  `);
  const riskMap = new Map<string, { high: number; elevated: number; unlikely: number }>();
  for (const row of riskRaw.values) {
    const type = String(row[0]);
    const risk = row[1] as number;
    const count = row[2] as number;
    if (!riskMap.has(type)) riskMap.set(type, { high: 0, elevated: 0, unlikely: 0 });
    const entry = riskMap.get(type)!;
    if (risk <= 1) entry.high += count;
    else if (risk === 2) entry.elevated += count;
    else entry.unlikely += count;
  }
  const riskByType = Array.from(riskMap.entries()).map(([type, vals]) => ({ type, ...vals }));

  // Medications
  const medCount = runQuery(db, "SELECT COUNT(*) FROM medication");
  const totalMedications = (medCount.values[0]?.[0] as number) || 0;

  const meds = runQuery(db, "SELECT medication_name, COUNT(*) c FROM medication WHERE medication_name IS NOT NULL GROUP BY medication_name ORDER BY c DESC LIMIT 10");
  const topMedications = meds.values.map(r => ({ name: String(r[0]), count: r[1] as number }));

  // Admin status
  const adminRaw = runQuery(db, "SELECT administration_status, COUNT(*) c FROM medication WHERE administration_status IS NOT NULL AND administration_status != '' GROUP BY administration_status ORDER BY c DESC");
  const adminStatus = adminRaw.values.map(r => ({ name: String(r[0]), value: r[1] as number }));

  // Generate predictive insights
  const insights = generateInsights(db, riskByType, adminStatus, totalAssessments, totalMedications);

  return { totalPatients, totalCases, totalAssessments, totalWards, totalMedications, wardDistribution, assessmentTypes, riskByType, topMedications, adminStatus, insights };
}

function generateInsights(
  db: Database,
  riskByType: DashboardData["riskByType"],
  adminStatus: DashboardData["adminStatus"],
  totalAssessments: number,
  totalMedications: number,
): DashboardData["insights"] {
  const insights: DashboardData["insights"] = [];

  // 1. High risk rate
  const totalRiskAssessed = riskByType.reduce((s, r) => s + r.high + r.elevated + r.unlikely, 0);
  const totalHigh = riskByType.reduce((s, r) => s + r.high, 0);
  const totalElevated = riskByType.reduce((s, r) => s + r.elevated, 0);
  if (totalRiskAssessed > 0) {
    const highPct = ((totalHigh + totalElevated) / totalRiskAssessed * 100).toFixed(1);
    insights.push({
      title: "Risikopatienten erkannt",
      description: `${totalHigh + totalElevated} von ${totalRiskAssessed} Einschätzungen zeigen erhöhtes oder hohes Risiko. Bei Zwischeneinschätzungen steigt der Anteil – frühzeitige Intervention empfohlen.`,
      severity: Number(highPct) > 15 ? "high" : "medium",
      metric: `${highPct}%`,
      detail: "Empfehlung: Risikopatienten bei Zwischeneinschätzungen priorisieren",
    });
  }

  // 2. Medication adherence
  const givenCount = adminStatus.find(a => a.name === "given")?.value || 0;
  const missedCount = adminStatus.find(a => a.name === "missed")?.value || 0;
  const totalAdmin = adminStatus.reduce((s, a) => s + a.value, 0);
  if (totalAdmin > 0) {
    const missedPct = (missedCount / totalAdmin * 100).toFixed(1);
    insights.push({
      title: "Medikamenten-Compliance",
      description: `${missedCount} Medikamentengaben wurden versäumt (${missedPct}% aller Verabreichungen). Eine Verbesserung der Abläufe könnte die Patientensicherheit erhöhen.`,
      severity: Number(missedPct) > 10 ? "high" : Number(missedPct) > 5 ? "medium" : "low",
      metric: `${missedPct}%`,
      detail: `${givenCount} von ${totalAdmin} Gaben erfolgreich verabreicht`,
    });
  }

  // 3. Zwischeneinschätzungen risk increase
  const zwischen = riskByType.find(r => r.type === "Zwischeneinschätzung");
  const erst = riskByType.find(r => r.type === "Ersteinschätzung");
  if (zwischen && erst) {
    const zwischenTotal = zwischen.high + zwischen.elevated + zwischen.unlikely;
    const erstTotal = erst.high + erst.elevated + erst.unlikely;
    const zwischenRiskPct = zwischenTotal > 0 ? (zwischen.high + zwischen.elevated) / zwischenTotal * 100 : 0;
    const erstRiskPct = erstTotal > 0 ? (erst.high + erst.elevated) / erstTotal * 100 : 0;
    const diff = zwischenRiskPct - erstRiskPct;
    if (diff > 0) {
      insights.push({
        title: "Risikoanstieg im Verlauf",
        description: `Das Risiko steigt von der Erst- zur Zwischeneinschätzung um ${diff.toFixed(1)} Prozentpunkte. Dies deutet auf eine Verschlechterung während des Aufenthalts hin.`,
        severity: diff > 10 ? "high" : "medium",
        metric: `+${diff.toFixed(1)}%`,
        detail: `Ersteinschätzung: ${erstRiskPct.toFixed(1)}% → Zwischeneinschätzung: ${zwischenRiskPct.toFixed(1)}%`,
      });
    }
  }

  // 4. Geriatrie load
  const geriatrie = runQuery(db, "SELECT COUNT(*) FROM epa_1 WHERE ward = 'Geriatrie'");
  const gerCount = (geriatrie.values[0]?.[0] as number) || 0;
  if (totalAssessments > 0 && gerCount > 0) {
    const gerPct = (gerCount / totalAssessments * 100).toFixed(1);
    insights.push({
      title: "Geriatrie-Schwerpunkt",
      description: `${gerPct}% aller Einschätzungen entfallen auf die Geriatrie. Die hohe Konzentration erfordert entsprechende Personalplanung.`,
      severity: Number(gerPct) > 50 ? "medium" : "low",
      metric: `${gerPct}%`,
      detail: `${gerCount} von ${totalAssessments} Einschätzungen`,
    });
  }

  // 5. Polypharmazie prediction
  const polyRaw = runQuery(db, `
    SELECT patient_id, COUNT(DISTINCT medication_name) med_count
    FROM medication 
    WHERE medication_name IS NOT NULL
    GROUP BY patient_id 
    HAVING med_count >= 5
  `);
  const polyCount = polyRaw.values.length;
  const totalPatientsWithMeds = runQuery(db, "SELECT COUNT(DISTINCT patient_id) FROM medication WHERE medication_name IS NOT NULL");
  const totalMedPatients = (totalPatientsWithMeds.values[0]?.[0] as number) || 0;
  if (totalMedPatients > 0) {
    const polyPct = (polyCount / totalMedPatients * 100).toFixed(1);
    insights.push({
      title: "Polypharmazie-Risiko",
      description: `${polyCount} von ${totalMedPatients} Patienten erhalten ≥5 verschiedene Medikamente. Wechselwirkungen und Nebenwirkungen sollten überprüft werden.`,
      severity: Number(polyPct) > 50 ? "high" : Number(polyPct) > 30 ? "medium" : "low",
      metric: `${polyCount}`,
      detail: `${polyPct}% aller Patienten mit Medikation betroffen`,
    });
  }

  return insights;
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
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Healthcare Dashboard</h1>
            <p className="text-xs text-muted-foreground">EPA Einschätzungen • Medikation • Risikoanalyse</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <StatsCards
          totalPatients={data.totalPatients}
          totalCases={data.totalCases}
          totalAssessments={data.totalAssessments}
          totalWards={data.totalWards}
        />

        {/* Predictive Insights */}
        {data.insights.length > 0 && (
          <PredictiveInsights insights={data.insights} />
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="risk">Risikoanalyse</TabsTrigger>
            <TabsTrigger value="medication">Medikation</TabsTrigger>
            <TabsTrigger value="quality">Datenqualität</TabsTrigger>
            <TabsTrigger value="data">Daten</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WardChart data={data.wardDistribution} />
              <AssessmentTypeChart data={data.assessmentTypes} />
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <RiskAnalysisChart data={data.riskByType} />
          </TabsContent>

          <TabsContent value="medication" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MedicationChart data={data.topMedications} />
              <AdminStatusChart data={data.adminStatus} />
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <DataOrigin database={db} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DataQuality database={db} />
              <QualityAlerts database={db} />
            </div>
            <AnomalyDetection database={db} />
            <MappingCorrection database={db} onDataChanged={handleDataChanged} />
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <DataTable database={db} onDataChanged={handleDataChanged} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
