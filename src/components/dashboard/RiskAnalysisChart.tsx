import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ShieldAlert } from "lucide-react";

interface RiskAnalysisChartProps {
  data: { type: string; high: number; elevated: number; unlikely: number }[];
}

export function RiskAnalysisChart({ data }: RiskAnalysisChartProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <div>
            <CardTitle className="text-base font-semibold">Risikoanalyse nach Einschätzungstyp</CardTitle>
            <CardDescription className="text-xs">Sturzrisiko, Dekubitus, Pneumonie (EPA 2)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="high" name="Risiko hoch" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="elevated" name="Risiko erhöht" fill="hsl(36, 95%, 55%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="unlikely" name="Unwahrscheinlich" fill="hsl(168, 76%, 42%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
