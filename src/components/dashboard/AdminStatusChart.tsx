import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ClipboardCheck } from "lucide-react";

interface AdminStatusChartProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  "hsl(168, 76%, 42%)",
  "hsl(0, 72%, 55%)",
  "hsl(36, 95%, 55%)",
  "hsl(262, 60%, 58%)",
  "hsl(199, 89%, 48%)",
];

const LABELS: Record<string, string> = {
  given: "Verabreicht",
  missed: "Versäumt",
  refused: "Verweigert",
  held: "Ausgesetzt",
  other: "Sonstiges",
};

export function AdminStatusChart({ data }: AdminStatusChartProps) {
  const labeled = data.map(d => ({ ...d, name: LABELS[d.name] || d.name }));

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-accent" />
          <div>
            <CardTitle className="text-base font-semibold">Medikamenten-Verabreichung</CardTitle>
            <CardDescription className="text-xs">Status der Medikamentengabe</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={labeled}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {labeled.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
