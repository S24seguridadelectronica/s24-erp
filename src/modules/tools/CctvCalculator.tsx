import { useState, useMemo, useEffect } from 'react';
import { Card, Row, Col, Form, Table, Button, Alert } from 'react-bootstrap';
import { Calculator, Download, Info } from 'lucide-react';

// ============================================================
// 1. CATÁLOGOS Y CONSTANTES
// ============================================================
const CATALOG = {
  utp: [
    { value: "700|UTP Cat 5e Aleación Interior", label: "UTP Cat 5e Aleación Interior - $700/m" },
    { value: "900|UTP Cat 5e Aleación Exterior", label: "UTP Cat 5e Aleación Exterior - $900/m" },
    { value: "1000|UTP Cat 5e Siamés Interior", label: "UTP Cat 5e Siamés Interior - $1.000/m" },
    { value: "1200|UTP Cat 5e 100% Cobre Interior", label: "UTP Cat 5e 100% Cobre Interior - $1.200/m" },
    { value: "1500|UTP Cat 5e 100% Cobre Exterior", label: "UTP Cat 5e 100% Cobre Exterior - $1.500/m" },
    { value: "1800|UTP Cat 6 CCA", label: "UTP Cat 6 CCA - $1.800/m" },
    { value: "2200|UTP Cat 6 100% Cobre", label: "UTP Cat 6 100% Cobre - $2.200/m" },
    { value: "2600|UTP Cat 6A 100% Cobre", label: "UTP Cat 6A 100% Cobre - $2.600/m" },
    { value: "3200|UTP Cat 7", label: "UTP Cat 7 - $3.200/m" },
    { value: "4200|UTP Cat 8", label: "UTP Cat 8 - $4.200/m" }
  ],
  duplex: [
    { value: "1100|Cable Dúplex 2x22", label: "Cable Dúplex 2x22 - $1.100/m" },
    { value: "1600|Cable Dúplex 2x20", label: "Cable Dúplex 2x20 - $1.600/m" },
    { value: "2200|Cable Dúplex 2x18", label: "Cable Dúplex 2x18 - $2.200/m" },
    { value: "3000|Cable Dúplex 2x16", label: "Cable Dúplex 2x16 - $3.000/m" },
    { value: "4200|Cable Dúplex 2x14", label: "Cable Dúplex 2x14 - $4.200/m" }
  ],
  coax: [{ value: "2500|Coaxial RG59", label: "Coaxial RG59 - $2.500/m" }]
};

const DUCT: Record<string, any> = {
  canaleta_20x10: { name: "Canaleta 20x10 mm", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 8500, laborRate: 60000, heightRate: 10000, distRate: 1500 },
  canaleta_30x15: { name: "Canaleta 30x15 mm", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 12000, laborRate: 65000, heightRate: 11000, distRate: 1600 },
  canaleta_40x20: { name: "Canaleta 40x20 mm", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 18000, laborRate: 70000, heightRate: 12000, distRate: 1700 },
  canaleta_50x25: { name: "Canaleta 50x25 mm", unit: "tramo de 2 m", unitLength: 2, pricePerUnit: 26000, laborRate: 75000, heightRate: 13000, distRate: 1800 },
  tubo_pvc_12:  { name: 'Tubo PVC 1/2"',  unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 5400,  laborRate: 75000,  heightRate: 15000, distRate: 2000, accessoryType: 'pvc' },
  tubo_pvc_34:  { name: 'Tubo PVC 3/4"',  unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 8200,  laborRate: 80000,  heightRate: 16000, distRate: 2200, accessoryType: 'pvc' },
  tubo_pvc_1:   { name: 'Tubo PVC 1"',    unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 12000, laborRate: 85000,  heightRate: 17000, distRate: 2400, accessoryType: 'pvc' },
  tubo_pvc_112: { name: 'Tubo PVC 1 1/2"', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 19000, laborRate: 95000, heightRate: 19000, distRate: 2800, accessoryType: 'pvc' },
  tubo_pvc_2:   { name: 'Tubo PVC 2"',    unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 28000, laborRate: 110000, heightRate: 22000, distRate: 3200, accessoryType: 'pvc' },
  tubo_mt_12:  { name: 'Tubo MT 1/2"',  unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 15000, laborRate: 90000,  heightRate: 20000, distRate: 2500, accessoryType: 'mt' },
  tubo_mt_34:  { name: 'Tubo MT 3/4"',  unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 22000, laborRate: 95000,  heightRate: 22000, distRate: 2800, accessoryType: 'mt' },
  tubo_mt_1:   { name: 'Tubo MT 1"',    unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 32000, laborRate: 100000, heightRate: 25000, distRate: 3000, accessoryType: 'mt' },
  tubo_mt_112: { name: 'Tubo MT 1 1/2"', unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 48000, laborRate: 115000, heightRate: 28000, distRate: 3400, accessoryType: 'mt' },
  tubo_mt_2:   { name: 'Tubo MT 2"',    unit: "tubo de 3 m", unitLength: 3, pricePerUnit: 70000, laborRate: 130000, heightRate: 32000, distRate: 3800, accessoryType: 'mt' }
};

const SIZING = {
  tuberia: {
    unitLength: 3,
    tiers: [
      { max: 5,  parts: [['d12', 100]] },
      { max: 8,  parts: [['d12', 50], ['d34', 50]] },
      { max: 16, parts: [['d12', 30], ['d34', 30], ['d1', 40]] },
      { max: 32, parts: [['d12', 20], ['d34', 30], ['d1', 20], ['d112', 30]] }
    ],
    progressiveAnchors: [
      { cams: 32,  parts: [['d12', 20], ['d34', 30], ['d1', 20], ['d112', 30], ['d2', 0]] },
      { cams: 48,  parts: [['d12', 10], ['d34', 25], ['d1', 25], ['d112', 30], ['d2', 10]] },
      { cams: 64,  parts: [['d12', 5],  ['d34', 20], ['d1', 25], ['d112', 30], ['d2', 20]] },
      { cams: 96,  parts: [['d12', 0],  ['d34', 15], ['d1', 25], ['d112', 30], ['d2', 30]] },
      { cams: 128, parts: [['d12', 0],  ['d34', 10], ['d1', 20], ['d112', 30], ['d2', 40]] }
    ]
  },
  canaleta: {
    unitLength: 2,
    tiers: [
      { max: 5,  parts: [['p', 100]] },
      { max: 8,  parts: [['p', 50], ['m', 50]] },
      { max: 16, parts: [['p', 30], ['m', 30], ['g', 40]] },
      { max: 32, parts: [['p', 20], ['m', 30], ['g', 20], ['x', 30]] }
    ],
    progressiveAnchors: [
      { cams: 32,  parts: [['p', 20], ['m', 30], ['g', 20], ['x', 30]] },
      { cams: 48,  parts: [['p', 10], ['m', 25], ['g', 25], ['x', 40]] },
      { cams: 64,  parts: [['p', 5],  ['m', 20], ['g', 25], ['x', 50]] },
      { cams: 96,  parts: [['p', 0],  ['m', 15], ['g', 25], ['x', 60]] },
      { cams: 128, parts: [['p', 0],  ['m', 10], ['g', 20], ['x', 70]] }
    ]
  }
};

const SIZING_MAP: Record<string, any> = {
  pvc:      { type: 'tuberia',  label: 'Tubo PVC',  keys: { d12: 'tubo_pvc_12', d34: 'tubo_pvc_34', d1: 'tubo_pvc_1', d112: 'tubo_pvc_112', d2: 'tubo_pvc_2' } },
  mt:       { type: 'tuberia',  label: 'Tubo MT',   keys: { d12: 'tubo_mt_12',  d34: 'tubo_mt_34',  d1: 'tubo_mt_1',  d112: 'tubo_mt_112',  d2: 'tubo_mt_2' } },
  canaleta: { type: 'canaleta', label: 'Canaleta',  keys: { p: 'canaleta_20x10', m: 'canaleta_30x15', g: 'canaleta_40x20', x: 'canaleta_50x25' } }
};

const ACCESSORIES: Record<string, any> = {
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

const POE_SWITCHES = [
  { id: "poe_4",  name: "Switch PoE 4 puertos + 2 Uplink", poePorts: 4,  watts: 60,  distConv: 100, distExt: 250, price: 180000, type: "Intermedio / Acceso local" },
  { id: "poe_8",  name: "Switch PoE 8 puertos + 2 Uplink", poePorts: 8,  watts: 120, distConv: 100, distExt: 250, price: 320000, type: "Intermedio / Distribución" },
  { id: "poe_16", name: "Switch PoE 16 puertos + 2 SFP", poePorts: 16, watts: 200, distConv: 100, distExt: 250, price: 650000, type: "Intermedio / Core Zonal" },
  { id: "poe_24", name: "Switch PoE 24 puertos + 2 SFP", poePorts: 24, watts: 370, distConv: 100, distExt: 250, price: 980000, type: "Principal / Alta densidad" },
  { id: "poe_48", name: "Switch PoE 48 puertos + 4 SFP+", poePorts: 48, watts: 500, distConv: 100, distExt: 250, price: 1850000, type: "Principal / Rack Central" }
];

const CONNECTIONS: Record<string, any> = {
  analog_utp_siamese: { videoTitle: "UTP de video + energía", videoCatalog: "utp", power: false, note: "Un solo cable UTP por cámara (video y alimentación)." },
  analog_utp_duplex:  { videoTitle: "UTP de video + Dúplex", videoCatalog: "utp", power: true,  note: "UTP para video y cable dúplex independiente para energía." },
  analog_coax_duplex: { videoTitle: "Coaxial RG59 + Dúplex", videoCatalog: "coax", power: true,  note: "Coaxial RG59 para video y cable dúplex independiente para energía." },
  ip_poe:             { videoTitle: "UTP Ethernet / PoE", videoCatalog: "utp", power: false, note: "Un solo UTP por cámara. Transporta datos y energía PoE." },
  ip_utp_duplex:      { videoTitle: "UTP Ethernet + Dúplex", videoCatalog: "utp", power: true,  note: "UTP para datos y cable dúplex independiente para energía." }
};

// ============================================================
// 2. HELPERS DE CÁLCULO
// ============================================================
const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format;
const ceilUnits = (m: number, u: number) => Math.ceil(Math.max(0, m) / u);
const parseCable = (str: string) => { const [p, n] = (str || '0|Cable').split('|'); return { price: +p || 0, name: n || 'Cable' }; };
const unitLabel = (duct: any, qty: number) => qty === 1 ? duct.unit : duct.unit.replace('tubo de', 'tubos de').replace('tramo de', 'tramos de');

function getRecommendedPower(cams: number, dist: number) {
  if (cams <= 4) return dist <= 25 ? "1100|Cable Dúplex 2x22" : "1600|Cable Dúplex 2x20";
  if (cams <= 8) return dist <= 20 ? "1600|Cable Dúplex 2x20" : dist <= 40 ? "2200|Cable Dúplex 2x18" : "3000|Cable Dúplex 2x16";
  if (cams <= 16) return dist <= 20 ? "2200|Cable Dúplex 2x18" : dist <= 40 ? "3000|Cable Dúplex 2x16" : "4200|Cable Dúplex 2x14";
  return dist <= 20 ? "3000|Cable Dúplex 2x16" : "4200|Cable Dúplex 2x14";
}

function getAutoPoeId(cams: number) {
  return cams <= 4 ? "poe_4" : cams <= 8 ? "poe_8" : cams <= 16 ? "poe_16" : cams <= 24 ? "poe_24" : "poe_48";
}

function getDuctGroup(ductKey: string) {
  if (ductKey.startsWith('canaleta')) return 'canaleta';
  if (ductKey.startsWith('tubo_pvc')) return 'pvc';
  return 'mt';
}

function interpolateProgressive(anchors: any[], cams: number) {
  const keys = [...new Set(anchors.flatMap((a: any) => a.parts.map((p: any) => p[0])))];
  let prev = anchors[0], next = anchors[anchors.length - 1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (cams >= anchors[i].cams && cams <= anchors[i + 1].cams) { prev = anchors[i]; next = anchors[i + 1]; break; }
  }
  const t = next.cams === prev.cams ? 0 : (cams - prev.cams) / (next.cams - prev.cams);
  let parts = keys.map((k: any) => {
    const pv = (prev.parts.find((p: any) => p[0] === k) || [k, 0])[1];
    const nv = (next.parts.find((p: any) => p[0] === k) || [k, 0])[1];
    return [k, Math.round(pv + (nv - pv) * t)];
  });
  let diff = 100 - parts.reduce((a: number, p: any) => a + p[1], 0);
  let guard = 0;
  while (diff !== 0 && guard++ < 200) {
    const idx = parts.reduce((best: number, p: any, i: number) => (p[1] >= parts[best][1] ? i : best), 0);
    const step = diff > 0 ? 1 : -1;
    if (parts[idx][1] + step < 0) { parts[idx][1] = 0; diff -= step; continue; }
    parts[idx][1] += step;
    diff -= step;
  }
  return parts;
}

function calcularDimensionamiento(cantidadCamaras: number, metrosCanalizacion: number, tipoCanalizacion: string) {
  const map = SIZING_MAP[tipoCanalizacion] || SIZING_MAP.pvc;
  const conf = SIZING[map.type];
  const total = Math.max(0, Math.round(metrosCanalizacion));
  const cams = Math.max(1, Math.round(cantidadCamaras));

  let parts: any[], estimated = false;
  const tier = conf.tiers.find((t: any) => cams <= t.max);
  if (tier) parts = tier.parts;
  else { estimated = true; parts = interpolateProgressive(conf.progressiveAnchors, cams); }

  parts = parts.filter((p: any) => p[1] > 0);
  let meters = parts.map((p: any) => Math.round(total * p[1] / 100));
  let diff = total - meters.reduce((a: number, b: number) => a + b, 0);
  if (diff !== 0 && meters.length > 0) {
    let guard = 0;
    const order = parts.map((p: any, i: number) => i).sort((a: number, b: number) => parts[b][1] - parts[a][1]);
    while (diff !== 0 && guard++ < 500) {
      let applied = false;
      for (const i of order) {
        const step = diff > 0 ? 1 : -1;
        if (meters[i] + step >= 0) { meters[i] += step; diff -= step; applied = true; break; }
      }
      if (!applied) break;
    }
  }

  const segments = parts.map((p: any, i: number) => {
    const duct = DUCT[map.keys[p[0]]];
    return duct ? { sizeKey: p[0], pct: p[1], meters: meters[i], units: ceilUnits(meters[i], duct.unitLength), duct, ductKey: map.keys[p[0]] } : null;
  }).filter(Boolean);

  return {
    group: tipoCanalizacion, groupLabel: map.label, unitLength: conf.unitLength, estimated, segments,
    totalMeters: meters.reduce((a: number, b: number) => a + b, 0),
    totalUnits: segments.reduce((a: number, s: any) => a + s.units, 0)
  };
}

// ============================================================
// 3. COMPONENTE REACT
// ============================================================
export function CctvCalculator() {
  const [sideA, setSideA] = useState(25);
  const [sideB, setSideB] = useState(30);
  const [cams, setCams] = useState(8);
  const [height, setHeight] = useState(3);
  const [duct, setDuct] = useState('tubo_pvc_12');
  const [connection, setConnection] = useState('ip_poe');
  const [videoCable, setVideoCable] = useState('');
  const [powerCable, setPowerCable] = useState('');
  const [poeSwitch, setPoeSwitch] = useState('');

  useEffect(() => {
    const cfg = CONNECTIONS[connection];
    setVideoCable(CATALOG[cfg.videoCatalog][0].value);
    const recPower = getRecommendedPower(cams, 0);
    setPowerCable(recPower);
    setPoeSwitch(getAutoPoeId(cams));
  }, [connection, cams]);

  const calc = useMemo(() => {
    const cfg = CONNECTIONS[connection];
    const video = parseCable(videoCable);
    const power = parseCable(powerCable);
    const ductInfo = DUCT[duct];

    const routeMeters = Math.ceil((Math.max(sideA, sideB) / 2) * cams + sideA + sideB + height * cams);
    const avgDistExact = routeMeters / cams;
    const avgDist = Math.round(avgDistExact);

    const extraHeight = Math.max(0, height - 3);
    const extraDist = Math.max(0, avgDistExact - 10);
    const heightSurcharge = extraHeight * ductInfo.heightRate * cams;
    const distSurcharge = extraDist * ductInfo.distRate * cams;

    const ductGroup = getDuctGroup(duct);
    const sizing = calcularDimensionamiento(cams, routeMeters, ductGroup);
    const ductCost = sizing.segments.reduce((a: number, s: any) => a + s.units * s.duct.pricePerUnit, 0);

    const avgLaborRate = routeMeters > 0 ? sizing.segments.reduce((a: number, s: any) => a + s.duct.laborRate * s.meters, 0) / routeMeters : ductInfo.laborRate;

    const accMap = new Map();
    let accessoriesTotal = 0;
    sizing.segments.forEach((s: any) => {
      const accType = s.duct.accessoryType;
      if (!accType || !ACCESSORIES[accType]) return;
      Object.entries(ACCESSORIES[accType]).forEach(([key, acc]: [string, any]) => {
        const qty = s.units * acc.factorPerTube;
        const variable = !!acc.prices;
        const unitPrice = variable ? (acc.prices[s.sizeKey] ?? 0) : acc.price;
        const cost = qty * unitPrice;
        const mapKey = variable ? `${accType}:${key}:${s.sizeKey}` : `${accType}:${key}`;
        const existing = accMap.get(mapKey);
        if (existing) { existing.qty += qty; existing.total += cost; }
        else accMap.set(mapKey, { name: variable ? `${acc.name} para ${s.duct.name}` : acc.name, qty, unitPrice, total: cost });
        accessoriesTotal += cost;
      });
    });
    const accessoryDetails = [...accMap.values()];

    const videoCost = routeMeters * video.price;
    const powerCost = cfg.power ? routeMeters * power.price : 0;
    const laborCost = cams * avgLaborRate;

    let switchCost = 0, switchObj: any = null;
    if (connection === 'ip_poe' && avgDist > 90) {
      switchObj = POE_SWITCHES.find((s: any) => s.id === poeSwitch) || POE_SWITCHES[0];
      switchCost = switchObj.price;
    }

    const total = videoCost + powerCost + ductCost + accessoriesTotal + laborCost + heightSurcharge + distSurcharge + switchCost;
    const physicalMeters = cfg.power ? routeMeters * 2 : routeMeters;

    return {
      routeMeters, avgDist, avgDistExact, extraHeight, extraDist,
      heightSurcharge, distSurcharge, totalSurcharges: heightSurcharge + distSurcharge,
      ductCost, videoCost, powerCost, laborCost, avgLaborRate, switchCost, switchObj,
      total, physicalMeters, video, power, cfg, ductInfo, sizing, ductGroup, accessoryDetails, accessoriesTotal
    };
  }, [sideA, sideB, cams, height, duct, connection, videoCable, powerCable, poeSwitch]);

  const handleDownload = () => {
    const c = calc;
    const now = new Date();
    const fecha = now.toLocaleDateString('es-CO');
    const ductLines = c.sizing.segments.map((s: any) => `  • ${s.duct.name}: ${s.pct}% = ${s.meters} m = ${s.units} ${unitLabel(s.duct, s.units)} x ${fmt(s.duct.pricePerUnit)}`).join('\n');
    const accLines = c.accessoryDetails.length > 0 ? c.accessoryDetails.map((a: any) => `  • ${a.name}: ${a.qty} uds x ${fmt(a.unitPrice)} = ${fmt(a.total)}`).join('\n') : '';
    const switchLine = c.switchObj ? `\nSwitch PoE Intermedio: ${c.switchObj.name} = ${fmt(c.switchCost)}` : '';

    const content = `═══════════════════════════════════════════════════════
  COTIZACIÓN S24 - INSTALACIÓN CCTV
  Fecha: ${fecha}
═══════════════════════════════════════════════════════

📍 DATOS DE LA INSTALACIÓN
  Lado 1: ${sideA} m | Lado 2: ${sideB} m
  Cámaras: ${cams} | Altura promedio: ${height} m
  Distancia promedio: ${c.avgDist} m | Metros de recorrido: ${c.routeMeters} m
  Canalización: ${c.sizing.groupLabel} (Dimensionamiento automático)
  Tipo de conexión: ${c.cfg.videoTitle}

📐 DIMENSIONAMIENTO DE CANALIZACIÓN
${ductLines}
  Subtotal ductería: ${fmt(c.ductCost)}

📦 MATERIALES
  ${c.video.name}: ${c.routeMeters} m x ${fmt(c.video.price)}/m = ${fmt(c.videoCost)}
  ${c.cfg.power ? `${c.power.name}: ${c.routeMeters} m x ${fmt(c.power.price)}/m = ${fmt(c.powerCost)}` : '(Sin cable de energía independiente)'}
${accLines ? `\n🔧 ACCESORIOS DE INSTALACIÓN\n${accLines}\n  Subtotal accesorios: ${fmt(c.accessoriesTotal)}` : ''}
${switchLine}

💰 MANO DE OBRA Y RECARGOS
  Instalación: ${cams} pts x ${fmt(c.avgLaborRate)} (promedio) = ${fmt(c.laborCost)}
  Recargo altura: ${fmt(c.heightSurcharge)}
  Recargo distancia: ${fmt(c.distSurcharge)}
═══════════════════════════════════════════════════════
  TOTAL ESTIMADO: ${fmt(c.total)}
═══════════════════════════════════════════════════════
Nota: Esta cotización es una estimación y no sustituye la medición en obra.
Generado por Calculadora S24.`;

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
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Calculator size={28} className="me-2" />Calculadora de Instalación CCTV</h2>
          <p className="text-muted mb-0">Dimensionamiento automático de materiales, accesorios y mano de obra</p>
        </div>
        <Button variant="success" onClick={handleDownload}>
          <Download size={18} className="me-2" /> Descargar Cotización
        </Button>
      </div>

      <Row className="g-4">
        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-primary bg-opacity-10"><h6 className="mb-0 text-primary">1. Datos de la instalación</h6></Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}><Form.Group><Form.Label>Lado 1 (m)</Form.Label><Form.Control type="number" value={sideA} onChange={(e) => setSideA(Number(e.target.value))} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>Lado 2 (m)</Form.Label><Form.Control type="number" value={sideB} onChange={(e) => setSideB(Number(e.target.value))} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>Cantidad de cámaras</Form.Label><Form.Control type="number" value={cams} onChange={(e) => setCams(Number(e.target.value))} /></Form.Group></Col>
                <Col md={6}><Form.Group><Form.Label>Altura promedio (m)</Form.Label><Form.Control type="number" step="0.5" value={height} onChange={(e) => setHeight(Number(e.target.value))} /></Form.Group></Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-primary bg-opacity-10"><h6 className="mb-0 text-primary">2. Tipo de conexión</h6></Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Conexión</Form.Label>
                <Form.Select value={connection} onChange={(e) => setConnection(e.target.value)}>
                  {Object.entries(CONNECTIONS).map(([key, val]: any) => <option key={key} value={key}>{val.videoTitle}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Cable de video/datos</Form.Label>
                <Form.Select value={videoCable} onChange={(e) => setVideoCable(e.target.value)}>
                  {CATALOG[CONNECTIONS[connection].videoCatalog].map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Form.Select>
              </Form.Group>
              {CONNECTIONS[connection].power && (
                <Form.Group>
                  <Form.Label>Cable de energía</Form.Label>
                  <Form.Select value={powerCable} onChange={(e) => setPowerCable(e.target.value)}>
                    {CATALOG.duplex.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-primary bg-opacity-10"><h6 className="mb-0 text-primary">3. Canalización</h6></Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label>Tipo de ducto (el diámetro se calcula auto. según cámaras)</Form.Label>
                <Form.Select value={duct} onChange={(e) => setDuct(e.target.value)}>
                  <optgroup label="Canaleta">
                    <option value="canaleta_20x10">Canaleta 20x10 mm — $8.500 tramo 2m / punto base $60.000</option>
                    <option value="canaleta_30x15">Canaleta 30x15 mm — $12.000 tramo 2m / punto base $65.000</option>
                    <option value="canaleta_40x20">Canaleta 40x20 mm — $18.000 tramo 2m / punto base $70.000</option>
                    <option value="canaleta_50x25">Canaleta 50x25 mm — $26.000 tramo 2m / punto base $75.000</option>
                  </optgroup>
                  <optgroup label="Tubo PVC">
                    <option value="tubo_pvc_12">Tubo PVC 1/2" — $5.400 tubo 3m / punto base $75.000</option>
                    <option value="tubo_pvc_34">Tubo PVC 3/4" — $8.200 tubo 3m / punto base $80.000</option>
                    <option value="tubo_pvc_1">Tubo PVC 1" — $12.000 tubo 3m / punto base $85.000</option>
                    <option value="tubo_pvc_112">Tubo PVC 1 1/2" — $19.000 tubo 3m / punto base $95.000</option>
                    <option value="tubo_pvc_2">Tubo PVC 2" — $28.000 tubo 3m / punto base $110.000</option>
                  </optgroup>
                  <optgroup label="Tubo Metálico (MT)">
                    <option value="tubo_mt_12">Tubo MT 1/2" — $15.000 tubo 3m / punto base $90.000</option>
                    <option value="tubo_mt_34">Tubo MT 3/4" — $22.000 tubo 3m / punto base $95.000</option>
                    <option value="tubo_mt_1">Tubo MT 1" — $32.000 tubo 3m / punto base $100.000</option>
                    <option value="tubo_mt_112">Tubo MT 1 1/2" — $48.000 tubo 3m / punto base $115.000</option>
                    <option value="tubo_mt_2">Tubo MT 2" — $70.000 tubo 3m / punto base $130.000</option>
                  </optgroup>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-success bg-opacity-10"><h6 className="mb-0 text-success">Resultados Rápidos</h6></Card.Header>
            <Card.Body>
              <Row className="text-center g-3">
                <Col md={2}><div className="p-2 bg-light rounded"><div className="small text-muted">Metros recorrido</div><div className="fs-5 fw-bold text-primary">{calc.routeMeters} m</div></div></Col>
                <Col md={2}><div className="p-2 bg-light rounded"><div className="small text-muted">Dist. promedio</div><div className="fs-5 fw-bold text-info">{calc.avgDist} m</div></div></Col>
                <Col md={2}><div className="p-2 bg-light rounded"><div className="small text-muted">Puntos</div><div className="fs-5 fw-bold text-success">{cams}</div></div></Col>
                <Col md={2}><div className="p-2 bg-light rounded"><div className="small text-muted">Metros cable</div><div className="fs-5 fw-bold text-info">{calc.physicalMeters} m</div></div></Col>
                <Col md={2}><div className="p-2 bg-light rounded"><div className="small text-muted">Recargos</div><div className="fs-5 fw-bold text-warning">{calc.totalSurcharges > 0 ? fmt(calc.totalSurcharges) : 'Ninguno'}</div></div></Col>
                <Col md={2}><div className="p-2 bg-light rounded"><div className="small text-muted">Precio/pto</div><div className="fs-5 fw-bold text-warning">{fmt(calc.avgLaborRate + (calc.totalSurcharges / cams))}</div></div></Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-info bg-opacity-10"><h6 className="mb-0 text-info">Dimensionamiento de Canalización ({cams} cámaras)</h6></Card.Header>
            <Card.Body className="p-0">
              <Table responsive className="mb-0">
                <thead className="bg-light"><tr><th className="ps-4">Canalización</th><th>Distribución</th><th>Metros</th><th className="text-end pe-4">Compra</th></tr></thead>
                <tbody>
                  {calc.sizing.segments.map((s: any, i: number) => (
                    <tr key={i}><td className="ps-4">{s.duct.name}</td><td>{s.pct}%</td><td>{s.meters} m</td><td className="text-end pe-4 fw-bold text-success">{s.units} {unitLabel(s.duct, s.units)}</td></tr>
                  ))}
                </tbody>
                <tfoot className="bg-light fw-bold">
                  <tr><td className="ps-4">Total</td><td>100%</td><td>{calc.sizing.totalMeters} m</td><td className="text-end pe-4 text-warning">{calc.sizing.totalUnits} unidades</td></tr>
                </tfoot>
              </Table>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-warning bg-opacity-10"><h6 className="mb-0 text-warning">Desglose Detallado del Costo</h6></Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">📦 Materiales</h6>
                  <div className="d-flex justify-content-between mb-2"><span>{calc.video.name} ({calc.routeMeters}m x {fmt(calc.video.price)}):</span><strong>{fmt(calc.videoCost)}</strong></div>
                  {calc.cfg.power && <div className="d-flex justify-content-between mb-2"><span>{calc.power.name} ({calc.routeMeters}m x {fmt(calc.power.price)}):</span><strong>{fmt(calc.powerCost)}</strong></div>}
                  <div className="d-flex justify-content-between mb-2"><span>Ductería ({calc.sizing.groupLabel}):</span><strong>{fmt(calc.ductCost)}</strong></div>
                  {calc.accessoryDetails.length > 0 && (
                    <>
                      <div className="text-muted small mb-1">Accesorios:</div>
                      {calc.accessoryDetails.map((acc: any, i: number) => (
                        <div key={i} className="d-flex justify-content-between small text-muted ms-3 mb-1">
                          <span>{acc.name} ({acc.qty} x {fmt(acc.unitPrice)}):</span><span>{fmt(acc.total)}</span>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between mb-2 fw-bold"><span>Subtotal accesorios:</span><span>{fmt(calc.accessoriesTotal)}</span></div>
                    </>
                  )}
                </Col>
                <Col md={6}>
                  <h6 className="text-primary border-bottom pb-2">👷 Mano de Obra y Recargos</h6>
                  <div className="d-flex justify-content-between mb-2"><span>Instalación ({cams} pts x {fmt(calc.avgLaborRate)}):</span><strong>{fmt(calc.laborCost)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Recargo por altura:</span><strong className="text-info">{fmt(calc.heightSurcharge)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span>Recargo por distancia:</span><strong className="text-info">{fmt(calc.distSurcharge)}</strong></div>
                  {calc.switchObj && (
                    <div className="d-flex justify-content-between mb-2"><span>Switch PoE Intermedio ({calc.switchObj.name}):</span><strong>{fmt(calc.switchCost)}</strong></div>
                  )}
                  <div className="d-flex justify-content-between mt-3 pt-3 border-top fw-bold fs-5 text-warning">
                    <span>TOTAL ESTIMADO:</span><span>{fmt(calc.total)}</span>
                  </div>
                </Col>
              </Row>
              <Alert variant="info" className="mt-3 mb-0">
                <Info size={16} className="me-2" />
                <small>El metraje es una estimación. La ductería se cobra aparte de la mano de obra. Para conexiones con energía independiente, se asume el mismo recorrido que el video. Verifique caída de tensión en recorridos largos DC.</small>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
