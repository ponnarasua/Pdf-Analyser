"use client";

import { AnalysisResult } from "@/types/analysis";
import { Lightbulb, FileText } from "lucide-react";

interface SummaryCardProps {
  result: AnalysisResult;
}

export default function SummaryCard({ result }: SummaryCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Summary */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
            Summary
          </h3>
        </div>
        <p className="text-slate-200 leading-relaxed text-sm border-l-2 border-indigo-500/60 pl-4">
          {result.summary}
        </p>
      </div>

      {/* Key Takeaway */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-6 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="flex items-center gap-2 relative">
          <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/20">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold tracking-widest uppercase text-amber-400/80">
            Key Takeaway
          </h3>
        </div>
        <p className="text-white font-medium leading-relaxed text-sm relative">
          {result.keyTakeaway}
        </p>
      </div>
    </div>
  );
}
