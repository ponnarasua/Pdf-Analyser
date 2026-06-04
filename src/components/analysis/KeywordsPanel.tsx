"use client";

import { Tag, Brain } from "lucide-react";

interface KeywordsPanelProps {
  keywords: string[];
  mainTopics: string[];
}

const topicColors = [
  "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
  "bg-violet-500/10 border-violet-500/20 text-violet-300",
  "bg-purple-500/10 border-purple-500/20 text-purple-300",
  "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300",
  "bg-pink-500/10 border-pink-500/20 text-pink-300",
  "bg-rose-500/10 border-rose-500/20 text-rose-300",
];

export default function KeywordsPanel({ keywords, mainTopics }: KeywordsPanelProps) {
  if (keywords.length === 0 && mainTopics.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-slate-500/15 border border-slate-500/20">
              <Tag className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
              Keywords
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/8 transition-colors cursor-default"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Topics */}
      {mainTopics.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
              Main Topics
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {mainTopics.map((topic, i) => (
              <span
                key={topic}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${topicColors[i % topicColors.length]}`}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
