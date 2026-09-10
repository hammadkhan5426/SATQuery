import { ZoneDetail, TraceStep, HistorySession, AttachmentFile, ChatMessageItem } from '../types';

export const SATELLITE_IMG_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1W3cElTjEHLX1Y9L3Zu0uWAE65iRlZwunArDB2fCLZcW43yeTAcgD6CxAF6Z9HNwB0SqwDqrnXjIuXaEBX9pyLVc4c8uEZf45KIMRskmv4_GnANPCeraxvcPfh2ndkYyaymXypgJ_v3A1wMw8ES7z_cDSEp49wKCm96Pbpq5oZp68wXwBG97VANtuMkmvRC65Vwm7GLYPwSVXRSnUMoD9WCeu-zL8zndcd--dl1VQ-ufS88kXQQ3WkajM3D';

export const INITIAL_ZONES: ZoneDetail[] = [
  {
    id: 'zone-1',
    name: 'Zone 1: Port Apron (+2,180 m²)',
    areaDelta: '+2,180 m²',
    classification: 'Port Pavement (Impervious Surface)',
    confidence: '98.2%',
    material: 'Reinforced Concrete · NDVI -0.34 · SAR +4.8dB backscatter spike',
    spectralMetrics: 'Bands B04/B08 reflectance ratio altered by +42%',
    coordinates: [
      [-74.0124, 40.7128],
      [-74.0082, 40.7128],
      [-74.0082, 40.7095],
      [-74.0124, 40.7095],
    ],
    boxStyle: {
      top: '28%',
      left: '22%',
      width: '26%',
      height: '32%',
    },
    colorTheme: 'primary',
  },
  {
    id: 'zone-2',
    name: 'Zone 2: Pier Gantry (+1,400 m²)',
    areaDelta: '+1,400 m²',
    classification: 'Steel Superstructure (Maritime Cranes)',
    confidence: '96.7%',
    material: 'High-Albedo Structural Steel · Double-bounce polarimetric SAR',
    spectralMetrics: 'Polarimetric entropy: 0.19 · Elevation: +18.4m above MSL',
    coordinates: [
      [-73.9984, 40.6942],
      [-73.9921, 40.6942],
      [-73.9921, 40.6908],
      [-73.9984, 40.6908],
    ],
    boxStyle: {
      top: '56%',
      left: '54%',
      width: '20%',
      height: '28%',
    },
    colorTheme: 'secondary',
  },
  {
    id: 'zone-3',
    name: 'Zone 3: Excavation (+1,240 m²)',
    areaDelta: '+1,240 m²',
    classification: 'Sub-grade Earthwork (Compacted Fill)',
    confidence: '94.3%',
    material: 'Compacted Soil/Fill · Rapid drainage & loss of intertidal mud',
    spectralMetrics: 'InSAR phase correlation drop to 0.88 confirms ground disturbance',
    coordinates: [
      [-73.9855, 40.721],
      [-73.9802, 40.721],
      [-73.9802, 40.7176],
      [-73.9855, 40.7176],
    ],
    boxStyle: {
      top: '16%',
      left: '64%',
      width: '18%',
      height: '24%',
    },
    colorTheme: 'tertiary',
  },
];

export const INITIAL_TRACE_STEPS: TraceStep[] = [
  {
    stepNumber: 'STEP 01',
    title: 'Query Intent Decomposition',
    description:
      'Parsed natural language into multi-temporal change detection, land-use classification (impervious surface/industrial), and vector boundary extraction.',
    tagColor: 'primary',
  },
  {
    stepNumber: 'STEP 02',
    title: 'GeoDoctor Shield Validation & Reprojection',
    description:
      'Re-projected both tiles to EPSG:32618 (WGS 84 / UTM Zone 18N). Sub-pixel co-registration RMSE calculated at 0.14px. Interpolated 10m Sentinel-2 band reflectance to WV-3 0.5m grid with bicubic resampling.',
    tagColor: 'secondary',
  },
  {
    stepNumber: 'STEP 03',
    title: 'Toolchain Dispatch (ChangeFormer + SAR)',
    description:
      'Executed deep Siamese ChangeFormer-v2 pipeline in tandem with Sentinel-1 SAR interferometric coherence delta. Filtered false positive cloud shadow detections.',
    tagColor: 'tertiary',
  },
  {
    stepNumber: 'STEP 04',
    title: 'Grounding Verification & Refusal Shield',
    description:
      'Cross-referenced against radar dual-polarization backscatter surge (+4.8 dB VH). Confirmed structural steel & poured concrete. Zero optical hallucination risk certified.',
    tagColor: 'primary',
  },
];

export const HISTORY_SESSIONS: HistorySession[] = [
  {
    id: 'port',
    title: 'Port Expansion Bi-Temporal',
    timeGroup: 'Today',
    icon: 'satellite_alt',
    sensors: '10m Sentinel-2 vs 0.5m WV-3',
    summary: 'Detected +4,820 m² reinforced port apron & container pier gantry.',
  },
  {
    id: 'suez',
    title: 'Suez Canal Maritime Radar',
    timeGroup: 'Today',
    icon: 'radar',
    sensors: 'Sentinel-1 C-Band SAR Dual-Pol',
    summary: 'Vessel density tracking and anchorage bottleneck queue estimation.',
  },
  {
    id: 'taiwan',
    title: 'Taiwan Strait SAR Coherence',
    timeGroup: 'Previous 7 days',
    icon: 'waves',
    sensors: 'COSMO-SkyMed X-Band SAR',
    summary: 'High-frequency surface roughness & maritime transit anomalies.',
  },
  {
    id: 'volcano',
    title: 'Reykjanes Volcanic Thermal',
    timeGroup: 'Previous 7 days',
    icon: 'heat_pump',
    sensors: 'Landsat-9 Thermal TIRS & Sentinel-2',
    summary: 'Fissure thermal radiance delta + InSAR magma chamber inflation.',
  },
  {
    id: 'amazon',
    title: 'Amazon Forest Loss Sentinel',
    timeGroup: 'Previous 7 days',
    icon: 'landscape',
    sensors: 'Sentinel-2 L2A Red-Edge & SWIR',
    summary: 'Selective illegal logging boundary polygon vectorization.',
  },
];

export const INITIAL_ATTACHMENTS: AttachmentFile[] = [
  {
    id: 'slot-t0',
    filename: 'Sentinel-2_T0.tif',
    index: 1,
    type: 'optical',
  },
  {
    id: 'slot-t1',
    filename: 'WorldView3_T1.tif',
    index: 2,
    type: 'optical',
  },
];

export const SAMPLE_DATASETS_CATALOG = [
  {
    id: 'cat-s2',
    name: 'Sentinel-2 MSI (10m Multi-Spectral)',
    filename: 'Sentinel-2_MSI_B04_B08.tif',
    type: 'optical' as const,
    sensor: 'Sentinel-2 MSI (10.0m)',
    gsd: '10.0m GSD',
    description: 'Bands B02, B03, B04 (RGB) + B08 (NIR) for normalized difference vegetation index (NDVI).',
  },
  {
    id: 'cat-wv3',
    name: 'WorldView-3 (0.5m Very-High-Resolution)',
    filename: 'WorldView-3_Panchromatic_0.5m.tif',
    type: 'optical' as const,
    sensor: 'WorldView-3 (0.5m)',
    gsd: '0.5m GSD',
    description: 'Sub-meter panchromatic and 8-band multispectral sensor for crisp infrastructure demarcation.',
  },
  {
    id: 'cat-s1',
    name: 'Sentinel-1 C-SAR (Interferometric Coherence)',
    filename: 'Sentinel-1_Interferometric_Coh.tif',
    type: 'sar' as const,
    sensor: 'Sentinel-1 C-SAR (5.0m)',
    gsd: '5.0m GSD',
    description: 'All-weather, day-and-night C-band synthetic aperture radar phase coherence & backscatter.',
  },
  {
    id: 'cat-ps',
    name: 'PlanetScope SuperDove (3.0m Rapid Revisit)',
    filename: 'PlanetScope_SuperDove_PSB.SD.tif',
    type: 'optical' as const,
    sensor: 'PlanetScope SuperDove (3.0m)',
    gsd: '3.0m GSD',
    description: 'Daily global cadence constellation with 8 surface reflectance spectral bands.',
  },
  {
    id: 'cat-ls9',
    name: 'Landsat-9 Thermal Infrared (TIRS-2)',
    filename: 'Landsat-9_TIRS2_Thermal_Band10.tif',
    type: 'thermal' as const,
    sensor: 'Landsat-9 OLI/TIRS (30m)',
    gsd: '30.0m GSD',
    description: 'Calibrated split-window thermal radiance for ground surface temperature anomalies.',
  },
  {
    id: 'cat-csm',
    name: 'COSMO-SkyMed X-Band Spotlight SAR',
    filename: 'COSMO_SkyMed_Spotlight_X_SAR.tif',
    type: 'sar' as const,
    sensor: 'COSMO-SkyMed X-SAR (1.0m)',
    gsd: '1.0m GSD',
    description: 'High-frequency 3.1 cm microwave wavelength radar for fine structural displacement.',
  },
];

// Rich mock data for each session in the list
export const SESSION_MOCK_DATA: Record<
  string,
  {
    userPrompt: string;
    assistantAnswer: string;
    zones: ZoneDetail[];
    summaryMetrics: {
      netConversion: string;
      confidence: string;
      zonesCount: string;
    };
    t0Filter: string;
    t1Filter: string;
    obs1: { tag: 'T0'; title: string; sensor: string; gsd: string; date: string };
    obs2: { tag: 'T1'; title: string; sensor: string; gsd: string; date: string };
    traceSteps: TraceStep[];
  }
> = {
  port: {
    userPrompt:
      'What changed between these two satellite observations? Has industrial built-up area increased, and can you isolate the exact footprints?',
    assistantAnswer:
      '**Yes, industrial built-up area has expanded by +4,820 m²** across three discrete zones in the coastal terminal sector between April 2023 and April 2024.\n\nThe expansion includes a primary reinforced port apron extension, a new steel gantry pier assembly, and adjacent foundation excavation. Multispectral NDVI dropped sharply (-0.34) accompanied by a +4.8 dB synthetic aperture radar (SAR) backscatter spike, confirming concrete pouring and heavy superstructure placement rather than seasonal tidal variance.',
    zones: INITIAL_ZONES,
    summaryMetrics: {
      netConversion: '+4,820 m²',
      confidence: '96.4%',
      zonesCount: '3 Polygons',
    },
    t0Filter: 'contrast(1.1) brightness(0.85) hue-rotate(-20deg)',
    t1Filter: 'hue-rotate(15deg) contrast(1.2)',
    obs1: { tag: 'T0', title: 'Baseline (2023-04)', sensor: 'Sentinel-2', gsd: '10m GSD', date: '2023-04-12' },
    obs2: { tag: 'T1', title: 'Comparison (2024-04)', sensor: 'WorldView-3', gsd: '0.5m GSD', date: '2024-04-18' },
    traceSteps: INITIAL_TRACE_STEPS,
  },
  suez: {
    userPrompt:
      'Perform maritime radar vessel count and anchorage density estimation along the southern canal approach.',
    assistantAnswer:
      '**Maritime congestion index shows 47 stationary vessels** anchored within the designated waiting sectors.\n\nDual-polarization SAR backscatter indicates 18 ultra-large container carriers (ULCV >350m length) with high double-bounce signature. Coherence mapping reveals zero hydrodynamic blockage in the transit bypass fairway, confirming unimpeded convoy flow.',
    zones: [
      {
        id: 'zone-suez-1',
        name: 'Sector Alpha: Anchorage Bottleneck (18 Vessels)',
        areaDelta: '+18 Targets',
        classification: 'Maritime Radar Cluster (ULCV / Tankers)',
        confidence: '99.1%',
        material: 'High-RCS Marine Grade Steel · Polarimetric HH/HV peak +14.2 dB',
        spectralMetrics: 'Doppler centroid shift confirms zero velocity (moored)',
        coordinates: [[32.55, 29.95], [32.61, 29.95], [32.61, 29.91], [32.55, 29.91]],
        boxStyle: { top: '32%', left: '20%', width: '30%', height: '26%' },
        colorTheme: 'primary',
      },
      {
        id: 'zone-suez-2',
        name: 'Sector Bravo: Active Fairway Bypass',
        areaDelta: 'Clear Fairway',
        classification: 'Navigable Transit Channel (Zero Obstruction)',
        confidence: '98.5%',
        material: 'Open Saline Water · Specular radar reflectance (< -24 dB)',
        spectralMetrics: 'Surface wave roughness normal, draft depth maintained',
        coordinates: [[32.58, 29.90], [32.64, 29.90], [32.64, 29.85], [32.58, 29.85]],
        boxStyle: { top: '60%', left: '50%', width: '25%', height: '25%' },
        colorTheme: 'secondary',
      },
    ],
    summaryMetrics: {
      netConversion: '47 Vessels',
      confidence: '98.8%',
      zonesCount: '2 Sectors',
    },
    t0Filter: 'hue-rotate(180deg) saturate(1.8) contrast(1.3)',
    t1Filter: 'hue-rotate(195deg) saturate(1.9) contrast(1.4)',
    obs1: { tag: 'T0', title: 'Prior Pass (Pass #74)', sensor: 'Sentinel-1 C-SAR', gsd: '5.0m GSD', date: '2024-05-01' },
    obs2: { tag: 'T1', title: 'Current Pass (Pass #86)', sensor: 'Sentinel-1 C-SAR', gsd: '5.0m GSD', date: '2024-05-13' },
    traceSteps: [
      { stepNumber: 'SAR-01', title: 'CFAR Target Detection', description: 'Applied constant false-alarm rate detector on calibrated sigma-nought grid.', tagColor: 'primary' },
      { stepNumber: 'SAR-02', title: 'Length & Heading Decomposition', description: 'Extracted vessel bounding ellipses and azimuth orientations.', tagColor: 'secondary' },
    ],
  },
  taiwan: {
    userPrompt:
      'Inspect X-band SAR coherence anomalies and surface wake disturbances across the shipping corridor.',
    assistantAnswer:
      '**X-band interferometric coherence reveals two high-speed transit trails** exhibiting asymmetric Kelvin wake angles across the median corridor line.\n\nMicrowave surface roughness highlights strong Bragg scattering signatures along coordinates 24.32°N, 119.88°E, characteristic of twin military-grade surface combatants traveling at approximately 26 knots.',
    zones: [
      {
        id: 'zone-tw-1',
        name: 'Corridor Wake Anomaly (+3.2 km trail)',
        areaDelta: '3.2 km Wake',
        classification: 'Hydrodynamic Wake Kelvin Pattern',
        confidence: '95.8%',
        material: 'Surfactant Slick & Foam · Bragg microwave backscatter +6.1 dB',
        spectralMetrics: 'Wake half-angle: 19.4° (deep water Kelvin envelope)',
        coordinates: [[119.85, 24.35], [119.95, 24.35], [119.95, 24.28], [119.85, 24.28]],
        boxStyle: { top: '38%', left: '35%', width: '36%', height: '28%' },
        colorTheme: 'primary',
      },
    ],
    summaryMetrics: {
      netConversion: '2 Corridors',
      confidence: '95.8%',
      zonesCount: '1 Footprint',
    },
    t0Filter: 'grayscale(0.6) contrast(1.4) brightness(0.9)',
    t1Filter: 'grayscale(0.3) contrast(1.5) hue-rotate(-10deg)',
    obs1: { tag: 'T0', title: 'X-SAR Ascending Pass', sensor: 'COSMO-SkyMed', gsd: '1.0m GSD', date: '2024-06-02' },
    obs2: { tag: 'T1', title: 'X-SAR Descending Pass', sensor: 'COSMO-SkyMed', gsd: '1.0m GSD', date: '2024-06-03' },
    traceSteps: [
      { stepNumber: 'X-01', title: 'Speckle Filter (Lee Sigma)', description: 'Filtered multiplicative speckle noise with 7x7 spatial kernel.', tagColor: 'primary' },
      { stepNumber: 'X-02', title: 'Kelvin Wake Envelope Inversion', description: 'Calculated vessel velocity from cusp wave angle spacing.', tagColor: 'tertiary' },
    ],
  },
  volcano: {
    userPrompt:
      'Map magma chamber ground inflation and thermal radiance spikes along the active volcanic fissure.',
    assistantAnswer:
      '**Thermal radiance has intensified by +18.6°C** across the primary rift zone, with differential InSAR phase unwrapping detecting **+4.2 cm vertical crustal uplift**.\n\nLandsat-9 Band 10 thermal infrared demonstrates fresh basalt lava flow breakout expanding eastward toward the protective berm defenses.',
    zones: [
      {
        id: 'zone-volc-1',
        name: 'Zone 1: Active Lava Fissure (+18.6°C Spike)',
        areaDelta: '+820 m Spurt',
        classification: 'Active Basalt Effusion (Thermal Radiance)',
        confidence: '97.9%',
        material: 'Molten Basaltic Rock · Brightness temp > 840 Kelvin',
        spectralMetrics: 'SWIR Band 7 radiance saturated, InSAR coherence decorrelated',
        coordinates: [[-22.38, 63.88], [-22.32, 63.88], [-22.32, 63.84], [-22.38, 63.84]],
        boxStyle: { top: '24%', left: '26%', width: '38%', height: '36%' },
        colorTheme: 'primary',
      },
    ],
    summaryMetrics: {
      netConversion: '+4.2 cm Uplift',
      confidence: '97.9%',
      zonesCount: '1 Fissure',
    },
    t0Filter: 'hue-rotate(290deg) contrast(1.3) saturate(1.4)',
    t1Filter: 'hue-rotate(330deg) contrast(1.5) saturate(2.0)',
    obs1: { tag: 'T0', title: 'Pre-Eruption Thermal Baseline', sensor: 'Landsat-9 TIRS', gsd: '30m GSD', date: '2024-01-14' },
    obs2: { tag: 'T1', title: 'Post-Rift Thermal Flare', sensor: 'Landsat-9 TIRS', gsd: '30m GSD', date: '2024-02-08' },
    traceSteps: [
      { stepNumber: 'TH-01', title: 'Atmospheric Transmittance Correction', description: 'MODTRAN atmospheric profile inverted for split-window radiance.', tagColor: 'secondary' },
      { stepNumber: 'TH-02', title: 'InSAR Crustal Deflation Modeling', description: 'Mogi point source inversion estimated magma chamber depth at 4.2 km.', tagColor: 'primary' },
    ],
  },
  amazon: {
    userPrompt:
      'Identify selective logging boundaries and canopy disturbance in the protected bio-reserve.',
    assistantAnswer:
      '**Canopy disturbance isolated over 6,340 m²** along newly cut access roads. Normalized Difference Moisture Index (NDMI) dropped by -0.48, indicative of freshly exposed bare laterite soil beneath depleted primary rainforest canopy.',
    zones: [
      {
        id: 'zone-amz-1',
        name: 'Clearcut Polygon A (+3,900 m²)',
        areaDelta: '+3,900 m²',
        classification: 'Canopy Deforestation (Bare Laterite Soil)',
        confidence: '96.2%',
        material: 'Laterite Soil & Slash · NDVI drop from 0.82 to 0.28',
        spectralMetrics: 'Red-Edge index drop -62%, SWIR reflectance spike +88%',
        coordinates: [[-62.45, -8.12], [-62.40, -8.12], [-62.40, -8.16], [-62.45, -8.16]],
        boxStyle: { top: '40%', left: '25%', width: '28%', height: '30%' },
        colorTheme: 'primary',
      },
      {
        id: 'zone-amz-2',
        name: 'Clearcut Polygon B (+2,440 m²)',
        areaDelta: '+2,440 m²',
        classification: 'Feeder Logging Road Extension',
        confidence: '94.8%',
        material: 'Compacted Dirt Corridor · Linear clearing width: 14.5m',
        spectralMetrics: 'Linear structural entropy: 0.12',
        coordinates: [[-62.38, -8.18], [-62.32, -8.18], [-62.32, -8.22], [-62.38, -8.22]],
        boxStyle: { top: '55%', left: '58%', width: '22%', height: '26%' },
        colorTheme: 'secondary',
      },
    ],
    summaryMetrics: {
      netConversion: '6,340 m²',
      confidence: '95.5%',
      zonesCount: '2 Clearcuts',
    },
    t0Filter: 'hue-rotate(60deg) saturate(1.4) contrast(1.1)',
    t1Filter: 'hue-rotate(20deg) saturate(1.1) contrast(1.25)',
    obs1: { tag: 'T0', title: 'Dry Season Baseline (2023)', sensor: 'Sentinel-2 L2A', gsd: '10m GSD', date: '2023-08-10' },
    obs2: { tag: 'T1', title: 'Dry Season Follow-up (2024)', sensor: 'Sentinel-2 L2A', gsd: '10m GSD', date: '2024-08-12' },
    traceSteps: [
      { stepNumber: 'FOR-01', title: 'Fractional Vegetation Cover Inversion', description: 'Calculated SMA (Spectral Mixture Analysis) endmembers for Green Veg and Soil.', tagColor: 'primary' },
      { stepNumber: 'FOR-02', title: 'Deforestation Vector Regularization', description: 'Morphological opening and closing filtered non-anthropogenic tree falls.', tagColor: 'tertiary' },
    ],
  },
};

