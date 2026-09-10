import React from 'react';

interface GeoDoctorPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeoDoctorPolicyModal: React.FC<GeoDoctorPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#151821] border border-emerald-400/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#252b3b] flex items-center justify-between bg-[#1b1f2b]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-sm text-[#f1f4f9] font-mono">
              GeoDoctor Shield™ Policy & Audit
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#f1f4f9] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs font-mono overflow-y-auto text-[#94a3b8]">
          <div className="p-3 bg-[#0c0e12] rounded-xl border border-emerald-500/20 space-y-1">
            <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Zero-Hallucination Geospatial Invariance
            </div>
            <div className="text-[11px] font-sans text-[#f1f4f9]">
              Every metric and footprint reported by SATQuery Core 4.2 must satisfy strict physical grounding criteria before generating responses.
            </div>
          </div>

          <div className="space-y-3">
            <div className="border border-[#252b3b] p-3 rounded-xl bg-[#11141a] space-y-1">
              <div className="text-[#f1f4f9] font-semibold text-[11px] flex items-center gap-2">
                <span className="text-emerald-400">01.</span> Sub-Pixel Co-Registration
              </div>
              <p className="text-[11px] font-sans">
                Cross-temporal observations are re-projected to EPSG:32618 UTM coordinate system with bilateral spline interpolation. Registration offsets must be &lt; 0.20 GSD pixels.
              </p>
            </div>

            <div className="border border-[#252b3b] p-3 rounded-xl bg-[#11141a] space-y-1">
              <div className="text-[#f1f4f9] font-semibold text-[11px] flex items-center gap-2">
                <span className="text-emerald-400">02.</span> Dual-Modality Radar Invariance
              </div>
              <p className="text-[11px] font-sans">
                Optical color disparities (sun glint, tidal variance, cloud shadows) are cross-checked against Synthetic Aperture Radar (SAR) coherence interferograms (Sentinel-1 C-SAR).
              </p>
            </div>

            <div className="border border-[#252b3b] p-3 rounded-xl bg-[#11141a] space-y-1">
              <div className="text-[#f1f4f9] font-semibold text-[11px] flex items-center gap-2">
                <span className="text-emerald-400">03.</span> Refusal & Hallucination Quarantine
              </div>
              <p className="text-[11px] font-sans">
                If sensor resolution (GSD) ratio between T0 and T1 exceeds 20:1 or cloud occlusion exceeds 15% in the specified AOI, SATQuery refuses conjecture and requests an unclouded SAR pass.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0c0e12] border border-[#252b3b] text-[10px]">
            <span>Active Enforcer Version:</span>
            <span className="text-emerald-400 font-bold">GD-SHIELD-V4.2.1-PROD</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#252b3b] flex items-center justify-end bg-[#1b1f2b]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-400 text-[#003825] font-semibold hover:brightness-110 active:scale-95 transition-all text-xs cursor-pointer"
          >
            Acknowledge Policy
          </button>
        </div>
      </div>
    </div>
  );
};
