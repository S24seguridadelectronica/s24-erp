import { useState, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import { Calculator, PlusCircle, Download } from 'lucide-react';

// ============================================================
// CATÁLOGOS COMPLETOS
// ============================================================
const CATALOG: Record<string, { value: string; label: string }[]> = {
  utp: [
    { value: "700|UTP Cat 5e Aleación Interior", label: "UTP Categoría 5e Aleación Interior - $700/m" },
    { value: "900|UTP Cat 5e Aleación Exterior", label: "UTP Categoría 5e Aleación Exterior - $900/m" },
    { value: "1000|UTP Cat 5e Siamés Interior", label: "UTP Categoría 5e Siamés Interior - $1.000/m" },
    { value: "1200|UTP Cat 5e 100% Cobre Interior", label: "UTP Categoría 5e 100% Cobre Interior - $1.200/m" },
    { value: "1500|UTP Cat 5e 100% Cobre Exterior", label: "UTP Categoría 5e 100% Cobre Exterior - $1.500/m" },
    { value: "1800|UTP Cat 6 CCA", label: "UTP Categoría 6 CCA - $1.800/m" },
    { value: "2200|UTP Cat 6 100% Cobre", label: "UTP Categoría 6 100% Cobre - $2.200/m" },
    { value: "2600|UTP Cat 6A 100% Cobre", label: "UTP Categoría 6A 100% Cobre - $2.600/m" },
    { value: "3200|UTP Cat 7", label: "UTP Categoría 7 - $3.200/m" },
    { value: "4200|UTP Cat 8", label: "UTP Categoría 8 - $4.200/m" }
  ],
  duplex: [
    { value: "1100|Cable Dúplex 2x22", label: "Cable Dúplex 2x22 - $1.100/m" },
    { value: "1600|Cable Dúplex 2x20", label: "Cable Dúplex 2x20 - $1.600/m" },
    { value: "2200|Cable Dúplex 2x18", label: "Cable Dúplex 2x18 - $2.200/m" },
    { value: "3000|Cable Dúplex 2x16", label: "Cable Dúplex 2x16 - $3.000/m" },
    { value: "4200|Cable Dúplex 2x14", label: "Cable Dúplex 2x14 - $4.200/m" }
  ],
  coax: [
    { value: "2500|Coaxial RG59", label: "Coaxial RG59 - $2.500/m" }
  ]
};

interface DuctInfo {
  name: string;
  display: string;
  unit: string;
  unitLength: number;
  pricePerUnit: number;
  laborRate: number;
  heightRate: number;
  distRate: number;
  accessoryType?: 'pvc' | 'mt';
}

const DUCT: Record<string, DuctInfo> = {
  canaleta_20x10: { name: "Canaleta 20x10 mm (pequeña)", display: "Canaleta 20×10 — $8.500 tramo de 2m", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 8500, laborRate: 60000, heightRate: 10000, distRate: 1500 },
  canaleta_30x15: { name: "Canaleta 30x15 mm (mediana)", display: "Canaleta 30×15 — $12.000 tramo de 2m", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 12000, laborRate: 65000, heightRate: 11000, distRate: 1600 },
  canaleta_40x20: { name: "Canaleta 40x20 mm (grande)", display: "Canaleta 40×20 — $18.000 tramo de 2m", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 18000, laborRate: 70000, heightRate: 12000, distRate: 1700 },
  canaleta_50x25: { name: "Canaleta 50x25 mm (extra grande)", display: "Canaleta 50×25 — $26.000 tramo de 2m", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 26000, laborRate: 75000, heightRate: 13000, distRate: 1800 },
  tubo_pvc_12: { name: 'Tubo PVC 1/2"', display: 'Tubo PVC 1/2" — $5.400 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 5400, laborRate: 75000, heightRate: 15000, distRate: 2000, accessoryType: 'pvc' },
  tubo_pvc_34: { name: 'Tubo PVC 3/4"', display: 'Tubo PVC 3/4" — $8.200 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 8200, laborRate: 80000, heightRate: 16000, distRate: 2200, accessoryType: 'pvc' },
  tubo_pvc_1: { name: 'Tubo PVC 1"', display: 'Tubo PVC 1" — $12.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 12000, laborRate: 85000, heightRate: 17000, distRate: 2400, accessoryType: 'pvc' },
  tubo_pvc_112: { name: 'Tubo PVC 1 1/2"', display: 'Tubo PVC 1 1/2" — $19.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 19000, laborRate: 95000, heightRate: 19000, distRate: 2800, accessoryType: 'pvc' },
  tubo_pvc_2: { name: 'Tubo PVC 2"', display: 'Tubo PVC 2" — $28.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 28000, laborRate: 110000, heightRate: 22000, distRate: 3200, accessoryType: 'pvc' },
  tubo_mt_12: { name: 'Tubo MT 1/2"', display: 'Tubo MT 1/2" — $15.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 15000, laborRate: 90000, heightRate: 20000, distRate: 2500, accessoryType: 'mt' },
  tubo_mt_34: { name: 'Tubo MT 3/4"', display: 'Tubo MT 3/4" — $22.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 22000, laborRate: 95000, heightRate: 22000, distRate: 2800, accessoryType: 'mt' },
  tubo_mt_1: { name: 'Tubo MT 1"', display: 'Tubo MT 1" — $32.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 32000, laborRate: 100000, heightRate: 25000, distRate: 3000, accessoryType: 'mt' },
  tubo_mt_112: { name: 'Tubo MT 1 1/2"', display: 'Tubo MT 1 1/2" — $48.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 48000, laborRate: 115000, heightRate: 28000, distRate: 3400, accessoryType: 'mt' },
  tubo_mt_2: { name: 'Tubo MT 2"', display: 'Tubo MT 2" — $70.000 tubo de 3m', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 70000, laborRate: 130000, heightRate: 32000, distRate: 3800, accessoryType: 'mt' }
};

const SIZING = {
  tuberia: {
    label: 'Tubería', unit: 'tubo de 3 m', unitLength: 3,
    tiers: [
      { max: 5, parts: [['d12', 100]] as [string, number][] },
      { max: 8, parts: [['d12', 50], ['d34', 50]] as [string, number][] },
      { max: 16, parts: [['d12', 30], ['d34', 30], ['d1', 40]] as [string, number][] },
      { max: 32, parts: [['d12', 20], ['d34', 30], ['d1', 20], ['d112', 30]] as [string, number][] }
    ],
    progressiveAnchors: [
      { cams: 32, parts: [['d12', 20], ['d34', 30], ['d1', 20], ['d112', 30], ['d2', 0]] as [string, number][] },
      { cams: 48, parts: [['d12', 10], ['d34', 25], ['d1', 25], ['d112', 30], ['d2', 10]] as [string, number][] },
      { cams: 64, parts: [['d12', 5], ['d34', 20], ['d1', 25], ['d112', 30], ['d2', 20]] as [string, number][] },
      { cams: 96, parts: [['d12', 0], ['d34', 15], ['d1', 25], ['d112', 30], ['d2', 30]] as [string, number][] },
      { cams: 128, parts: [['d12', 0], ['d34', 10], ['d1', 20], ['d112', 30], ['d2', 40]] as [string, number][] }
    ]
  },
  canaleta: {
    label: 'Canaleta', unit: 'tramo de 2 m', unitLength: 2,
    tiers: [
      { max: 5, parts: [['p', 100]] as [string, number][] },
      { max: 8, parts: [['p', 50], ['m', 50]] as [string, number][] },
      { max: 16, parts: [['p', 30], ['m', 30], ['g', 40]] as [string, number][] },
      { max: 32, parts: [['p', 20], ['m', 30], ['g', 20], ['x', 30]] as [string, number][] }
    ],
    progressiveAnchors: [
      { cams: 32, parts: [['p', 20], ['m', 30], ['g', 20], ['x', 30]] as [string, number][] },
      { cams: 48, parts: [['p', 10], ['m', 25], ['g', 25], ['x', 40]] as [string, number][] },
      { cams: 64, parts: [['p', 5], ['m', 20], ['g', 25], ['x', 50]] as [string, number][] },
      { cams: 96, parts: [['p', 0], ['m', 15], ['g', 25], ['x', 60]] as [string, number][] },
      { cams: 128, parts: [['p', 0], ['m', 10], ['g', 20], ['x', 70]] as [string, number][] }
    ]
  }
};

const SIZING_MAP: Record<string, { type: 'tuberia' | 'canaleta'; label: string; keys: Record<string, string> }> = {
  pvc: { type: 'tuberia', label: 'PVC', keys: { d12: 'tubo_pvc_12', d34: 'tubo_pvc_34', d1: 'tubo_pvc_1', d112: 'tubo_pvc_112', d2: 'tubo_pvc_2' } },
  mt: { type: 'tuberia', label: 'MT/EMT', keys: { d12: 'tubo_mt_12', d34: 'tubo_mt_34', d1: 'tubo_mt_1', d112: 'tubo_mt_112', d2: 'tubo_mt_2' } },
  canaleta: { type: 'canaleta', label: 'Canaleta', keys: { p: 'canaleta_20x10', m: 'canaleta_30x15', g: 'canaleta_40x20', x: 'canaleta_50x25' } }
};

interface AccessoryConfig {
  name: string;
  factorPerTube: number;
  prices?: Record<string, number>;
  price?: number;
}

const ACCESSORIES: Record<string, Record<string, AccessoryConfig>> = {
  pvc: {
    union: { name: "Unión PVC", factorPerTube: 3, prices: { d12: 1500, d34: 2000, d1: 3000, d112: 4500, d2: 6500 } },
    curva_90: { name: "Curva 90° PVC", factorPerTube: 1, prices: { d12: 3500, d34: 4500, d1: 6000, d112: 8500, d2: 12000 } },
    abrazadera: { name: "Abrazadera plástica", factorPerTube: 2, prices: { d12: 800, d34: 1000, d1: 1300, d112: 1800, d2: 2500 } },
    chazo: { name: "Chazo plástico 1/4\"", price: 300, factorPerTube: 4 },
    tornillo: { name: "Tornillo drywall 1/4\"", price: 250, factorPerTube: 4 }
  },
  mt: {
    union: { name: "Unión MT", factorPerTube: 3, prices: { d12: 4500, d34: 6000, d1: 8000, d112: 11000, d2: 15000 } },
    curva_90: { name: "Curva 90° MT", factorPerTube: 1, prices: { d12: 8500, d34: 11000, d1: 15000, d112: 21000, d2: 28000 } },
    grapa: { name: "Grapa doble oreja MT", factorPerTube: 2, prices: { d12: 1200, d34: 1500, d1: 1900, d112: 2400, d2: 3200 } },
    chazo: { name: "Chazo metálico 1/4\"", price: 400, factorPerTube: 4 },
    tornillo: { name: "Tornillo drywall 1/4\"", price: 350, factorPerTube: 4 }
  }
};

interface PoeSwitch {
  id: string;
  name: string;
  poePorts: number;
  uplinkPorts: string;
  watts: number;
  distConv: number;
  distExt: number;
  price: number;
  type: string;
}

const POE_SWITCHES: PoeSwitch[] = [
  { id: "poe_4", name: "Switch PoE 4 puertos + 2 Uplink", poePorts: 4, uplinkPorts: "2 Gigabit Uplink", watts: 60, distConv: 100, distExt: 250, price: 180000, type: "Intermedio / Acceso local" },
  { id: "poe_8", name: "Switch PoE 8 puertos + 2 Uplink", poePorts: 8, uplinkPorts: "2 Gigabit Uplink", watts: 120, distConv: 100, distExt: 250, price: 320000, type: "Intermedio / Distribución" },
  { id: "poe_16", name: "Switch PoE 16 puertos + 2 SFP Uplink", poePorts: 16, uplinkPorts: "2 Combo Gigabit / SFP", watts: 200, distConv: 100, distExt: 250, price: 650000, type: "Intermedio / Core Zonal" },
  { id: "poe_24", name: "Switch PoE 24 puertos + 2 SFP Uplink", poePorts: 24, uplinkPorts: "2 SFP Gigabit", watts: 370, distConv: 100, distExt: 250, price: 980000, type: "Principal / Intermedio de alta densidad" },
  { id: "poe_48", name: "Switch PoE 48 puertos + 4 SFP+ Uplink", poePorts: 48, uplinkPorts: "4 SFP+ 10G", watts: 500, distConv: 100, distExt: 250, price: 1850000, type: "Principal / Rack Central" }
];

const CONNECTIONS: Record<string, { videoTitle: string; videoCatalog: string; power: boolean; note: string }> = {
  analog_utp_siamese: { videoTitle: "UTP de video + energía", videoCatalog: "utp", power: false, note: "Un solo cable UTP por cámara. Se utiliza para transportar la señal de video y la alimentación mediante los pares disponibles." },
  analog_utp_duplex: { videoTitle: "UTP de video", videoCatalog: "utp", power: true, note: "Dos recorridos por cámara: un UTP para video y un cable dúplex independiente para alimentación." },
  analog_coax_duplex: { videoTitle: "Coaxial RG59 de video", videoCatalog: "coax", power: true, note: "Dos recorridos por cámara: coaxial RG59 para video y cable dúplex independiente para energía." },
  ip_poe: { videoTitle: "UTP Ethernet / PoE", videoCatalog: "utp", power: false, note: "Un solo UTP por cámara. El mismo cable Ethernet transporta datos y energía PoE desde el switch/inyector PoE." },
  ip_utp_duplex: { videoTitle: "UTP Ethernet", videoCatalog: "utp", power: true, note: "Dos recorridos por cámara: UTP Ethernet para datos y cable dúplex independiente para alimentación." }
};

// ============================================================
// HELPERS
// ============================================================
const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format;
const parseCable = (str: string) => { const [p, n] = (str || '0|Cable').split('|'); return { price: +p || 0, name: n || 'Cable' }; };
const ceilUnits = (m: number, u: number) => Math.ceil(Math.max(0, m) / u);
const unitLabel = (duct: DuctInfo, qty: number) => qty === 1 ? duct.unit : duct.unit.replace('tubo de', 'tubos de').replace('tramo de', 'tramos de');

function getRecommendedPower(cams: number, dist: number): string {
  if (cams <= 4) return dist <= 25 ? "1100|Cable Dúplex 2x22" : "1600|Cable Dúplex 2x20";
  if (cams <= 8) return dist <= 20 ? "1600|Cable Dúplex 2x20" : dist <= 40 ? "2200|Cable Dúplex 2x18" : "3000|Cable Dúplex 2x16";
  if (cams <= 16) return dist <= 20 ? "2200|Cable Dúplex 2x18" : dist <= 40 ? "3000|Cable Dúplex 2x16" : "4200|Cable Dúplex 2x14";
  return dist <= 20 ? "3000|Cable Dúplex 2x16" : "4200|Cable Dúplex 2x14";
}

function getAutoPoeId(cams: number): string {
  return cams <= 4 ? "poe_4" : cams <= 8 ? "poe_8" : cams <= 16 ? "poe_16" : cams <= 24 ? "poe_24" : "poe_48";
}

function getCommercialInfo(name: string, meters: number): { qty: number; unit: string }[] {
  const n = (name || '').toLowerCase();
  if (n.includes('utp')) return [
    { qty: ceilUnits(meters, 100), unit: 'carrete(s) de 100 m' },
    { qty: ceilUnits(meters, 305), unit: 'carrete(s) de 305 m' }
  ];
  if (n.includes('dúplex') || n.includes('duplex')) return [{ qty: ceilUnits(meters, 200), unit: 'rollo(s) de 200 m' }];
  return [];
}

function getDuctGroup(ductKey: string): 'pvc' | 'mt' | 'canaleta' {
  if (ductKey.startsWith('canaleta')) return 'canaleta';
  if (ductKey.startsWith('tubo_pvc')) return 'pvc';
  return 'mt';
}

function interpolateProgressive(anchors: { cams: number; parts: [string, number][] }[], cams: number): [string, number][] {
  const keys = [...new Set(anchors.flatMap(a => a.parts.map(p => p[0])))];
  let prev = anchors[0], next = anchors[anchors.length - 1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (cams >= anchors[i].cams && cams <= anchors[i + 1].cams) { prev = anchors[i]; next = anchors[i + 1]; break; }
  }
  const t = next.cams === prev.cams ? 0 : (cams - prev.cams) / (next.cams - prev.cams);
  let parts: [string, number][] = keys.map(k => {
    const pv = (prev.parts.find(p => p[0] === k) || [k, 0])[1];
    const nv = (next.parts.find(p => p[0] === k) || [k, 0])[1];
    return [k, Math.round(pv + (nv - pv) * t)] as [string, number];
  });
  let diff = 100 - parts.reduce((a, p) => a + p[1], 0);
  let guard = 0;
  while (diff !== 0 && guard++ < 200) {
    const idx = parts.reduce((best, p, i) => (p[1] >= parts[best][1] ? i : best), 0);
    const step = diff > 0 ? 1 : -1;
    if (parts[idx][1] + step < 0) { parts[idx][1] = 0; diff -= step; continue; }
    parts[idx][1] += step;
    diff -= step;
  }
  return parts;
}

interface SizingResult {
  group: string;
  groupLabel: string;
  unit: string;
  unitLength: number;
  estimated: boolean;
  segments: {
    sizeKey: string;
    pct: number;
    meters: number;
    units: number;
    duct: DuctInfo;
    ductKey: string;
  }[];
  totalMeters: number;
  totalUnits: number;
}

function calcularDimensionamiento(cantidadCamaras: number, metrosCanalizacion: number, tipoCanalizacion: string): SizingResult {
  const map = SIZING_MAP[tipoCanalizacion] || SIZING_MAP.pvc;
  const conf = SIZING[map.type];
  const total = Math.max(0, Math.round(metrosCanalizacion));
  const cams = Math.max(1, Math.round(cantidadCamaras));

  let parts: [string, number][] = [];
  let estimated = false;
  const tier = conf.tiers.find(t => cams <= t.max);
  if (tier) parts = tier.parts;
  else { estimated = true; parts = interpolateProgressive(conf.progressiveAnchors, cams); }

  parts = parts.filter(p => p[1] > 0);

  let meters = parts.map(p => Math.round(total * p[1] / 100));
  let diff = total - meters.reduce((a, b) => a + b, 0);
  if (diff !== 0 && meters.length > 0) {
    let guard = 0;
    const order = parts.map((p, i) => i).sort((a, b) => parts[b][1] - parts[a][1]);
    while (diff !== 0 && guard++ < 500) {
      let applied = false;
      for (const i of order) {
        const step = diff > 0 ? 1 : -1;
        if (meters[i] + step >= 0) { meters[i] += step; diff -= step; applied = true; break; }
      }
      if (!applied) break;
    }
  }

  const segments = parts.map((p, i) => {
    const duct = DUCT[map.keys[p[0]]];
    return duct ? {
      sizeKey: p[0], pct: p[1], meters: meters[i],
      units: ceilUnits(meters[i], duct.unitLength),
      duct, ductKey: map.keys[p[0]]
    } : null;
  }).filter(Boolean) as SizingResult['segments'];

  return {
    group: tipoCanalizacion, groupLabel: map.label,
    unit: conf.unit, unitLength: conf.unitLength, estimated,
    segments,
    totalMeters: meters.reduce((a, b) => a + b, 0),
    totalUnits: segments.reduce((a, s) => a + s.units, 0)
  };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
interface CctvCalculatorModalProps {
  show: boolean;
  onHide: () => void;
  onAddItems: (items: any[]) => void;
}

export function CctvCalculatorModal({ show, onHide, onAddItems }: CctvCalculatorModalProps) {
  const [sideA, setSideA] = useState(25);
  const [sideB, setSideB] = useState(30);
  const [cams, setCams] = useState(8);
  const [height, setHeight] = useState(3);
  const [ductGroup, setDuctGroup] = useState<'pvc' | 'mt' | 'canaleta'>('pvc');
  const [connection, setConnection] = useState('ip_poe');
  const [videoCable, setVideoCable] = useState(CATALOG.utp[3].value); // Cat 5e 100% Cobre
  const [powerCable, setPowerCable] = useState("1600|Cable Dúplex 2x20");
  const [poeSwitchId, setPoeSwitchId] = useState(getAutoPoeId(8));
  const [userModifiedPower, setUserModifiedPower] = useState(false);
  const [userModifiedPoe, setUserModifiedPoe] = useState(false);

  // Reset video cable when connection changes
  useMemo(() => {
    const cfg = CONNECTIONS[connection];
    const firstVideo = CATALOG[cfg.videoCatalog][0].value;
    setVideoCable(firstVideo);
  }, [connection]);

  // Reset power cable recommendation when cams/dist changes (only if not manually modified)
  useMemo(() => {
    if (!userModifiedPower && CONNECTIONS[connection].power) {
      const routeM = Math.ceil((Math.max(sideA, sideB) / 2) * cams + sideA + sideB + height * cams);
      const avg = routeM / cams;
      setPowerCable(getRecommendedPower(cams, avg));
    }
  }, [cams, sideA, sideB, height, connection, userModifiedPower]);

  const calc = useMemo(() => {
    const cfg = CONNECTIONS[connection];
    const video = parseCable(videoCable);
    const power = parseCable(powerCable);

    const routeMeters = Math.ceil((Math.max(sideA, sideB) / 2) * cams + sideA + sideB + height * cams);
    const avgDistExact = routeMeters / cams;
    const avgDist = Math.round(avgDistExact);

    const extraHeight = Math.max(0, height - 3);
    const extraDist = Math.max(0, avgDistExact - 10);

    // Dimensionamiento automático
    const sizing = calcularDimensionamiento(cams, routeMeters, ductGroup);

    // Tarifa de mano de obra promedio ponderada
    const avgLaborRate = routeMeters > 0
      ? sizing.segments.reduce((a, s) => a + s.duct.laborRate * s.meters, 0) / routeMeters
      : (DUCT.tubo_pvc_12?.laborRate || 75000);

    // Recargos usando la altura/distancia promedio
    const heightSurcharge = extraHeight * (sizing.segments[0]?.duct.heightRate || 15000) * cams;
    const distSurcharge = extraDist * (sizing.segments[0]?.duct.distRate || 2000) * cams;

    // Costo de ductería por segmento
    const ductCost = sizing.segments.reduce((a, s) => a + s.units * s.duct.pricePerUnit, 0);

    // Accesorios detallados
    const accMap = new Map<string, { name: string; qty: number; unitPrice: number; total: number }>();
    let accessoriesTotal = 0;
    sizing.segments.forEach(s => {
      const accType = s.duct.accessoryType;
      if (!accType || !ACCESSORIES[accType]) return;
      Object.entries(ACCESSORIES[accType]).forEach(([key, acc]) => {
        const qty = s.units * acc.factorPerTube;
        const variable = !!acc.prices;
        const unitPrice = variable ? (acc.prices![s.sizeKey] ?? 0) : (acc.price ?? 0);
        const cost = qty * unitPrice;
        const mapKey = variable ? `${accType}:${key}:${s.sizeKey}` : `${accType}:${key}`;
        const existing = accMap.get(mapKey);
        if (existing) { existing.qty += qty; existing.total += cost; }
        else accMap.set(mapKey, {
          name: variable ? `${acc.name} para ${s.duct.name}` : acc.name,
          qty, unitPrice, total: cost
        });
        accessoriesTotal += cost;
      });
    });
    const accessoryDetails = [...accMap.values()];

    const videoCost = routeMeters * video.price;
    const powerCost = cfg.power ? routeMeters * power.price : 0;
    const laborCost = Math.round(cams * avgLaborRate);

    let switchCost = 0;
    let switchObj: PoeSwitch | null = null;
    if (connection === 'ip_poe' && avgDist > 90) {
      switchObj = POE_SWITCHES.find(s => s.id === poeSwitchId) || POE_SWITCHES[0];
      switchCost = switchObj.price;
    }

    const total = videoCost + powerCost + ductCost + accessoriesTotal + laborCost + heightSurcharge + distSurcharge + switchCost;
    const physicalMeters = cfg.power ? routeMeters * 2 : routeMeters;
    const vidComm = getCommercialInfo(video.name, routeMeters);
    const pwrComm = cfg.power ? getCommercialInfo(power.name, routeMeters) : [];

    const surchargePerPoint = cams > 0 ? (heightSurcharge + distSurcharge) / cams : 0;
    const pricePerPointTotal = avgLaborRate + surchargePerPoint;

    return {
      routeMeters, avgDist, avgDistExact, extraHeight, extraDist,
      heightSurcharge, distSurcharge, totalSurcharges: heightSurcharge + distSurcharge,
      ductCost, videoCost, powerCost, laborCost, avgLaborRate, switchCost, switchObj,
      total, physicalMeters, video, power, cfg,
      sizing, ductGroup, accessoryDetails, accessoriesTotal,
      vidComm, pwrComm, pricePerPointTotal
    };
  }, [sideA, sideB, cams, height, ductGroup, connection, videoCable, powerCable, poeSwitchId]);

  const handleAddToQuote = () => {
    const itemsToAdd: any[] = [
      {
        item_type: 'product' as const,
        description: `${calc.video.name} para ${cams} cámaras (${calc.routeMeters}m)`,
        quantity: calc.routeMeters,
        unit_price: calc.video.price
      }
    ];

    if (calc.cfg.power) {
      itemsToAdd.push({
        item_type: 'product' as const,
        description: `${calc.power.name} para alimentación (${calc.routeMeters}m)`,
        quantity: calc.routeMeters,
        unit_price: calc.power.price
      });
    }

    // Agregar ductos por segmento
    calc.sizing.segments.forEach(s => {
      itemsToAdd.push({
        item_type: 'product' as const,
        description: `Ductería: ${s.duct.name} (${s.units} ${unitLabel(s.duct, s.units)}, ${s.meters}m)`,
        quantity: s.units,
        unit_price: s.duct.pricePerUnit
      });
    });

    // Agregar accesorios
    calc.accessoryDetails.forEach(acc => {
      itemsToAdd.push({
        item_type: 'product' as const,
        description: `${acc.name}`,
        quantity: acc.qty,
        unit_price: acc.unitPrice
      });
    });

    // Switch PoE si aplica
    if (calc.switchObj) {
      itemsToAdd.push({
        item_type: 'product' as const,
        description: `Switch PoE Intermedio: ${calc.switchObj.name}`,
        quantity: 1,
        unit_price: calc.switchCost
      });
    }

    // Mano de obra con recargos
    itemsToAdd.push({
      item_type: 'service' as const,
      description: `Mano de obra e instalación (${cams} puntos) - ${calc.sizing.groupLabel}`,
      quantity: 1,
      unit_price: calc.laborCost + calc.heightSurcharge + calc.distSurcharge
    });

    onAddItems(itemsToAdd);
  };

  const handleDownloadQuote = () => {
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    let ductLines = calc.sizing.segments.map(s =>
      `    • ${s.duct.name}: ${s.pct}% = ${s.meters} m = ${s.units} ${unitLabel(s.duct, s.units)} × ${fmt(s.duct.pricePerUnit)}`
    ).join('\n');
    ductLines += `\n    Subtotal ductería: ${fmt(calc.ductCost)}`;
    if (calc.sizing.estimated) ductLines += `\n    ⚠️ Dimensionamiento estimado para instalación de gran capacidad`;

    let accLines = '';
    if (calc.accessoryDetails.length > 0) {
      accLines = calc.accessoryDetails.map(a => `    • ${a.name}: ${a.qty} uds × ${fmt(a.unitPrice)} = ${fmt(a.total)}`).join('\n');
      accLines += `\n    Subtotal accesorios: ${fmt(calc.accessoriesTotal)}`;
    }

    const switchLine = calc.switchObj ? `\nSwitch PoE Intermedio: ${calc.switchObj.name} = ${fmt(calc.switchCost)}` : '';

    const content = `═══════════════════════════════════════════════════════
  COTIZACIÓN S24 - INSTALACIÓN CCTV
  Fecha: ${fecha}  |  Hora: ${hora}
═══════════════════════════════════════════════════════

📍 DATOS DE LA INSTALACIÓN
───────────────────────────────────────────────────────
  Lado 1:              ${sideA} m
  Lado 2:              ${sideB} m
  Cámaras:             ${cams}
  Altura promedio:     ${height} m
  Distancia promedio:  ${calc.avgDist} m
  Metros de recorrido: ${calc.routeMeters} m
  Canalización:        ${calc.sizing.groupLabel} (dimensionamiento automático)
  Tipo de conexión:    ${calc.cfg.videoTitle}

📐 DIMENSIONAMIENTO DE CANALIZACIÓN (${cams} cámaras — ${calc.routeMeters} m)
───────────────────────────────────────────────────────
${ductLines}

📦 MATERIALES
───────────────────────────────────────────────────────
  ${calc.video.name}: ${calc.routeMeters} m × ${fmt(calc.video.price)}/m = ${fmt(calc.videoCost)}
${calc.cfg.power ? `  ${calc.power.name}: ${calc.routeMeters} m × ${fmt(calc.power.price)}/m = ${fmt(calc.powerCost)}` : '  (Sin cable de energía independiente — PoE / UTP siamese)'}
${accLines ? '\n🔧 ACCESORIOS DE INSTALACIÓN\n───────────────────────────────────────────────────────\n' + accLines : ''}
${switchLine}

💰 MANO DE OBRA Y RECARGOS
───────────────────────────────────────────────────────
  Instalación: ${cams} pts × ${fmt(calc.avgLaborRate)} (promedio ponderado) = ${fmt(calc.laborCost)}
  Recargo altura (${calc.extraHeight.toFixed(1)} m extra): ${fmt(calc.heightSurcharge)}
  Recargo distancia (${calc.extraDist.toFixed(1)} m extra): ${fmt(calc.distSurcharge)}
  Precio por punto (base + recargos): ${fmt(calc.pricePerPointTotal)}
═══════════════════════════════════════════════════════
  TOTAL ESTIMADO:  ${fmt(calc.total)}
═══════════════════════════════════════════════════════

⚠️ NOTA: Esta cotización es una estimación y no sustituye
la medición en obra. Los precios pueden variar según
proveedor y condiciones del sitio.

Generado por Calculadora S24 v3.0
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cotizacion_S24_${fecha.replace(/\//g, '-')}_${cams}cams.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title>
          <Calculator size={20} className="me-2 text-primary" />
          Calculadora Rápida para Cotización CCTV S24
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="mb-3">
          <small>
            <strong>Instrucciones:</strong> Ingresa las dimensiones del área, número de cámaras y altura promedio.
            El diámetro de canalización se asigna automáticamente según la cantidad de cámaras.
          </small>
        </Alert>

        {/* DATOS DE INSTALACIÓN */}
        <h6 className="text-muted text-uppercase small fw-bold mb-2">📍 Datos de la instalación</h6>
        <Row className="g-2 mb-3">
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1">Lado 1 (m)</Form.Label>
              <Form.Control type="number" min="1" value={sideA} onChange={(e) => setSideA(Math.max(0, +e.target.value || 0))} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1">Lado 2 (m)</Form.Label>
              <Form.Control type="number" min="1" value={sideB} onChange={(e) => setSideB(Math.max(0, +e.target.value || 0))} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1">Cámaras</Form.Label>
              <Form.Control type="number" min="1" max={128} value={cams} onChange={(e) => setCams(Math.max(1, +e.target.value || 1))} />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className="small mb-1">Altura prom. (m)</Form.Label>
              <Form.Control type="number" step="0.5" min="0" value={height} onChange={(e) => setHeight(Math.max(0, +e.target.value || 0))} />
            </Form.Group>
          </Col>
        </Row>

        {/* CONEXIÓN Y DUCTO */}
        <h6 className="text-muted text-uppercase small fw-bold mb-2">🔌 Tipo de conexión y canalización</h6>
        <Row className="g-2 mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="small mb-1">Tipo de Conexión</Form.Label>
              <Form.Select value={connection} onChange={(e) => setConnection(e.target.value)}>
                <option value="ip_poe">IP — Ethernet + PoE (video/datos + energía por UTP)</option>
                <option value="ip_utp_duplex">IP — Ethernet/UTP + cable dúplex para energía</option>
                <option value="analog_utp_siamese">Análoga — UTP para video + energía por el mismo UTP</option>
                <option value="analog_utp_duplex">Análoga — UTP para video + cable dúplex para energía</option>
                <option value="analog_coax_duplex">Análoga — Coaxial RG59 + cable dúplex para energía</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label className="small mb-1">
                Canalización <span className="text-muted">(diámetro automático según cámaras)</span>
              </Form.Label>
              <Form.Select value={ductGroup} onChange={(e) => setDuctGroup(e.target.value as any)}>
                <option value="pvc">Tubería PVC (1/2" a 2")</option>
                <option value="mt">Tubería Metálica MT/EMT (1/2" a 2")</option>
                <option value="canaleta">Canaleta (20x10 a 50x25 mm)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* CABLES */}
        <Row className="g-2 mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className="small mb-1">{calc.cfg.videoTitle}</Form.Label>
              <Form.Select value={videoCable} onChange={(e) => setVideoCable(e.target.value)}>
                {CATALOG[calc.cfg.videoCatalog].map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          {calc.cfg.power && (
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small mb-1">
                  Cable de energía <Badge bg="success" className="ms-1">Recomendado</Badge>
                </Form.Label>
                <Form.Select
                  value={powerCable}
                  onChange={(e) => {
                    setPowerCable(e.target.value);
                    setUserModifiedPower(true);
                  }}
                >
                  {CATALOG.duplex.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          )}
        </Row>

        {/* RESULTADOS RÁPIDOS */}
        <Card className="bg-light border-0 mb-3">
          <Card.Body className="p-3">
            <Row className="g-2 text-center">
              <Col><div className="small text-muted">Metros/recorrido</div><div className="fw-bold">{calc.routeMeters} m</div></Col>
              <Col><div className="small text-muted">Dist. promedio</div><div className="fw-bold">{calc.avgDist} m</div></Col>
              <Col><div className="small text-muted">Puntos</div><div className="fw-bold">{cams} Ptos</div></Col>
              <Col><div className="small text-muted">Metraje total</div><div className="fw-bold">{calc.physicalMeters} m</div></Col>
              <Col><div className="small text-muted">Recargos</div><div className="fw-bold">{calc.totalSurcharges > 0 ? fmt(calc.totalSurcharges) : 'Sin recargos ✓'}</div></Col>
              <Col><div className="small text-muted">Precio /pto</div><div className="fw-bold text-primary">{fmt(calc.pricePerPointTotal)}</div></Col>
            </Row>
          </Card.Body>
        </Card>

        {/* DIMENSIONAMIENTO DE CANALIZACIÓN */}
        <Card className="border-success border-opacity-25 mb-3">
          <Card.Header className="bg-success bg-opacity-10 border-0 py-2">
            <strong className="text-success small">📐 DIMENSIONAMIENTO AUTOMÁTICO DE CANALIZACIÓN</strong>
          </Card.Header>
          <Card.Body className="p-3">
            <p className="small text-muted mb-2">
              <strong>{cams} cámaras</strong> — <strong>{calc.routeMeters} m</strong> de canalización ({calc.sizing.groupLabel})
            </p>
            {calc.sizing.estimated && (
              <Alert variant="warning" className="py-2 small">
                ⚠️ Dimensionamiento estimado para instalación de gran capacidad (&gt;32 cámaras)
              </Alert>
            )}
            <table className="table table-sm small mb-0">
              <thead className="table-light">
                <tr>
                  <th>Canalización</th>
                  <th className="text-end">Distribución</th>
                  <th className="text-end">Metros</th>
                  <th className="text-end">Compra</th>
                </tr>
              </thead>
              <tbody>
                {calc.sizing.segments.map((s, i) => (
                  <tr key={i}>
                    <td>{s.duct.name}</td>
                    <td className="text-end text-muted">{s.pct}%</td>
                    <td className="text-end">{s.meters} m</td>
                    <td className="text-end text-success fw-semibold">{s.units} {unitLabel(s.duct, s.units)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="fw-bold">
                <tr>
                  <td>Total</td>
                  <td className="text-end">100%</td>
                  <td className="text-end">{calc.sizing.totalMeters} m</td>
                  <td className="text-end text-primary">{calc.sizing.totalUnits} unidades</td>
                </tr>
              </tfoot>
            </table>
          </Card.Body>
        </Card>

        {/* CANTIDADES COMERCIALES */}
        <Card className="border-info border-opacity-25 mb-3">
          <Card.Header className="bg-info bg-opacity-10 border-0 py-2">
            <strong className="text-info small">📦 CANTIDADES COMERCIALES PARA COMPRA</strong>
          </Card.Header>
          <Card.Body className="p-3">
            <Row className="g-2 small">
              <Col md={6} className="bg-light rounded p-2">
                <div className="fw-semibold">{calc.sizing.groupLabel} — dim. automático ({cams} cámaras)</div>
                <div className="text-muted mb-1">Metraje total: {calc.sizing.totalMeters} m</div>
                <ul className="mb-1 ps-3">
                  {calc.sizing.segments.map((s, i) => (
                    <li key={i} className="text-success">
                      {s.units} {unitLabel(s.duct, s.units)} de {s.duct.name} → {s.meters} m ({s.pct}%)
                    </li>
                  ))}
                </ul>
                <div className="fw-bold text-primary">Total: {calc.sizing.totalUnits} unidades</div>
              </Col>
              <Col md={6}>
                {calc.vidComm.map((c, i) => (
                  <div key={i} className="bg-light rounded p-2 mb-2">
                    <div className="fw-semibold">{calc.video.name}</div>
                    <div className="text-muted">Metraje: {calc.routeMeters} m</div>
                    <div className="text-success fw-bold">{c.qty} {c.unit}</div>
                  </div>
                ))}
                {calc.cfg.power && calc.pwrComm.map((c, i) => (
                  <div key={i} className="bg-light rounded p-2 mb-2">
                    <div className="fw-semibold">{calc.power.name}</div>
                    <div className="text-muted">Metraje: {calc.routeMeters} m</div>
                    <div className="text-success fw-bold">{c.qty} {c.unit}</div>
                  </div>
                ))}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* SWITCH PoE RECOMENDADO */}
        {connection === 'ip_poe' && calc.avgDist > 90 && (
          <Card className="border-primary border-opacity-25 mb-3">
            <Card.Header className="bg-primary bg-opacity-10 border-0 py-2 d-flex justify-content-between align-items-center">
              <strong className="text-primary small">🔌 SWITCH PoE RECOMENDADO</strong>
              <Badge bg={userModifiedPoe ? "warning" : "primary"} className="ms-2">
                {userModifiedPoe ? "Selección Manual" : "Recomendación Automática"}
              </Badge>
            </Card.Header>
            <Card.Body className="p-3">
              <Form.Group className="mb-3">
                <Form.Label className="small mb-1">Switch PoE seleccionado:</Form.Label>
                <Form.Select
                  value={poeSwitchId}
                  onChange={(e) => {
                    setPoeSwitchId(e.target.value);
                    setUserModifiedPoe(true);
                  }}
                >
                  {POE_SWITCHES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.poePorts} Ptos, {s.watts}W) - {fmt(s.price)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              {calc.switchObj && (
                <Row className="g-2 small mb-3 bg-light rounded p-2">
                  <Col md={6}>
                    <p className="mb-1"><span className="text-muted">Cámaras:</span> <strong>{cams}</strong></p>
                    <p className="mb-1"><span className="text-muted">Distancia prom.:</span> <strong>{calc.avgDist} m</strong></p>
                    <p className="mb-1"><span className="text-muted">Switch:</span> <strong className="text-primary">{calc.switchObj.name}</strong></p>
                    <p className="mb-0"><span className="text-muted">Puertos PoE:</span> {calc.switchObj.poePorts} ({calc.switchObj.uplinkPorts})</p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-1"><span className="text-muted">Presupuesto:</span> <span className="text-success">{calc.switchObj.watts} W</span></p>
                    <p className="mb-1"><span className="text-muted">Uso:</span> {calc.switchObj.type}</p>
                    <p className="mb-1"><span className="text-muted">Alcance:</span> {calc.switchObj.distConv}m / {calc.switchObj.distExt}m Ext.</p>
                    <p className="mb-0"><span className="text-muted">Precio:</span> <strong>{fmt(calc.switchObj.price)}</strong></p>
                  </Col>
                </Row>
              )}
              <Alert variant="primary" className="small mb-0">
                <div className="fw-semibold mb-1">⚠️ Motivo de la recomendación:</div>
                <p className="mb-1 small">
                  La distancia promedio calculada es <strong>{calc.avgDist} m</strong>, superando el límite estándar de 90–100 m para enlaces Ethernet/PoE en Cat 5e/6.
                </p>
                <p className="mb-1 small">
                  <strong>Recomendación:</strong> Instalar un <em>{calc.switchObj?.name}</em> como <strong>switch PoE intermedio</strong> antes de alcanzar los 90 m.
                  El tramo de red queda dividido en dos segmentos con señal regenerada para las <strong>{cams} cámaras</strong>.
                </p>
                <p className="mb-0 font-monospace text-muted small">
                  Esquema: [Grabador / NVR] ──► [Switch PoE Intermedio] ──► [Cámaras]
                </p>
              </Alert>
            </Card.Body>
          </Card>
        )}

        {/* DESGLOSE DE COSTOS */}
        <Card className="bg-light border-0">
          <Card.Body>
            <h6 className="border-bottom pb-2 mb-3">💰 Desglose detallado del costo</h6>

            {/* MATERIALES */}
            <div className="small text-uppercase text-info fw-bold mb-2">📦 Materiales</div>
            <div className="d-flex justify-content-between mb-1 small">
              <span>{calc.video.name} ({calc.routeMeters}m × {fmt(calc.video.price)}):</span>
              <strong>{fmt(calc.videoCost)}</strong>
            </div>
            {calc.cfg.power && (
              <div className="d-flex justify-content-between mb-1 small">
                <span>{calc.power.name} ({calc.routeMeters}m × {fmt(calc.power.price)}):</span>
                <strong>{fmt(calc.powerCost)}</strong>
              </div>
            )}
            <div className="d-flex justify-content-between mb-2 small">
              <span>Ductería — {calc.sizing.groupLabel} ({calc.sizing.totalUnits} und):</span>
              <strong>{fmt(calc.ductCost)}</strong>
            </div>

            {/* ACCESORIOS */}
            {calc.accessoryDetails.length > 0 && (
              <>
                <div className="small text-uppercase text-warning fw-bold mb-2">🔧 Accesorios</div>
                {calc.accessoryDetails.map((acc, i) => (
                  <div key={i} className="d-flex justify-content-between mb-1 small">
                    <span>{acc.name} ({acc.qty} uds × {fmt(acc.unitPrice)}):</span>
                    <strong>{fmt(acc.total)}</strong>
                  </div>
                ))}
                <div className="d-flex justify-content-between mb-2 small border-top pt-1">
                  <span className="fw-semibold">Subtotal accesorios:</span>
                  <strong className="text-warning">{fmt(calc.accessoriesTotal)}</strong>
                </div>
              </>
            )}

            {/* MANO DE OBRA */}
            <div className="small text-uppercase text-success fw-bold mb-2">👷 Mano de obra y recargos</div>
            <div className="d-flex justify-content-between mb-1 small">
              <span>Instalación ({cams} pts × {fmt(calc.avgLaborRate)} prom.):</span>
              <strong>{fmt(calc.laborCost)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1 small">
              <span>Recargo altura ({calc.extraHeight.toFixed(1)}m extra):</span>
              <strong className="text-info">{fmt(calc.heightSurcharge)}</strong>
            </div>
            <div className="d-flex justify-content-between mb-2 small">
              <span>Recargo distancia ({calc.extraDist.toFixed(1)}m extra):</span>
              <strong className="text-primary">{fmt(calc.distSurcharge)}</strong>
            </div>

            {/* SWITCH PoE */}
            {calc.switchObj && (
              <div className="d-flex justify-content-between mb-2 small border-top pt-1">
                <span>Switch PoE Intermedio: {calc.switchObj.name}</span>
                <strong>{fmt(calc.switchCost)}</strong>
              </div>
            )}

            {/* PRECIO POR PUNTO */}
            <div className="d-flex justify-content-between align-items-center bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded px-3 py-2 mt-3 mb-2">
              <div>
                <div className="fw-bold">💵 Precio final por punto</div>
                <small className="text-muted">
                  {fmt(calc.avgLaborRate)} base + {fmt(calc.totalSurcharges / cams)} recargos
                </small>
              </div>
              <strong className="text-warning fs-5">{fmt(calc.pricePerPointTotal)} /pto</strong>
            </div>

            {/* AVISO DE RANGO */}
            {calc.extraHeight === 0 && calc.extraDist === 0 ? (
              <Alert variant="success" className="small py-2 mb-2">
                <strong>✓ Mano de obra base:</strong> {fmt(calc.avgLaborRate)}/punto (promedio ponderado por diámetro).
                Altura dentro de 0–3 m y distancia promedio dentro de 0–10 m. No se aplican recargos.
              </Alert>
            ) : (
              <Alert variant="warning" className="small py-2 mb-2">
                <strong>➕ Recargos aplicados:</strong>
                {calc.extraHeight > 0 && <> altura: {calc.extraHeight.toFixed(1)}m extra</>}
                {calc.extraHeight > 0 && calc.extraDist > 0 && <> · </>}
                {calc.extraDist > 0 && <> distancia: {calc.extraDist.toFixed(1)}m extra</>}.
                {' '}La ductería ({calc.sizing.groupLabel}) se cobra aparte como material.
              </Alert>
            )}

            {/* NOTA */}
            <div className="small text-muted mb-2 fst-italic">
              ℹ️ {calc.cfg.note}
            </div>

            {/* TOTAL */}
            <div className="d-flex justify-content-between mt-3 pt-2 border-top fw-bold fs-4 text-primary">
              <span>TOTAL ESTIMADO:</span>
              <span>{fmt(calc.total)}</span>
            </div>

            <Alert variant="secondary" className="small mt-3 mb-0">
              <strong>⚠️ Importante:</strong> El metraje es una estimación y no sustituye la medición en obra.
              La ductería se asigna automáticamente según la cantidad de cámaras. Para conexiones con energía
              independiente, la calculadora supone que el cable sigue el mismo recorrido que el de video/datos.
            </Alert>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer className="flex-wrap gap-2">
        <Button variant="secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="outline-primary" onClick={handleDownloadQuote}>
          <Download size={16} className="me-1" /> Descargar Cotización (.txt)
        </Button>
        <Button variant="success" onClick={handleAddToQuote}>
          <PlusCircle size={16} className="me-1" /> Agregar a Cotización
        </Button>
      </Modal.Footer>
    </Modal>
  );
}