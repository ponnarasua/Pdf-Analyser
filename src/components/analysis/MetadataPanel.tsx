"use client";

import { AnalysisResult } from "@/types/analysis";
import {
  FileText, User, BookOpen, Clock, Gauge, Image as ImageIcon, Table as TableIcon
} from "lucide-react";

interface MetadataPanelProps {
  result: AnalysisResult;
}

const difficultyColors: Record<string, string> = {
  Beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Intermediate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Advanced: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function MetadataPanel({ result }: MetadataPanelProps) {
  const meta = result.metadata;
  const difficulty = result.difficulty || meta.difficulty || "Intermediate";
  const diffClass = difficultyColors[difficulty] || difficultyColors.Intermediate;

  const items = [
    { icon: FileText, label: "Document Type", value: result.documentType },
    { icon: User, label: "Author(s)", value: result.authors || "Unknown" },
    { icon: BookOpen, label: "Pages", value: String(meta.pages) },
    { icon: BookOpen, label: "Word Count", value: meta.word_count ? meta.word_count.toLocaleString() : "—" },
    { icon: Clock, label: "Reading Time", value: result.estimatedReadingTime || meta.estimated_reading_time || "—" },
    { icon: ImageIcon, label: "Images Found", value: String(meta.total_images) },
    { icon: TableIcon, label: "Tables Found", value: String(meta.total_tables) },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
          Document Metadata
        </h3>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${diffClass}`}>
          <Gauge className="w-3 h-3 inline mr-1" />
          {difficulty}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5"
          >
            <div className="flex items-center gap-1.5 text-slate-500">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-white text-sm font-medium break-words" title={value}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
