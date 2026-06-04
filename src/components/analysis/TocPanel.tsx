"use client";

import { useState } from "react";
import { TocEntry } from "@/types/analysis";
import { ChevronDown, ChevronRight, List } from "lucide-react";

interface TocPanelProps {
  toc: TocEntry[];
}

function TocNode({ entry, allEntries, index }: { entry: TocEntry; allEntries: TocEntry[]; index: number }) {
  const [open, setOpen] = useState(true);
  // Find direct children (next entries with level + 1 that come before same-level sibling)
  const children: TocEntry[] = [];
  let i = index + 1;
  while (i < allEntries.length && allEntries[i].level > entry.level) {
    if (allEntries[i].level === entry.level + 1) {
      children.push(allEntries[i]);
    }
    i++;
  }
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group hover:bg-white/5 transition-colors ${
          entry.level === 1 ? "text-white" : "text-slate-400"
        }`}
        style={{ paddingLeft: `${(entry.level - 1) * 16 + 8}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )
        ) : (
          <span className="w-3.5 h-3.5 shrink-0 border-l border-white/10 ml-0.5" />
        )}
        <span className={`text-xs flex-1 truncate ${entry.level === 1 ? "font-semibold" : "font-normal"}`}>
          {entry.title}
        </span>
        <span className="text-[10px] text-slate-600 shrink-0">p.{entry.page}</span>
      </div>
    </div>
  );
}

export default function TocPanel({ toc }: TocPanelProps) {
  if (!toc || toc.length === 0) return null;

  // Only render top-level entries; children will be handled by TocNode
  const topLevel = toc.filter((e) => e.level === 1);
  // If no level-1 entries, show all
  const entriesToRender = topLevel.length > 0 ? toc : toc;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/20">
          <List className="w-4 h-4 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-400">
          Document Structure
        </h3>
        <span className="ml-auto text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
          {toc.length} sections
        </span>
      </div>

      <div className="flex flex-col overflow-auto max-h-72 pr-1 custom-scroll">
        {entriesToRender.map((entry, i) => (
          <TocNode key={i} entry={entry} allEntries={entriesToRender} index={i} />
        ))}
      </div>
    </div>
  );
}
