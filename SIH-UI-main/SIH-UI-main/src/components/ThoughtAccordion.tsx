import React, { useState } from 'react';
import { TraceStep } from '../types';

interface ThoughtAccordionProps {
  duration?: string;
  subtaskCount?: number;
  steps: TraceStep[];
}

export const ThoughtAccordion: React.FC<ThoughtAccordionProps> = ({
  duration = '3 seconds',
  subtaskCount = 4,
  steps,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      id="thought-accordion"
      className="rounded-xl border border-[#252b3b]/70 bg-[#151821] overflow-hidden transition-all duration-300 shadow-sm"
    >
      <button
        id="thought-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b]/60 transition-colors select-none cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">
            psychology
          </span>
          <span className="font-medium text-[#f1f4f9]">Thought for {duration}</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-400/30 px-2 py-0.5 rounded-md">
            {subtaskCount} sub-tasks verified
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#94a3b8]/80">
          <span className="text-[11px] font-mono">
            {isOpen ? 'Collapse Trace' : 'Inspect Trace'}
          </span>
          <span
            className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          id="thought-content"
          className="px-4 pb-3.5 pt-2 border-t border-[#252b3b]/40 space-y-2.5 text-xs font-mono text-[#94a3b8] bg-[#080a0d]/60"
        >
          {steps.map((step, idx) => {
            const badgeClass =
              step.tagColor === 'primary'
                ? 'bg-emerald-500/10 text-emerald-400'
                : step.tagColor === 'secondary'
                ? 'bg-sky-500/10 text-sky-400'
                : 'bg-teal-500/10 text-teal-300';

            return (
              <div key={idx} className="flex items-start gap-2.5 pt-1">
                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 ${badgeClass}`}>
                  {step.stepNumber}
                </span>
                <div className="leading-relaxed">
                  <span className="text-[#f1f4f9] font-semibold">{step.title}: </span>
                  <span>{step.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
