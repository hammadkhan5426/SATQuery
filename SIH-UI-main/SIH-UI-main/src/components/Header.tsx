import React, { useState } from 'react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onReset: () => void;
  onExportPdf: () => void;
  onShare: () => void;
  currentModel: string;
  onSelectModel: (model: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onReset,
  onExportPdf,
  onShare,
  currentModel,
  onSelectModel,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const models = [
    {
      id: 'SATQuery Core 4.2',
      name: 'SATQuery Core 4.2',
      tag: 'Agentic Orchestrator',
      desc: 'Optimized for bi-temporal optical & InSAR fusion with GeoDoctor verification.',
    },
    {
      id: 'SATQuery Sub-Pixel 4.1',
      name: 'SATQuery Sub-Pixel 4.1',
      tag: 'Super-Resolution',
      desc: 'High-frequency bicubic & transformer interpolation for 10m to 0.5m co-registration.',
    },
    {
      id: 'SATQuery RadarCoherence 3.8',
      name: 'SATQuery RadarCoherence 3.8',
      tag: 'InSAR Specialist',
      desc: 'Specialized in dual-pol phase displacement and crustal ground deformation.',
    },
  ];

  return (
    <header className="h-[52px] px-4 border-b border-[#252b3b]/60 flex items-center justify-between bg-[#11141a]/90 backdrop-blur-md shrink-0 z-20">
      <div className="flex items-center gap-3">
        {/* Sidebar toggle */}
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors"
          title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {sidebarOpen ? 'left_panel_close' : 'left_panel_open'}
          </span>
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#1b1f2b] transition-colors group cursor-pointer"
          >
            <span className="text-xs md:text-sm font-semibold text-[#f1f4f9] flex items-center gap-1.5">
              {currentModel}
              <span className="text-[11px] font-normal text-[#94a3b8] hidden sm:inline">
                (Agentic Orchestrator)
              </span>
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#94a3b8] group-hover:text-[#f1f4f9] transition-colors">
              expand_more
            </span>
          </button>

          {modelDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-[#151821] border border-[#252b3b] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#94a3b8] tracking-wider">
                Select Intelligence Engine
              </div>
              <div className="space-y-1 mt-1">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m.id);
                      setModelDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                      currentModel === m.id
                        ? 'bg-[#232838] border border-emerald-400/40 text-emerald-400'
                        : 'hover:bg-[#1b1f2b] text-[#f1f4f9]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{m.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#11141a] text-[#94a3b8]">
                        {m.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-tight line-clamp-2">
                      {m.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Status Badges */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded-full bg-[#1b1f2b] border border-[#252b3b]/80 text-[#38bdf8]">
            Optical + SAR
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Zero-Hallucination
          </span>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onShare}
          className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors text-xs flex items-center gap-1"
          title="Share Analysis"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>

        <button
          onClick={onExportPdf}
          className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors text-xs flex items-center gap-1"
          title="Export Evidence PDF"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
        </button>

        <button
          id="clear-chat-btn"
          onClick={onReset}
          className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors"
          title="Reset Conversation"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>
    </header>
  );
};
