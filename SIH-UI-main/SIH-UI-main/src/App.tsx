/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { PromptComposer } from './components/PromptComposer';
import { GeoTiffUploadModal } from './components/GeoTiffUploadModal';
import { GeoDoctorPolicyModal } from './components/GeoDoctorPolicyModal';
import {
  ChatMessageItem,
  HistorySession,
  AttachmentFile,
} from './types';
import {
  SATELLITE_IMG_URL,
  INITIAL_ZONES,
  INITIAL_TRACE_STEPS,
  HISTORY_SESSIONS,
  INITIAL_ATTACHMENTS,
} from './data/mockData';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [sessions, setSessions] = useState<HistorySession[]>(HISTORY_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState('port');
  const [currentModel, setCurrentModel] = useState('SATQuery Core 4.2');
  const [attachments, setAttachments] = useState<AttachmentFile[]>(INITIAL_ATTACHMENTS);
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDoctorPolicyOpen, setIsDoctorPolicyOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const chatStreamRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Keyboard shortcut: Cmd/Ctrl + K for New Analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewAnalysis();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) {
      showToast('Cannot delete the sole active mission session');
      return;
    }
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      handleSelectSession(updated[0].id);
    }
    showToast('Mission session removed from timeline');
  };

  const getInitialMessages = (): ChatMessageItem[] => [
    {
      id: 'msg-user-1',
      sender: 'user',
      timestamp: '14:28 UTC',
      content:
        'What changed between these two satellite observations? Has industrial built-up area increased, and can you isolate the exact footprints?',
      observations: [
        {
          id: 'obs-t0',
          tag: 'T0',
          title: 'Baseline (2023-04)',
          sensor: 'Sentinel-2',
          gsd: '10m GSD',
          date: '2023-04-12',
          imageUrl: SATELLITE_IMG_URL,
          filterStyle: 'contrast(1.1) brightness(0.85) hue-rotate(-20deg)',
        },
        {
          id: 'obs-t1',
          tag: 'T1',
          title: 'Comparison (2024-04)',
          sensor: 'WorldView-3',
          gsd: '0.5m GSD',
          date: '2024-04-18',
          imageUrl: SATELLITE_IMG_URL,
          filterStyle: 'hue-rotate(15deg) contrast(1.2)',
        },
      ],
    },
    {
      id: 'msg-assistant-1',
      sender: 'assistant',
      timestamp: '14:28 UTC',
      thoughtTrace: {
        duration: '3 seconds',
        subtaskCount: 4,
        steps: INITIAL_TRACE_STEPS,
      },
      content:
        '**Yes, industrial built-up area has expanded by +4,820 m²** across three discrete zones in the coastal terminal sector between April 2023 and April 2024.\n\nThe expansion includes a primary reinforced port apron extension, a new steel gantry pier assembly, and adjacent foundation excavation. Multispectral NDVI dropped sharply (-0.34) accompanied by a +4.8 dB synthetic aperture radar (SAR) backscatter spike, confirming concrete pouring and heavy superstructure placement rather than seasonal tidal variance.',
      evidenceData: {
        t0Image: SATELLITE_IMG_URL,
        t1Image: SATELLITE_IMG_URL,
        zones: INITIAL_ZONES,
        summaryMetrics: {
          netConversion: '+4,820 m²',
          confidence: '96.4%',
          zonesCount: '3 Polygons',
        },
      },
    },
  ];

  const [messages, setMessages] = useState<ChatMessageItem[]>(getInitialMessages);

  // Auto scroll on new messages
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const textarea = document.querySelector('textarea');
        textarea?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    if (id === 'port') {
      setMessages(getInitialMessages());
      showToast('Switched to Port Expansion Bi-Temporal Session');
    } else {
      const selected = sessions.find((s) => s.id === id);
      setMessages([
        {
          id: `msg-archived-${id}`,
          sender: 'user',
          timestamp: 'Archive Query',
          content: `Load historical session: ${selected?.title}`,
        },
        {
          id: `msg-archived-resp-${id}`,
          sender: 'assistant',
          timestamp: '12:00 UTC',
          thoughtTrace: {
            duration: '1.8 seconds',
            subtaskCount: 3,
            steps: [
              {
                stepNumber: 'ARCH-01',
                title: 'Data Vault Ingestion',
                description: `Retrieved historical raster bundle for ${selected?.sensors} from cold tier storage.`,
                tagColor: 'secondary',
              },
              {
                stepNumber: 'ARCH-02',
                title: 'Vector Polygon Reconstruction',
                description: selected?.summary || 'Pre-computed geometric features loaded.',
                tagColor: 'primary',
              },
            ],
          },
          content: `**Loaded Mission Telemetry: ${selected?.title}**\n\nSensor configuration: ${selected?.sensors}.\n\nExecutive Summary: ${selected?.summary}\n\nAll historical layers are registered under WGS 84 / UTM with validated cryptographic checksums.`,
        },
      ]);
      showToast(`Loaded ${selected?.title}`);
    }
  };

  const handleNewAnalysis = () => {
    setActiveSessionId('port');
    setMessages(getInitialMessages());
    setPromptText('');
    showToast('New Analysis workspace initialized');
  };

  const handleReset = () => {
    setMessages(getInitialMessages());
    setPromptText('');
    showToast('Conversation reset to baseline demonstration');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Analysis link copied to clipboard!');
  };

  const handleExportPdf = () => {
    showToast('Generating cryptographically signed geospatial evidence PDF report...');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    showToast('Attachment unmounted from inference slot');
  };

  const handleAddAttachment = (file: AttachmentFile) => {
    setAttachments((prev) => [...prev, file]);
    showToast(`Sensor raster ${file.filename} mounted`);
  };

  const handlePromptSubmit = async (customPrompt?: string) => {
    const text = (customPrompt || promptText).trim();
    if (!text || isLoading) return;

    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
      now.getUTCMinutes()
    ).padStart(2, '0')} UTC`;

    // Append User Message
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: timeStr,
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPromptText('');
    setIsLoading(true);

    // Check specific prototype scenarios for rapid demonstration
    const lower = text.toLowerCase();

    if (
      lower.includes('incompatible') ||
      lower.includes('refusal shield') ||
      lower.includes('mismatch')
    ) {
      setTimeout(() => {
        const refusalMsg: ChatMessageItem = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: timeStr,
          isRefusalShield: true,
          refusalDetails: {
            title: '⚠️ GeoDoctor Refusal Shield: Sensor Incompatibility',
            violation:
              'GSD ratio is 20:1 (10.0m Sentinel-2 vs 0.5m WorldView-3), exceeding safe tolerance threshold of 4:1.',
            risk: 'Direct mathematical subtraction produces a +74.2% pseudo-delta caused entirely by optical resampling hallucination.',
            resolution:
              'Mount intermediate 3.0m PlanetScope imagery or enable GeoDoctor deep bilinear co-registration module.',
          },
          content:
            'Inference aborted by GeoDoctor Refusal Shield. Zero-hallucination protocol forbids comparing un-coregistered 10m and 0.5m observations without sub-pixel control points.',
        };
        setMessages((prev) => [...prev, refusalMsg]);
        setIsLoading(false);
      }, 900);
      return;
    }

    if (lower.includes('zone 2') || lower.includes('urban development')) {
      setTimeout(() => {
        const zone2Msg: ChatMessageItem = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: timeStr,
          thoughtTrace: {
            duration: '1.4 seconds',
            subtaskCount: 2,
            steps: [
              {
                stepNumber: 'Z2-01',
                title: 'High-Albedo Structural Steel Isolation',
                description:
                  'Extracted polarimetric double-bounce scattering signature matching container crane rail tracks.',
                tagColor: 'secondary',
              },
              {
                stepNumber: 'Z2-02',
                title: 'Digital Surface Model Elevation Difference',
                description:
                  'Stereo-optical disparity vectors indicate +18.4m vertical superstructure addition.',
                tagColor: 'primary',
              },
            ],
          },
          content:
            'In **Zone 2 (Pier Gantry Assembly)**, heavy industrial development has increased sharply. The 1,400 m² footprint exhibits dominant double-bounce scattering (0.19 polarimetric entropy) and an elevation delta of **+18.4m above mean sea level**.\n\nThis confirms the installation of twin rail-mounted gantry (RMG) cranes rather than temporary vessel cargo storage.',
        };
        setMessages((prev) => [...prev, zone2Msg]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    if (lower.includes('sar') || lower.includes('radar')) {
      setTimeout(() => {
        const sarMsg: ChatMessageItem = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: timeStr,
          thoughtTrace: {
            duration: '2.1 seconds',
            subtaskCount: 3,
            steps: [
              {
                stepNumber: 'SAR-01',
                title: 'Sentinel-1 C-Band InSAR Interferogram',
                description:
                  'Constructed differential interferogram across track #124 ascending pass.',
                tagColor: 'primary',
              },
              {
                stepNumber: 'SAR-02',
                title: 'Coherence Loss Spatial Demarcation',
                description:
                  'Phase correlation drops to 0.88 exclusively within the excavation and compaction pit.',
                tagColor: 'tertiary',
              },
            ],
          },
          content:
            '**Synthetic Aperture Radar (SAR) coherence provides definitive physical proof.**\n\nUnlike optical sensors susceptible to sun glint and cloud shadows, C-band SAR interferometric phase coherence dropped to **0.88** specifically across Zone 3.\n\nThis loss of temporal coherence confirms active mechanical excavation and concrete curing between the April 2023 and April 2024 passes.',
        };
        setMessages((prev) => [...prev, sarMsg]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    // Call server API (/api/chat) for custom queries
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          currentSession: sessions.find((s) => s.id === activeSessionId)?.title,
          context: {
            zones: INITIAL_ZONES.map((z) => ({ name: z.name, delta: z.areaDelta })),
            sensors: attachments.map((a) => a.filename),
          },
        }),
      });

      if (!res.ok) {
        throw new Error('API server error');
      }

      const data = await res.json();
      const asstMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: timeStr,
        thoughtTrace: {
          duration: '2.3 seconds',
          subtaskCount: 3,
          steps: [
            {
              stepNumber: 'GEO-01',
              title: 'Telemetry Cross-Reference',
              description:
                'Evaluated radiometric calibration and atmospheric corrected reflectance.',
              tagColor: 'primary',
            },
            {
              stepNumber: 'GEO-02',
              title: 'Zero-Hallucination Grounding',
              description: 'Cross-checked against EPSG:32618 UTM spatial grid.',
              tagColor: 'secondary',
            },
          ],
        },
        content: data.reply,
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch {
      // Graceful fallback
      const fallbackMsg: ChatMessageItem = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        timestamp: timeStr,
        content: `SATQuery Core 4.2 has processed your request: "${text}".\n\nAll multi-temporal rasters in EPSG:32618 have been evaluated. Spatial resolution bounds are within certified tolerances with 96.4% confidence score.`,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0e12] font-sans text-[#f1f4f9]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#151821] border border-emerald-400/50 text-[#f1f4f9] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">
            verified
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Collapsible ChatGPT-Style Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewAnalysis={handleNewAnalysis}
        onDeleteSession={handleDeleteSession}
        onShowDoctorPolicy={() => setIsDoctorPolicyOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0c0e12] relative">
        {/* Top Minimal Header (52px) */}
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onReset={handleReset}
          onExportPdf={handleExportPdf}
          onShare={handleShare}
          currentModel={currentModel}
          onSelectModel={setCurrentModel}
        />

        {/* Centered Conversation Scroll Canvas */}
        <div
          ref={chatStreamRef}
          id="chat-stream"
          className="flex-1 overflow-y-auto px-4 md:px-6 py-6 scroll-smooth"
        >
          <div
            id="conversation-container"
            className="max-w-3xl lg:max-w-4xl mx-auto space-y-8 pb-48"
          >
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRegenerate={() => handlePromptSubmit(messages[0]?.content)}
                onSelectObservation={() => {
                  showToast('Focused observation raster in evidence card');
                }}
              />
            ))}

            {/* Thinking / Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-3.5 pt-2 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-[#1b1f2b] border border-emerald-400/40 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400 animate-spin">
                    sync
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#f1f4f9]">
                    SATQuery Core 4.2
                  </div>
                  <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    GeoDoctor executing spatial verification & toolchain dispatch...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating ChatGPT-Style Composer */}
        <PromptComposer
          promptText={promptText}
          onPromptChange={setPromptText}
          onSubmit={handlePromptSubmit}
          isLoading={isLoading}
          attachments={attachments}
          onRemoveAttachment={handleRemoveAttachment}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onTriggerBoundingBox={() => {
            showToast('Spatial bounding box selector activated over active AOI');
          }}
        />
      </div>

      {/* Satellite Imagery Raster Upload Modal */}
      <GeoTiffUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddAttachment={handleAddAttachment}
      />

      {/* GeoDoctor Policy & Audit Modal */}
      <GeoDoctorPolicyModal
        isOpen={isDoctorPolicyOpen}
        onClose={() => setIsDoctorPolicyOpen(false)}
      />
    </div>
  );
}
