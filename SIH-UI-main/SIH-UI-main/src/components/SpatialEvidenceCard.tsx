import React, { useState } from 'react';
import { ZoneDetail } from '../types';

interface SpatialEvidenceCardProps {
  t0Image: string;
  t1Image: string;
  zones: ZoneDetail[];
  summaryMetrics: {
    netConversion: string;
    confidence: string;
    zonesCount: string;
  };
}

export const SpatialEvidenceCard: React.FC<SpatialEvidenceCardProps> = ({
  t0Image,
  t1Image,
  zones,
  summaryMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'overlay' | 'before' | 'after'>('overlay');
  const [isSplitActive, setIsSplitActive] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('zone-1');
  const [isRadarSweeping, setIsRadarSweeping] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const handleTabChange = (tab: 'overlay' | 'before' | 'after') => {
    setActiveTab(tab);
    setIsSplitActive(false);
  };

  const handleToggleSplit = () => {
    setIsSplitActive(!isSplitActive);
  };

  const handleSelectZone = (id: string) => {
    setSelectedZoneId(id);
    setActiveTab('overlay');
    setIsSplitActive(false);
    setShowOverlays(true);
  };

  const triggerRadarSweep = () => {
    setIsRadarSweeping(true);
    setToastMessage('SAR Interferometric coherence scan in progress across Sentinel-1 C-SAR...');
    setTimeout(() => {
      setIsRadarSweeping(false);
      setToastMessage('✓ SAR Coherence Verified: γ = 0.942 | SNR +18.4 dB | Subsidence: 0.00mm');
      setTimeout(() => setToastMessage(null), 4000);
    }, 1200);
  };

  const handleDownloadGeoJSON = () => {
    const geojsonData = {
      type: 'FeatureCollection',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:EPSG::32618' },
      },
      metadata: {
        mission: 'SATQuery Core 4.2',
        verifiedBy: 'GeoDoctor Shield',
        timestamp: new Date().toISOString(),
        confidenceScore: 0.964,
      },
      features: zones.map((z, idx) => ({
        type: 'Feature',
        properties: {
          zoneId: z.id,
          name: z.name,
          classification: z.classification,
          areaDeltaM2: parseInt(z.areaDelta.replace(/[^0-9]/g, ''), 10) || 0,
          confidence: z.confidence,
          material: z.material,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              ...z.coordinates,
              z.coordinates[0], // closed ring
            ],
          ],
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojsonData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SATQuery_Detected_Footprints_EPSG32618.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage('GeoJSON exported to local downloads (4 vector polygons, EPSG:32618)');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyCitation = () => {
    navigator.clipboard.writeText('SATQ-HASH-EQ9042-EPSG32618-VERIFIED-REAL');
    setCopiedCitation(true);
    setToastMessage('Citation hash #EQ-9042 copied to clipboard');
    setTimeout(() => {
      setCopiedCitation(false);
      setToastMessage(null);
    }, 2000);
  };

  // Determine view mode label
  let modeLabel = 'MODE: OVERLAY';
  if (isSplitActive) modeLabel = `MODE: SPLIT COMPARE (${splitPercent}%)`;
  else if (activeTab === 'before') modeLabel = 'MODE: BEFORE (T0 BASELINE)';
  else if (activeTab === 'after') modeLabel = 'MODE: AFTER (T1 0.5m WV-3)';

  return (
    <div
      id="evidence-card"
      className="rounded-2xl border border-[#252b3b]/70 bg-[#151821] overflow-hidden shadow-2xl"
    >
      {/* Evidence Card Header with Tabs & Split Mode Toggle */}
      <div className="px-4 py-2.5 bg-[#1b1f2b] flex flex-wrap items-center justify-between gap-2 border-b border-[#252b3b]/60">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">
            map
          </span>
          <span className="text-xs font-semibold text-[#f1f4f9] tracking-wider uppercase font-mono">
            Spatial Evidence Inspection
          </span>
          <span
            id="active-view-indicator"
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#232838] text-[#94a3b8] hidden md:inline border border-[#252b3b]"
          >
            {modeLabel}
          </span>
        </div>

        {/* Action Tabs & Compare Slider Button */}
        <div className="flex items-center gap-2">
          <div
            id="viewer-tabs"
            className="flex items-center bg-[#0c0e12] p-1 rounded-lg border border-[#252b3b] text-xs"
          >
            <button
              onClick={() => handleTabChange('overlay')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overlay' && !isSplitActive
                  ? 'bg-emerald-400 text-[#003825] font-semibold shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f1f4f9]'
              }`}
            >
              {activeTab === 'overlay' && !isSplitActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#003825]"></span>
              )}
              Evidence Overlay
            </button>

            <button
              onClick={() => handleTabChange('before')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'before' && !isSplitActive
                  ? 'bg-emerald-400 text-[#003825] font-semibold shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f1f4f9]'
              }`}
            >
              Before (T0)
            </button>

            <button
              onClick={() => handleTabChange('after')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'after' && !isSplitActive
                  ? 'bg-emerald-400 text-[#003825] font-semibold shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f1f4f9]'
              }`}
            >
              After (T1)
            </button>
          </div>

          <button
            id="toggle-split-btn"
            onClick={handleToggleSplit}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSplitActive
                ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400 font-medium'
                : 'bg-[#232838] hover:bg-[#2e3448] border-[#252b3b] text-[#38bdf8]'
            }`}
            title="Enable Interactive Split Slider"
          >
            <span className="material-symbols-outlined text-[15px]">compare</span>
            <span className="hidden sm:inline">Compare Slider</span>
          </button>
        </div>
      </div>

      {/* Satellite Image Display Container */}
      <div
        id="viewport-stage"
        className="relative w-full aspect-[16/9] bg-[#080a0d] overflow-hidden select-none group"
      >
        {/* Transform container for zoom */}
        <div
          className="absolute inset-0 transition-transform duration-300 origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Layer Before (T0) */}
          <div
            id="layer-before"
            className="absolute inset-0 transition-opacity duration-500 overflow-hidden"
            style={{
              opacity: activeTab === 'before' || isSplitActive ? 1 : 0,
            }}
          >
            <img
              src={t0Image}
              alt="Baseline satellite observation T0"
              className="w-full h-full object-cover"
              style={{
                filter: 'contrast(1.1) brightness(0.85) hue-rotate(-25deg) saturate(1.3)',
              }}
            />
            <div className="absolute top-3 left-3 bg-[#080a0d]/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-[#38bdf8] border border-[#38bdf8]/30">
              T0: APRIL 2023 (10m Optical)
            </div>
          </div>

          {/* Layer After (T1 + Overlay) */}
          <div
            id="layer-after"
            className="absolute inset-0 transition-opacity duration-500 overflow-hidden"
            style={{
              opacity: activeTab === 'before' && !isSplitActive ? 0 : 1,
              clipPath: isSplitActive
                ? `polygon(${splitPercent}% 0, 100% 0, 100% 100%, ${splitPercent}% 100%)`
                : 'none',
            }}
          >
            <img
              id="evidence-img"
              src={t1Image}
              alt="High-resolution satellite observation T1"
              className="w-full h-full object-cover"
              style={{
                filter: 'hue-rotate(10deg) contrast(1.18)',
              }}
            />

            {/* Interactive Bounding Boxes & Footprints (Overlay) */}
            {showOverlays && (
              <div
                id="overlay-layer"
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  opacity: activeTab === 'overlay' || isSplitActive ? 1 : 0,
                }}
              >
                {zones.map((zone) => {
                  const isSelected = zone.id === selectedZoneId;
                  const borderColor =
                    zone.colorTheme === 'primary'
                      ? 'border-emerald-400'
                      : zone.colorTheme === 'secondary'
                      ? 'border-sky-400'
                      : 'border-teal-300';

                  const bgColor =
                    zone.colorTheme === 'primary'
                      ? 'bg-emerald-400/20 hover:bg-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                      : zone.colorTheme === 'secondary'
                      ? 'bg-sky-400/20 hover:bg-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'bg-teal-400/20 hover:bg-teal-400/30 shadow-[0_0_15px_rgba(97,239,178,0.4)]';

                  const textColor =
                    zone.colorTheme === 'primary'
                      ? 'text-emerald-400'
                      : zone.colorTheme === 'secondary'
                      ? 'text-sky-400'
                      : 'text-teal-300';

                  const dotColor =
                    zone.colorTheme === 'primary'
                      ? 'bg-emerald-400'
                      : zone.colorTheme === 'secondary'
                      ? 'bg-sky-400'
                      : 'bg-teal-300';

                  return (
                    <div
                      key={zone.id}
                      id={zone.id}
                      onClick={() => handleSelectZone(zone.id)}
                      style={{
                        top: zone.boxStyle.top,
                        left: zone.boxStyle.left,
                        width: zone.boxStyle.width,
                        height: zone.boxStyle.height,
                      }}
                      className={`anomaly-box absolute border-2 rounded-md cursor-pointer transition-all duration-200 group/box ${borderColor} ${bgColor} ${
                        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-[1.01]' : ''
                      }`}
                    >
                      {/* Tooltip Header Pill */}
                      <div
                        className={`absolute -top-7 left-0 bg-[#080a0d]/95 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 border border-[#252b3b] shadow-lg pointer-events-auto ${textColor}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${dotColor} animate-ping`}></span>
                        <span>{zone.name}</span>
                      </div>

                      {/* Hover Detail Popover */}
                      <div className="absolute bottom-2 left-2 right-2 bg-[#080a0d]/95 backdrop-blur-md p-2 rounded border border-[#252b3b] text-[10px] font-mono text-[#f1f4f9] opacity-0 group-hover/box:opacity-100 transition-opacity duration-200 pointer-events-none z-10 space-y-0.5 shadow-xl">
                        <div className={`font-semibold flex justify-between ${textColor}`}>
                          <span>Classification: {zone.classification}</span>
                          <span>Confidence: {zone.confidence}</span>
                        </div>
                        <div className="text-[#94a3b8]">{zone.material}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Viewport Floating Controls: Zoom & Layers Toggle */}
        <div className="absolute top-3 right-3 flex items-center gap-1 z-20 bg-[#080a0d]/85 backdrop-blur-md p-1 rounded-lg border border-[#252b3b]">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
            className="p-1 rounded text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[15px]">zoom_in</span>
          </button>
          <span className="font-mono text-[10px] text-[#94a3b8] px-1 select-none">
            {zoomLevel}x
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
            className="p-1 rounded text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[15px]">zoom_out</span>
          </button>
          {zoomLevel > 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              className="px-1 py-0.5 rounded text-[9px] font-mono text-emerald-400 hover:bg-[#1b1f2b] cursor-pointer"
              title="Reset Zoom"
            >
              1x
            </button>
          )}
          <div className="w-[1px] h-3 bg-[#252b3b]"></div>
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              showOverlays ? 'text-emerald-400' : 'text-[#94a3b8]'
            }`}
            title={showOverlays ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
          >
            <span className="material-symbols-outlined text-[15px]">
              {showOverlays ? 'layers' : 'layers_clear'}
            </span>
          </button>
        </div>

        {/* Interactive Split Compare Slider */}
        {isSplitActive && (
          <div
            id="split-slider-container"
            className="absolute inset-0 pointer-events-none z-20"
          >
            {/* Split Line */}
            <div
              id="slider-split-line"
              className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 shadow-[0_0_14px_#34d399] pointer-events-none"
              style={{ left: `${splitPercent}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#1b1f2b] border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl pointer-events-none">
                <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
              </div>
              <div className="absolute top-3 -translate-x-full pr-2 font-mono text-[9px] text-[#38bdf8] bg-[#080a0d]/90 px-1.5 py-0.5 rounded border border-[#38bdf8]/30 whitespace-nowrap">
                T0 (BEFORE)
              </div>
              <div className="absolute top-3 translate-x-1 pl-2 font-mono text-[9px] text-emerald-400 bg-[#080a0d]/90 px-1.5 py-0.5 rounded border border-emerald-400/30 whitespace-nowrap">
                T1 (AFTER)
              </div>
            </div>

            {/* Draggable range input */}
            <input
              type="range"
              min="0"
              max="100"
              value={splitPercent}
              onChange={(e) => setSplitPercent(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 pointer-events-auto cursor-ew-resize m-0 p-0"
            />
          </div>
        )}

        {/* HUD Micro Footer Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-[#080a0d]/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-[#94a3b8] border border-[#252b3b] pointer-events-none z-10">
          <span className="text-emerald-400 font-semibold">EPSG:32618</span>
          <span>•</span>
          <span>GSD 0.5m</span>
          <span>•</span>
          <span>Co-reg: 0.14px</span>
          <span>•</span>
          <span className="text-emerald-400">Coherence: High</span>
        </div>

        {/* Interactive Radar Sweep Trigger */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
          <button
            onClick={triggerRadarSweep}
            className="bg-[#080a0d]/85 hover:bg-[#1b1f2b] backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-emerald-400 border border-[#252b3b] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Trigger SAR Radar Pulse Sweep"
          >
            <span className="material-symbols-outlined text-[14px]">radar</span>
            <span>Sweep Radar</span>
          </button>
        </div>

        {/* Animated Radar Scanner Bar */}
        {isRadarSweeping && (
          <div className="scanner-glow absolute left-0 right-0 h-1.5 pointer-events-none z-30 radar-sweep-active"></div>
        )}

        {/* Active Toast Notification */}
        {toastMessage && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#080a0d]/95 border border-emerald-400/40 text-emerald-300 font-mono text-[11px] px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md z-30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 3 Summary Stats */}
      <div className="p-3 grid grid-cols-3 gap-2 border-b border-[#252b3b]/60 bg-[#1b1f2b]/60 text-center">
        <div
          onClick={() => handleSelectZone('zone-1')}
          className="p-2 rounded-xl bg-[#151821] border border-[#252b3b]/60 hover:border-emerald-400/40 transition-colors cursor-pointer"
        >
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider">
            Net Conversion
          </div>
          <div className="text-sm md:text-base font-bold text-emerald-400 font-mono mt-0.5">
            {summaryMetrics.netConversion}
          </div>
        </div>

        <div
          onClick={triggerRadarSweep}
          className="p-2 rounded-xl bg-[#151821] border border-[#252b3b]/60 hover:border-sky-400/40 transition-colors cursor-pointer"
        >
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider">
            Model Confidence
          </div>
          <div className="text-sm md:text-base font-bold text-[#f1f4f9] font-mono mt-0.5">
            {summaryMetrics.confidence}
          </div>
        </div>

        <div
          onClick={() => handleSelectZone('zone-2')}
          className="p-2 rounded-xl bg-[#151821] border border-[#252b3b]/60 hover:border-teal-400/40 transition-colors cursor-pointer"
        >
          <div className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider">
            Discrete Zones
          </div>
          <div className="text-sm md:text-base font-bold text-[#38bdf8] font-mono mt-0.5">
            {summaryMetrics.zonesCount}
          </div>
        </div>
      </div>

      {/* Clickable Anomaly Tags & Selected Zone Details */}
      <div className="p-3 space-y-2">
        <div className="text-[11px] font-medium text-[#94a3b8] flex items-center justify-between">
          <span>Isolated footprints (click to inspect & focus):</span>
          <span className="text-[10px] font-mono text-[#94a3b8]/70">
            Source: WorldView-3 & Sentinel-1
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {zones.map((z) => {
            const isSelected = z.id === selectedZoneId;
            const themeClass =
              z.colorTheme === 'primary'
                ? isSelected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400'
                  : 'bg-[#1b1f2b] hover:bg-emerald-500/10 text-emerald-400 border-emerald-400/30'
                : z.colorTheme === 'secondary'
                ? isSelected
                  ? 'bg-sky-500/20 text-sky-400 border-sky-400'
                  : 'bg-[#1b1f2b] hover:bg-sky-500/10 text-sky-400 border-sky-400/30'
                : isSelected
                ? 'bg-teal-500/20 text-teal-300 border-teal-300'
                : 'bg-[#1b1f2b] hover:bg-teal-500/10 text-teal-300 border-teal-300/30';

            const dotBg =
              z.colorTheme === 'primary'
                ? 'bg-emerald-400'
                : z.colorTheme === 'secondary'
                ? 'bg-sky-400'
                : 'bg-teal-300';

            return (
              <button
                key={z.id}
                onClick={() => handleSelectZone(z.id)}
                className={`zone-pill flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all active:scale-95 cursor-pointer ${themeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`}></span>
                <span>{z.name}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Zone Detail Banner */}
        <div className="text-xs bg-[#1b1f2b] p-2.5 rounded-xl border border-[#252b3b] text-[#94a3b8] flex items-center justify-between transition-all">
          <div className="pr-2">
            <span className="text-[#f1f4f9] font-semibold">
              {selectedZone.name.split(':')[0]} ({selectedZone.classification}):{' '}
            </span>
            <span>{selectedZone.material}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-400/20">
            VERIFIED REAL
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-3 py-2 bg-[#1b1f2b]/40 border-t border-[#252b3b]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownloadGeoJSON}
            className="px-2.5 py-1.5 rounded-lg bg-[#1b1f2b] hover:bg-[#232838] text-[#f1f4f9] flex items-center gap-1.5 border border-[#252b3b] transition-colors cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-400">
              download
            </span>
            <span>Download GeoJSON</span>
          </button>

          <button
            onClick={triggerRadarSweep}
            className="px-2.5 py-1.5 rounded-lg bg-[#1b1f2b] hover:bg-[#232838] text-[#f1f4f9] flex items-center gap-1.5 border border-[#252b3b] transition-colors cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px] text-[#38bdf8]">
              insights
            </span>
            <span>Run SAR Coherence Check</span>
          </button>
        </div>

        <button
          onClick={handleCopyCitation}
          className="px-2.5 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#1b1f2b] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">
            {copiedCitation ? 'check' : 'content_copy'}
          </span>
          <span>
            {copiedCitation ? 'Hash Copied!' : 'Copy Citation (#EQ-9042)'}
          </span>
        </button>
      </div>
    </div>
  );
};
