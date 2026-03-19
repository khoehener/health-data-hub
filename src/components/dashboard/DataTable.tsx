import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Pencil, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Database } from "sql.js";
import { runQuery, runUpdate, downloadDatabase } from "@/lib/database";
import { toast } from "sonner";

interface DataTableProps {
  database: Database;
  onDataChanged: () => void;
}

const TABLES = ["epa_1", "epa_2", "vitals", "labs", "device"];
const PAGE_SIZE = 20;

export function DataTable({ database, onDataChanged }: DataTableProps) {
  const [selectedTable, setSelectedTable] = useState("epa_2");
  const [page, setPage] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  const result = runQuery(database, `SELECT rowid, * FROM "${selectedTable}" LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`);
  const countResult = runQuery(database, `SELECT COUNT(*) FROM "${selectedTable}"`);
  const totalRows = countResult.values[0]?.[0] as number || 0;
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);

  // columns without rowid
  const displayColumns = result.columns.slice(1);
  const displayValues = result.values.map(row => row.slice(1));
  const rowIds = result.values.map(row => row[0]);

  const handleEdit = (rowIndex: number, colIndex: number) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(String(displayValues[rowIndex][colIndex] ?? ""));
  };

  const handleSave = () => {
    if (!editingCell) return;
    const { row, col } = editingCell;
    const column = displayColumns[col];
    const rowid = rowIds[row];

    try {
      runUpdate(database, `UPDATE "${selectedTable}" SET "${column}" = ? WHERE rowid = ?`, [editValue || null, rowid]);
      toast.success("Wert erfolgreich aktualisiert");
      onDataChanged();
    } catch (e: any) {
      toast.error("Fehler beim Speichern: " + e.message);
    }
    setEditingCell(null);
  };

  const handleCancel = () => setEditingCell(null);

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setPage(0);
    setEditingCell(null);
  };

  // Show only first 10 columns for readability, plus a note
  const maxCols = 12;
  const visibleColumns = displayColumns.slice(0, maxCols);
  const hasMoreCols = displayColumns.length > maxCols;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="text-base font-semibold">Daten bearbeiten</CardTitle>
        <div className="flex items-center gap-3">
          <Select value={selectedTable} onValueChange={handleTableChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={downloadDatabase}>
            <Download className="h-4 w-4 mr-1" /> DB Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalRows === 0 ? (
          <p className="text-muted-foreground text-center py-8">Keine Daten in dieser Tabelle.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="w-10 text-xs">#</TableHead>
                    {visibleColumns.map((col, i) => (
                      <TableHead key={i} className="text-xs font-medium whitespace-nowrap">{col}</TableHead>
                    ))}
                    {hasMoreCols && <TableHead className="text-xs text-muted-foreground">+{displayColumns.length - maxCols} Spalten</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayValues.map((row, ri) => (
                    <TableRow key={ri} className="hover:bg-secondary/30">
                      <TableCell className="text-xs text-muted-foreground font-mono">{page * PAGE_SIZE + ri + 1}</TableCell>
                      {visibleColumns.map((_, ci) => (
                        <TableCell key={ci} className="text-xs max-w-[200px]">
                          {editingCell?.row === ri && editingCell?.col === ci ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="h-7 text-xs"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleSave();
                                  if (e.key === "Escape") handleCancel();
                                }}
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
                                <Check className="h-3 w-3 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer truncate hover:text-primary transition-colors group flex items-center gap-1"
                              onClick={() => handleEdit(ri, ci)}
                              title={String(row[ci] ?? "")}
                            >
                              <span className="truncate">{row[ci] != null ? String(row[ci]) : <span className="text-muted-foreground italic">null</span>}</span>
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
                            </div>
                          )}
                        </TableCell>
                      ))}
                      {hasMoreCols && <TableCell />}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Zeige {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalRows)} von {totalRows} Einträgen
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
