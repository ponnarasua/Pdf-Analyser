"use client";

import { Image as ImageIcon } from "lucide-react";

interface VisualInsightsProps {
  totalImages: number;
  imageInsights: string[];
}

export default function VisualInsights({ totalImages, imageInsights }: VisualInsightsProps) {
  if (totalImages === 0 && imageInsights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 backdrop-blur-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/20">
          <ImageIcon className="w-4 h-4 text-sky-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-widest uppercase text-sky-400/80">
          Visual Insights
        </h3>
        <span className="ml-auto text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
          {totalImages} image{totalImages !== 1 ? "s" : ""} found
        </span>
      </div>

      {imageInsights.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {imageInsights.map((insight, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-[10px] font-bold text-sky-400">
                {i + 1}
              </span>
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 italic">
          {totalImages > 0
            ? `${totalImages} visual element${totalImages > 1 ? "s" : ""} detected in the document.`
            : "No visual content detected."}
        </p>
      )}
    </div>
  );
}
