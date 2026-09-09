import React, { useState } from 'react';
import { HistorySession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: HistorySession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewAnalysis: () => void;
  onDeleteSession?: (id: string) => void;
  onShowDoctorPolicy?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewAnalysis,
  onDeleteSession,
  onShowDoctorPolicy,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeCRS, setActiveCRS] = useState('EPSG:32618 (UTM 18N)');

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sensors.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todaySessions = filteredSessions.filter((s) => s.timeGroup === 'Today');
  const pastSessions = filteredSessions.filter((s) => s.timeGroup === 'Previous 7 days');

  const handleSelect = (id: string) => {
    onSelectSession(id);
    // On mobile (<768px), auto close drawer on selection
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  const handleNew = () => {
    onNewAnalysis();
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          title="Click to close sidebar"
        />
      )}

      <aside
        id="sidebar"
        className={`w-[270px] bg-[#11141a] flex flex-col border-r border-[#252b3b]/60 shrink-0 transition-all duration-300 z-40 select-none ${
          // On mobile, render fixed; on desktop, render relative with margin collapse
          'fixed inset-y-0 left-0 md:relative'
        } ${isOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-[270px]'}`}
      >
        {/* Sidebar Header / Brand */}
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={handleNew}
              title="SATQuery Home"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="font-semibold text-sm tracking-tight text-[#f1f4f9] flex items-center">
                SATQuery
                <span className="text-[10px] font-mono font-normal text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-400/10 ml-1.5 border border-emerald-400/20">
                  4.2
                </span>
              </span>
            </div>
            <button
              id="sidebar-close-btn"
              onClick={onToggle}
              className="p-1 rounded-md text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">left_panel_close</span>
            </button>
          </div>

          {/* New Analysis Button */}
          <button
            id="new-analysis-btn"
            onClick={handleNew}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#1b1f2b] hover:bg-[#232838] border border-[#252b3b]/80 text-[#f1f4f9] text-xs font-medium transition-all group shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[16px] text-emerald-400 group-hover:rotate-90 transition-transform duration-300">
                add
              </span>
              <span>New Analysis</span>
            </div>
            <kbd className="font-mono text-[10px] text-[#94a3b8] bg-[#151821] px-1.5 py-0.5 rounded border border-[#252b3b]/60">
              ⌘K
            </kbd>
          </button>

          {/* Search / Filter Analyses Input */}
          <div className="relative mt-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-[#94a3b8]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter missions..."
              className="w-full bg-[#151821] text-xs text-[#f1f4f9] placeholder:text-[#94a3b8]/60 pl-8 pr-7 py-1.5 rounded-lg border border-[#252b3b]/80 focus:outline-none focus:border-emerald-400/60 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f1f4f9] text-[13px] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* History Timeline / Sessions */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {/* Today */}
          {todaySessions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-[#94a3b8]/60 tracking-wider uppercase font-mono">
                Today
              </div>
              <nav className="space-y-1 mt-1" id="history-today">
                {todaySessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      className={`group relative rounded-lg transition-colors flex items-center ${
                        isActive
                          ? 'bg-[#232838] border border-[#252b3b]'
                          : 'hover:bg-[#1b1f2b]'
                      }`}
                    >
                      <button
                        onClick={() => handleSelect(session.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs truncate cursor-pointer ${
                          isActive
                            ? 'text-emerald-400 font-medium'
                            : 'text-[#94a3b8] hover:text-[#f1f4f9]'
                        }`}
                        title={session.title}
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] shrink-0 ${
                            isActive ? 'text-emerald-400' : 'text-[#94a3b8]/70'
                          }`}
                        >
                          {session.icon}
                        </span>
                        <span className="truncate pr-4">{session.title}</span>
                      </button>

                      {onDeleteSession && sessions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-[#94a3b8] hover:text-red-400 transition-opacity rounded cursor-pointer"
                          title="Remove from history"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Previous 7 days */}
          {pastSessions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-[#94a3b8]/60 tracking-wider uppercase font-mono">
                Previous 7 days
              </div>
              <nav className="space-y-1 mt-1" id="history-past">
                {pastSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      className={`group relative rounded-lg transition-colors flex items-center ${
                        isActive
                          ? 'bg-[#232838] border border-[#252b3b]'
                          : 'hover:bg-[#1b1f2b]'
                      }`}
                    >
                      <button
                        onClick={() => handleSelect(session.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs truncate cursor-pointer ${
                          isActive
                            ? 'text-emerald-400 font-medium'
                            : 'text-[#94a3b8] hover:text-[#f1f4f9]'
                        }`}
                        title={session.title}
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] shrink-0 ${
                            isActive ? 'text-emerald-400' : 'text-[#94a3b8]/70'
                          }`}
                        >
                          {session.icon}
                        </span>
                        <span className="truncate pr-4">{session.title}</span>
                      </button>

                      {onDeleteSession && sessions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-[#94a3b8] hover:text-red-400 transition-opacity rounded cursor-pointer"
                          title="Remove from history"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="text-center py-6 text-xs text-[#94a3b8]/60 font-mono">
              No matching missions found
            </div>
          )}
        </div>

        {/* Sidebar Bottom: Status Pill & User Profile */}
        <div className="p-3 border-t border-[#252b3b]/60 flex flex-col gap-2.5 bg-[#11141a] relative">
          {/* GeoDoctor Shield Pill */}
          <button
            onClick={onShowDoctorPolicy}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#151821] hover:bg-[#1b1f2b] border border-[#252b3b]/60 transition-colors cursor-pointer text-left group"
            title="Inspect GeoDoctor Shield Audit Policy"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-[11px] text-emerald-400 font-medium group-hover:underline">
                GeoDoctor Shield
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono bg-[#1b1f2b] px-1.5 py-0.5 rounded border border-emerald-400/20">
              ACTIVE
            </span>
          </button>

          {/* User Profile */}
          <div className="relative">
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center justify-between px-2 py-1.5 hover:bg-[#1b1f2b] rounded-lg cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500/30 to-sky-400/30 border border-[#252b3b] flex items-center justify-center text-xs font-semibold text-emerald-400">
                  EA
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-[#f1f4f9] truncate group-hover:text-emerald-400 transition-colors">
                    EO Analyst 04
                  </div>
                  <div className="text-[10px] text-[#94a3b8] font-mono truncate">
                    Defense & Geospatial
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-[#94a3b8]">
                {userMenuOpen ? 'expand_less' : 'more_vert'}
              </span>
            </div>

            {/* User Preferences Popover */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl bg-[#151821] border border-[#252b3b] shadow-2xl text-xs font-mono space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] uppercase text-[#94a3b8] font-semibold border-b border-[#252b3b]/60">
                  Analyst Preferences
                </div>
                <div className="px-2 py-1 text-[11px] text-[#94a3b8] flex justify-between items-center">
                  <span>CRS:</span>
                  <span className="text-emerald-400">{activeCRS}</span>
                </div>
                <div className="px-2 py-1 text-[11px] text-[#94a3b8] flex justify-between items-center">
                  <span>Clearance:</span>
                  <span className="text-amber-400 font-bold">TS // SI-TK</span>
                </div>
                <button
                  onClick={() => {
                    setActiveCRS(
                      activeCRS.includes('32618') ? 'EPSG:4326 (WGS 84)' : 'EPSG:32618 (UTM 18N)'
                    );
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-[#1b1f2b] text-[#f1f4f9] transition-colors cursor-pointer"
                >
                  Toggle Default CRS Coordinate Grid
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

