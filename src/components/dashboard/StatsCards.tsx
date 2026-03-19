import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Activity, Building2 } from "lucide-react";

interface StatsCardsProps {
  totalPatients: number;
  totalCases: number;
  totalAssessments: number;
  totalWards: number;
}

const stats = [
  { key: "totalPatients", label: "Patienten", icon: Users, color: "text-primary" },
  { key: "totalCases", label: "Fälle", icon: FileText, color: "text-accent" },
  { key: "totalAssessments", label: "Einschätzungen", icon: Activity, color: "text-chart-3" },
  { key: "totalWards", label: "Stationen", icon: Building2, color: "text-chart-4" },
] as const;

type StatKey = (typeof stats)[number]["key"];

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ key, label, icon: Icon, color }) => (
        <Card key={key} className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className={`h-5 w-5 ${color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{props[key as StatKey].toLocaleString("de-DE")}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
