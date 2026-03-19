import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Activity, ArrowRight } from "lucide-react";

interface Insight {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  metric: string;
  detail: string;
}

interface PredictiveInsightsProps {
  insights: Insight[];
}

const severityStyles = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning-foreground border-warning/20",
  low: "bg-accent/10 text-accent border-accent/20",
};

const severityLabels = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const severityIcons = {
  high: AlertTriangle,
  medium: TrendingUp,
  low: Activity,
};

export function PredictiveInsights({ insights }: PredictiveInsightsProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-chart-3" />
          <div>
            <CardTitle className="text-base font-semibold">	Prädiktive Erkenntnisse</CardTitle>
            <CardDescription className="text-xs">
              Datenbasierte Vorhersagen und Handlungsempfehlungen
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {insights.map((insight, i) => {
            const Icon = severityIcons[insight.severity];
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 transition-all hover:shadow-md ${severityStyles[insight.severity]}`}
              >
                <div className="flex items-start justify-between gap-3">! 
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {severityLabels[insight.severity]}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80">{insight.description}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-xs font-medium">{insight.detail}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold font-mono">{insight.metric}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
