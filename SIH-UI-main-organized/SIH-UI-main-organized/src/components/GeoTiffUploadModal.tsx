import React, { useState } from 'react';
import { AttachmentFile } from '../types';
import { SAMPLE_DATASETS_CATALOG } from '../data/mockData';

interface GeoTiffUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAttachment: (file: AttachmentFile) => void;
}

export const GeoTiffUploadModal: React.FC<GeoTiffUploadModalProps> = ({
  isOpen,
  onClose,
  onAddAttachment,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedSensor, setSelectedSensor] = useState('WorldView-3 (0.5m)');
  const [sensorType, setSensorType] = useState<'optical' | 'sar' | 'thermal'>('optical');
  const [customFilename, setCustomFilename] = useState('Rotterdam_WV3_2024_Bands.tif');
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleMountCustom = () => {
    onAddAttachment({
      id: `slot-${Date.now()}`,
      filename: customFilename || `${selectedSensor.split(' ')[0]}_tile.tif`,
      index: Math.floor(Math.random() * 8) + 3,
      type: sensorType,
    });
    onClose();
  };

  const handleMountSample = (sample: typeof SAMPLE_DATASETS_CATALOG[0]) => {
    onAddAttachment({
      id: `slot-${sample.id}-${Date.now()}`,
      filename: sample.filename,
      index: Math.floor(Math.random() * 8) + 3,
      type: sample.type,
    });
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setCustomFilename(file.name);
      setActiveTab('custom');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#151821] border border-[#252b3b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#252b3b] flex items-center justify-between bg-[#1b1f2b]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">
              satellite_alt
            </span>
            <span className="font-semibold text-sm text-[#f1f4f9]">
              Mount Satellite Observation Raster
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#f1f4f9] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[#252b3b]/60 bg-[#151821]">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 text-xs font-mono border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-[#94a3b8] hover:text-[#f1f4f9]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">inventory_2</span>
            <span>Pre-Loaded Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 text-xs font-mono border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-[#94a3b8] hover:text-[#f1f4f9]'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">cloud_upload</span>
            <span>Custom File / Dropzone</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs font-mono overflow-y-auto flex-1">
          {activeTab === 'catalog' ? (
            <div className="space-y-2.5">
              <div className="text-[11px] text-[#94a3b8] font-sans">
                Select a validated mission raster from the ground-truth catalog to mount directly into inference slots:
              </div>
              <div className="space-y-2">
                {SAMPLE_DATASETS_CATALOG.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#11141a] border border-[#252b3b] hover:border-emerald-400/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#f1f4f9] truncate">
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            item.type === 'optical'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20'
                              : item.type === 'sar'
                              ? 'bg-sky-500/10 text-[#38bdf8] border border-sky-400/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-400/20'
                          }`}
                        >
                          {item.gsd}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94a3b8] truncate mt-0.5 font-sans">
                        {item.description}
                      </div>
                    </div>

                    <button
                      onClick={() => handleMountSample(item)}
                      className="px-2.5 py-1 rounded-lg bg-[#1b1f2b] hover:bg-emerald-400 hover:text-[#003825] text-emerald-400 border border-emerald-400/30 text-xs font-semibold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Mount
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-[#252b3b] hover:border-emerald-400/40 bg-[#0c0e12]/60'
                }`}
              >
                <span className="material-symbols-outlined text-[32px] text-emerald-400">
                  cloud_upload
                </span>
                <div className="mt-2 text-[#f1f4f9] font-medium">
                  Drag and drop Cloud-Optimized GeoTIFF (COG), NetCDF, or HDF5
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1 font-sans">
                  EPSG:32618 / UTM projections auto-reprojected with sub-pixel GeoDoctor validation.
                </div>
              </div>

              {/* Filename Input */}
              <div className="space-y-1">
                <label className="text-[#94a3b8] uppercase text-[10px] tracking-wider">
                  Raster File Identifier
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-[#252b3b] rounded-lg px-3 py-2 text-[#f1f4f9] focus:outline-none focus:border-emerald-400 text-xs"
                />
              </div>

              {/* Sensor Select */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#94a3b8] uppercase text-[10px] tracking-wider">
                    Target Sensor Model
                  </label>
                  <select
                    value={selectedSensor}
                    onChange={(e) => setSelectedSensor(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-[#252b3b] rounded-lg px-2.5 py-2 text-[#f1f4f9] focus:outline-none focus:border-emerald-400 text-xs cursor-pointer"
                  >
                    <option>WorldView-3 (0.5m)</option>
                    <option>Sentinel-2 MSI (10.0m)</option>
                    <option>Sentinel-1 C-SAR (5.0m)</option>
                    <option>PlanetScope SuperDove (3.0m)</option>
                    <option>COSMO-SkyMed X-SAR (1.0m)</option>
                    <option>Landsat-9 OLI/TIRS (30m)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#94a3b8] uppercase text-[10px] tracking-wider">
                    Modality Band
                  </label>
                  <select
                    value={sensorType}
                    onChange={(e) =>
                      setSensorType(e.target.value as 'optical' | 'sar' | 'thermal')
                    }
                    className="w-full bg-[#0c0e12] border border-[#252b3b] rounded-lg px-2.5 py-2 text-[#f1f4f9] focus:outline-none focus:border-emerald-400 text-xs cursor-pointer"
                  >
                    <option value="optical">Multispectral / Optical</option>
                    <option value="sar">Synthetic Aperture Radar (SAR)</option>
                    <option value="thermal">Thermal Infrared (TIR)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* GeoDoctor Check Notice */}
          <div className="p-3 bg-[#11141a] rounded-xl border border-emerald-500/20 text-[11px] text-[#94a3b8] space-y-1">
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Automatic Pre-Inference Co-Registration Ready
            </div>
            <div className="font-sans">
              GeoDoctor will perform sub-pixel co-registration with baseline raster. If GSD ratio exceeds 4:1 tolerance, bilinear filtering will be applied.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#252b3b] flex items-center justify-end gap-2 bg-[#1b1f2b]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[#94a3b8] hover:text-[#f1f4f9] hover:bg-[#232838] transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
          {activeTab === 'custom' && (
            <button
              onClick={handleMountCustom}
              className="px-4 py-1.5 rounded-lg bg-emerald-400 text-[#003825] font-semibold hover:brightness-110 active:scale-95 transition-all text-xs cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.3)]"
            >
              Mount Sensor Band
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

