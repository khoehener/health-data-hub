import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Pill } from "lucide-react";

interface MedicationChartProps {
  data: { name: string; count: number }[];
}

const COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(199, 89%, 55%)",
  "hsl(199, 89%, 42%)",
  "hsl(168, 76%, 42%)",
  "hsl(168, 76%, 50%)",
  "hsl(262, 60%, 58%)",
  "hsl(262, 60%, 50%)",
  "hsl(36, 95%, 55%)",
  "hsl(36, 95%, 48%)",
  "hsl(0, 72%, 55%)",
];

export function MedicationChart({ data }: MedicationChartProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base font-semibold">Top Medikamente</CardTitle>
            <CardDescription className="text-xs">Häufigste Verordnungen nach Anzahl</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={95} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Bar dataKey="count" name="Verordnungen" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
