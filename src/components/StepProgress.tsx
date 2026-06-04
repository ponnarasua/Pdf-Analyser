"use client";

import { Step } from "@/types/analysis";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

interface StepProgressProps {
  steps: Step[];
  statusMessage?: string;
}

export default function StepProgress({ steps, statusMessage }: StepProgressProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
      <h3 className="text-sm font-semibold tracking-widest uppercase text-slate-400 mb-5">
        Analysis Progress
      </h3>
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="shrink-0">
              {step.status === "done" && (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              )}
              {step.status === "active" && (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              )}
              {step.status === "pending" && (
                <Circle className="w-5 h-5 text-slate-600" />
              )}
              {step.status === "error" && (
                <Circle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <span
              className={`text-sm font-medium transition-colors ${
                step.status === "done"
                  ? "text-emerald-400"
                  : step.status === "active"
                  ? "text-white"
                  : step.status === "error"
                  ? "text-red-400"
                  : "text-slate-600"
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>
      {statusMessage && (
        <p className="mt-4 text-xs text-slate-500 italic border-t border-white/5 pt-3">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
