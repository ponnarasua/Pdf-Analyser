"use client";

import { Sparkles } from "lucide-react";

interface AdditionalInsightsProps {
  insights: string[];
}

export default function AdditionalInsights({ insights }: AdditionalInsightsProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 backdrop-blur-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20">
          <Sparkles className="w-4 h-4 text-fuchsia-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-widest uppercase text-fuchsia-400/80">
          Additional Highlights
        </h3>
        <span className="ml-auto text-xs font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20">
          {insights.length} observation{insights.length !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
            <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center text-[10px] font-bold text-fuchsia-400">
              {i + 1}
            </span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
