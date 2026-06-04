"use client";

import { Table as TableIcon } from "lucide-react";

interface TableInsightsProps {
  totalTables: number;
  tableInsights: string[];
}

export default function TableInsights({ totalTables, tableInsights }: TableInsightsProps) {
  if (totalTables === 0 && tableInsights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 backdrop-blur-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-teal-500/15 border border-teal-500/20">
          <TableIcon className="w-4 h-4 text-teal-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-widest uppercase text-teal-400/80">
          Table Insights
        </h3>
        <span className="ml-auto text-xs font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
          {totalTables} table{totalTables !== 1 ? "s" : ""} found
        </span>
      </div>

      {tableInsights.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {tableInsights.map((insight, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-teal-500/15 border border-teal-500/20 flex items-center justify-center text-[10px] font-bold text-teal-400">
                {i + 1}
              </span>
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 italic">
          {totalTables > 0
            ? `${totalTables} table${totalTables > 1 ? "s" : ""} detected in the document.`
            : "No tables detected."}
        </p>
      )}
    </div>
  );
}
