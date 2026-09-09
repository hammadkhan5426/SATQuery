import React, { useRef, useEffect } from 'react';
import { AttachmentFile } from '../types';

interface PromptComposerProps {
  promptText: string;
  onPromptChange: (text: string) => void;
  onSubmit: (prompt?: string) => void;
  isLoading: boolean;
  attachments: AttachmentFile[];
  onRemoveAttachment: (id: string) => void;
  onOpenUploadModal: () => void;
  onTriggerBoundingBox: () => void;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  promptText,
  onPromptChange,
  onSubmit,
  isLoading,
  attachments,
  onRemoveAttachment,
  onOpenUploadModal,
  onTriggerBoundingBox,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        128
      )}px`;
    }
  }, [promptText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (promptText.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  const suggestedPrompts = [
    {
      icon: '✦',
      text: 'Has urban development increased in Zone 2?',
      style:
        'hover:text-emerald-400 hover:border-emerald-400/50 text-[#f1f4f9]',
      iconColor: 'text-emerald-400',
    },
    {
      icon: '≈',
      text: 'Can SAR provide additional evidence?',
      style: 'hover:text-sky-400 hover:border-sky-400/50 text-[#f1f4f9]',
      iconColor: 'text-[#38bdf8]',
    },
    {
      icon: '⚠',
      text: 'Test Incompatible Imagery (Refusal Shield Demo)',
      style: 'hover:text-red-400 hover:border-red-500/50 text-red-300 border-red-500/30',
      iconColor: 'text-red-400',
    },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0c0e12] via-[#0c0e12]/95 to-transparent pointer-events-none z-20">
      <div className="max-w-3xl lg:max-w-4xl mx-auto pointer-events-auto space-y-2">
        {/* Suggested Prompt Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {suggestedPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSubmit(item.text)}
              className={`prompt-chip shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1b1f2b]/90 hover:bg-[#232838] border border-[#252b3b] transition-all text-xs shadow-sm group cursor-pointer ${item.style}`}
            >
              <span className={`${item.iconColor} group-hover:scale-110 transition-transform font-bold`}>
                {item.icon}
              </span>
              <span>{item.text}</span>
            </button>
          ))}
        </div>

        {/* Active Attached Imagery Pill Shelf */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5" id="attachments-bar">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-[#232838]/90 pl-2 pr-2.5 py-1 rounded-full border border-[#252b3b] text-xs shadow-sm group"
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  att.index === 1
                    ? 'bg-sky-500/20 text-[#38bdf8]'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {att.index}
              </span>
              <span className="text-[#f1f4f9] font-mono text-[11px] truncate max-w-[140px]">
                {att.filename}
              </span>
              <button
                onClick={() => onRemoveAttachment(att.id)}
                className="text-[#94a3b8] hover:text-red-400 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          ))}

          <span className="text-[11px] text-[#94a3b8] font-mono pl-1 hidden sm:inline">
            {attachments.length} {attachments.length === 1 ? 'sensor active' : 'sensors mounted for multi-temporal reasoning'}
          </span>
        </div>

        {/* The Floating Centered Prompt Bar */}
        <div className="relative bg-[#1b1f2b]/95 backdrop-blur-xl border border-[#252b3b] rounded-2xl md:rounded-3xl shadow-2xl p-1.5 md:p-2 transition-all focus-within:border-emerald-400/70 focus-within:ring-1 focus-within:ring-emerald-400/40">
          <div className="flex items-end gap-2">
            {/* Plus / Attach Button */}
            <button
              onClick={onOpenUploadModal}
              className="p-2 rounded-xl text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#232838] transition-colors flex items-center justify-center cursor-pointer"
              title="Upload GeoTIFF / Satellite Observation"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </button>

            {/* Auto-expanding Textarea */}
            <textarea
              ref={textareaRef}
              value={promptText}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              placeholder="Ask SATQuery anything (e.g. 'Detect new foundation piers', 'Check SAR subsidence', 'Calculate NDVI vegetation drop')..."
              className="w-full bg-transparent text-sm md:text-[15px] text-[#f1f4f9] placeholder:text-[#94a3b8]/60 resize-none py-2 px-1 focus:outline-none max-h-32 leading-relaxed"
            />

            {/* Right Controls: Spatial Box Tool & Send Arrow */}
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                onClick={onTriggerBoundingBox}
                className="p-2 rounded-xl text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#232838] transition-colors hidden sm:flex cursor-pointer"
                title="Spatial Bounding Box Selection"
              >
                <span className="material-symbols-outlined text-[20px]">crop_free</span>
              </button>

              <button
                onClick={() => onSubmit()}
                disabled={!promptText.trim() || isLoading}
                className="w-9 h-9 rounded-xl bg-emerald-400 text-[#003825] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_14px_rgba(52,211,153,0.4)] shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Send Analysis Query"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">
                  {isLoading ? 'hourglass_top' : 'arrow_upward'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Under-Bar Ground-Truth Disclaimer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#94a3b8]/70 text-center">
          <span className="material-symbols-outlined text-[13px] text-emerald-400">
            verified_user
          </span>
          <span>
            SATQuery validates sensor compatibility before inference. Ground-truth audited to eliminate optical hallucinations.
          </span>
        </div>
      </div>
    </div>
  );
};
