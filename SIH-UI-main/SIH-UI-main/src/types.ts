export interface ZoneDetail {
  id: string;
  name: string;
  areaDelta: string;
  classification: string;
  confidence: string;
  material: string;
  spectralMetrics: string;
  coordinates: number[][]; // Geo coordinates
  boxStyle: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  colorTheme: 'primary' | 'secondary' | 'tertiary';
}

export interface TraceStep {
  stepNumber: string;
  title: string;
  description: string;
  tagColor: 'primary' | 'secondary' | 'tertiary';
}

export interface ObservationCard {
  id: string;
  tag: 'T0' | 'T1';
  title: string;
  sensor: string;
  gsd: string;
  date: string;
  imageUrl: string;
  filterStyle?: string;
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  observations?: ObservationCard[];
  thoughtTrace?: {
    duration: string;
    subtaskCount: number;
    steps: TraceStep[];
  };
  evidenceData?: {
    t0Image: string;
    t1Image: string;
    zones: ZoneDetail[];
    summaryMetrics: {
      netConversion: string;
      confidence: string;
      zonesCount: string;
    };
  };
  isRefusalShield?: boolean;
  refusalDetails?: {
    title: string;
    violation: string;
    risk: string;
    resolution: string;
  };
}

export interface HistorySession {
  id: string;
  title: string;
  timeGroup: 'Today' | 'Previous 7 days';
  icon: string;
  sensors: string;
  summary: string;
}

export interface AttachmentFile {
  id: string;
  filename: string;
  index: number;
  type: 'optical' | 'sar' | 'thermal';
  // The real backend image ID, set after a successful upload to our FastAPI backend.
  // Undefined for catalog/mock attachments that were never actually uploaded.
  backendImageId?: number;
}
