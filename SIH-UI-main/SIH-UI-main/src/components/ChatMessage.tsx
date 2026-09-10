import React, { useState } from 'react';
import { ChatMessageItem } from '../types';
import { ThoughtAccordion } from './ThoughtAccordion';
import { SpatialEvidenceCard } from './SpatialEvidenceCard';

interface ChatMessageProps {
  message: ChatMessageItem;
  onRegenerate?: () => void;
  onSelectObservation?: (tag: 'T0' | 'T1') => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onSelectObservation,
}) => {
  const [copied, setCopied] = useState(false);
  const [thumb, setThumb] = useState<'up' | 'down' | null>(null);

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // User message rendering
  if (message.sender === 'user') {
    return (
      <div className="flex flex-col items-end gap-2 group animate-in fade-in duration-300">
        {/* Attached observation thumbnails if present */}
        {message.observations && message.observations.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {message.observations.map((obs) => (
              <div
                key={obs.id}
                onClick={() => onSelectObservation?.(obs.tag)}
                className="flex items-center gap-2 bg-[#1b1f2b] p-1.5 pr-3 rounded-xl border border-[#252b3b] shadow-sm cursor-pointer hover:border-emerald-400/60 transition-colors"
                title={`Click to inspect ${obs.tag} observation`}
              >
                <div
                  className="w-9 h-9 rounded-lg bg-cover bg-center shrink-0 border border-[#252b3b] relative overflow-hidden"
                  style={{
                    backgroundImage: `url('${obs.imageUrl}')`,
                    filter: obs.filterStyle || 'none',
                  }}
                >
                  <div className="absolute inset-0 bg-emerald-950/20"></div>
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-medium text-[#f1f4f9] flex items-center gap-1">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold ${
                        obs.tag === 'T0' ? 'text-[#38bdf8]' : 'text-emerald-400'
                      }`}
                    >
                      {obs.tag}
                    </span>{' '}
                    {obs.title}
                  </div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">
                    {obs.sensor} • {obs.gsd}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User Prompt Bubble */}
        <div className="bg-[#232838] text-[#f1f4f9] px-4 py-3 rounded-2xl rounded-tr-sm max-w-xl text-[14px] leading-relaxed shadow-sm border border-[#252b3b]/70">
          {message.content}
        </div>
        <div className="text-[10px] font-mono text-[#94a3b8]/60 pr-1">
          {message.timestamp}
        </div>
      </div>
    );
  }

  // Assistant message rendering (SATQuery)
  return (
    <div className="flex items-start gap-3.5 animate-in fade-in duration-300">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-[#1b1f2b] border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <span className="material-symbols-outlined text-[18px] text-emerald-400">
          satellite_alt
        </span>
      </div>

      <div className="flex-1 space-y-4 min-w-0">
        {/* Header line */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-tight text-[#f1f4f9]">
            SATQuery Core
          </span>
          <span className="text-[10px] font-mono text-[#94a3b8]">4.2 Agentic</span>
        </div>

        {/* Thought trace accordion if present */}
        {message.thoughtTrace && (
          <ThoughtAccordion
            duration={message.thoughtTrace.duration}
            subtaskCount={message.thoughtTrace.subtaskCount}
            steps={message.thoughtTrace.steps}
          />
        )}

        {/* GeoDoctor Refusal Shield Alert if active */}
        {message.isRefusalShield && message.refusalDetails && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-xs font-mono text-[#f1f4f9] space-y-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>{message.refusalDetails.title}</span>
            </div>
            <p className="text-[#f1f4f9]/90 leading-relaxed font-sans text-xs">
              <strong>Spatial Resolution Mismatch Alert:</strong> Primary sensor is 10.0m Sentinel-2 MSI; target comparison is 0.5m WorldView-3 Panchromatic without an established ground-control sub-pixel point grid.
            </p>
            <div className="bg-[#080a0d]/80 p-2.5 rounded border border-red-500/20 text-[11px] space-y-1 text-[#94a3b8]">
              <div>
                <span className="text-red-400 font-semibold">Violation: </span>
                {message.refusalDetails.violation}
              </div>
              <div>
                <span className="text-red-400 font-semibold">Risk: </span>
                {message.refusalDetails.risk}
              </div>
              <div>
                <span className="text-emerald-400 font-semibold">Resolution: </span>
                {message.refusalDetails.resolution}
              </div>
            </div>
            <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5 pt-1">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">
                verified
              </span>
              <span>Refusal shield prevents catastrophic pipeline hallucination.</span>
            </div>
          </div>
        )}

        {/* Main Answer Text */}
        <div className="text-[14px] leading-relaxed space-y-3 text-[#f1f4f9] whitespace-pre-line">
          {message.content}
        </div>

        {/* Spatial Evidence Inspection Artifact Card */}
        {message.evidenceData && (
          <SpatialEvidenceCard
            t0Image={message.evidenceData.t0Image}
            t1Image={message.evidenceData.t1Image}
            zones={message.evidenceData.zones}
            summaryMetrics={message.evidenceData.summaryMetrics}
          />
        )}

        {/* Action Bar (Copy, Thumbs Up/Down, Regenerate) */}
        <div className="flex items-center gap-1 pt-1 text-[#94a3b8]">
          <button
            onClick={handleCopyText}
            className="p-1.5 rounded-md hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer"
            title="Copy Response"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'check' : 'content_copy'}
            </span>
          </button>

          <button
            onClick={() => setThumb(thumb === 'up' ? null : 'up')}
            className={`p-1.5 rounded-md hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer ${
              thumb === 'up' ? 'text-emerald-400' : ''
            }`}
            title="Good Response"
          >
            <span className="material-symbols-outlined text-[16px]">thumb_up</span>
          </button>

          <button
            onClick={() => setThumb(thumb === 'down' ? null : 'down')}
            className={`p-1.5 rounded-md hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer ${
              thumb === 'down' ? 'text-red-400' : ''
            }`}
            title="Bad Response"
          >
            <span className="material-symbols-outlined text-[16px]">thumb_down</span>
          </button>

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-md hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer"
              title="Regenerate Analysis"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
