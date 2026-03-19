import { useState } from "react";
import { Database } from "sql.js";
import { runQuery, runUpdate } from "@/lib/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, X, Wrench, Search } from "lucide-react";
import { toast } from "sonner";

interface MappingCorrectionProps {
  database: Database;
  onDataChanged: () => void;
}

type IssueType = "null_patient" | "null_ward" | "null_medication" | "orphan_case";

const issueTypes: { value: IssueType; label: string; description: string }[] = [
  { value: "null_patient", label: "Fehlende Patienten-ID", description: "Einträge ohne zugeordnete Patienten-ID" },
  { value: "null_ward", label: "Fehlende Station", description: "Einträge ohne Stationszuweisung" },
  { value: "null_medication", label: "Fehlender Medikamentenname", description: "Medikation ohne Bezeichnung" },
  { value: "orphan_case", label: "Verwaiste Fälle", description: "Fälle in epa_2 ohne Eintrag in epa_1" },
];

function getIssueQuery(type: IssueType): { sql: string; table: string; editableCol: string } {
  switch (type) {
    case "null_patient":
      return { sql: `SELECT rowid, * FROM epa_2 WHERE patient_id IS NULL OR TRIM(patient_id) = '' LIMIT 50`, table: "epa_2", editableCol: "patient_id" };
    case "null_ward":
      return { sql: `SELECT rowid, * FROM epa_1 WHERE ward IS NULL OR TRIM(ward) = '' LIMIT 50`, table: "epa_1", editableCol: "ward" };
    case "null_medication":
      return { sql: `SELECT rowid, * FROM medication WHERE medication_name IS NULL OR TRIM(medication_name) = '' LIMIT 50`, table: "medication", editableCol: "medication_name" };
    case "orphan_case":
      return { sql: `SELECT e2.rowid, e2.* FROM epa_2 e2 LEFT JOIN epa_1 e1 ON e2.case_id = e1.case_id WHERE e1.case_id IS NULL LIMIT 50`, table: "epa_2", editableCol: "case_id" };
  }
}

export function MappingCorrection({ database, onDataChanged }: MappingCorrectionProps) {
  const [selectedIssue, setSelectedIssue] = useState<IssueType>("null_patient");
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const issueConfig = getIssueQuery(selectedIssue);
  let result = { columns: [] as string[], values: [] as (string | number | null)[][] };
  try {
    result = runQuery(database, issueConfig.sql);
  } catch {}

  const displayColumns = result.columns.slice(1); // skip rowid
  const displayValues = result.values.map(row => row.slice(1));
  const rowIds = result.values.map(row => row[0]);

  const editableColIndex = displayColumns.indexOf(issueConfig.editableCol);

  const handleSave = (rowIndex: number) => {
    const rowid = rowIds[rowIndex];
    try {
      runUpdate(database, `UPDATE "${issueConfig.table}" SET "${issueConfig.editableCol}" = ? WHERE rowid = ?`, [editValue || null, rowid]);
      toast.success("Mapping-Fehler korrigiert");
      onDataChanged();
      setEditingRow(null);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error("Fehler: " + e.message);
    }
  };

  const maxCols = 8;
  const visibleCols = displayColumns.slice(0, maxCols);

  const currentIssue = issueTypes.find(t => t.value === selectedIssue)!;

  return (
    <Card className="border-none shadow-sm" key={refreshKey}>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          Manuelle Korrektur
        </CardTitle>
        <Select value={selectedIssue} onValueChange={v => { setSelectedIssue(v as IssueType); setEditingRow(null); }}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {issueTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Search className="h-3 w-3" />
          {currentIssue.description}
          <Badge variant="outline" className="ml-2 text-[10px]">{result.values.length} Treffer</Badge>
        </p>

        {result.values.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            ✓ Keine Mapping-Fehler dieser Kategorie gefunden.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  {visibleCols.map((col, i) => (
                    <TableHead key={i} className={`text-xs font-medium whitespace-nowrap ${col === issueConfig.editableCol ? "text-primary font-bold" : ""}`}>
                      {col}
                      {col === issueConfig.editableCol && " ✎"}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs w-20">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayValues.map((row, ri) => (
                  <TableRow key={ri} className="hover:bg-secondary/30">
                    <TableCell className="text-xs text-muted-foreground font-mono">{ri + 1}</TableCell>
                    {visibleCols.map((col, ci) => (
                      <TableCell key={ci} className="text-xs max-w-[180px]">
                        {editingRow === ri && col === issueConfig.editableCol ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="h-7 text-xs"
                              autoFocus
                              placeholder={`${col} eingeben…`}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleSave(ri);
                                if (e.key === "Escape") setEditingRow(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSave(ri)}>
                              <Check className="h-3 w-3 text-chart-2" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingRow(null)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className={`truncate block ${col === issueConfig.editableCol ? "text-destructive italic" : ""}`}>
                            {row[ci] != null && String(row[ci]).trim() !== "" ? String(row[ci]) : <span className="text-muted-foreground italic">leer</span>}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      {editingRow !== ri && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          onClick={() => { setEditingRow(ri); setEditValue(String(row[editableColIndex] ?? "")); }}
                        >
                          Korrigieren
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
