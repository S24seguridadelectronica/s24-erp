import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Badge, InputGroup } from 'react-bootstrap';
import {
  Calculator, Copy, Wrench, Video, RotateCcw, Settings, Globe, Smartphone, KeyRound,
  HardDrive, Power, PlusCircle, CheckCircle2, ClipboardList, MapPin, Package, Clock3,
  Info, Ruler, ArrowUp, Zap, AlertTriangle, Trash2, Camera, X
} from 'lucide-react';

/* =========================================================================
 * Tipos
 * ========================================================================= */

interface QuoteItem {
  item_type: 'product' | 'service';
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

interface CalcularServiciosProps {
  show: boolean;
  onHide: () => void;
  onAddItems: (items: QuoteItem[]) => void;
}

interface ServiceLine {
  id: string;
  description: string;
  detail: string;
  amount: number;
  itemType: 'service' | 'product';
}

interface MaterialState { selected: boolean; quantity: number; unitPrice: number }
interface DifficultyState { selected: boolean; price: number; text?: string }
interface CatalogItem {
  key: string;
  label: string;
  unit: string;
  defaultQuantity: number;
  defaultPrice: number;
  perCamera?: boolean;
}

interface FaultGroup {
  id: string;
  label: string;
  tasks: Items;
  photo?: string;
}

interface DvrGroup {
  id: string;
  label: string;
  included: boolean;
  distance: string;
  height: string;
  channels: string;
  photo?: string;
  difficulties: Record<string, DifficultyState>;
}

type Items = Record<string, MaterialState>;
type VideoCause = 'balun' | 'power' | 'splice' | 'cable' | 'camera' | 'dvr-channel' | 'unknown';
type Option = [string, string];

/* =========================================================================
 * Catálogos
 * ========================================================================= */

const SERVICES = {
  maintenance:   { icon: Wrench,     label: 'Mantenimiento preventivo',    name: 'Mantenimiento preventivo',            description: 'Revisión, limpieza y pruebas del sistema.' },
  video:         { icon: Video,      label: 'Pérdida de video',            name: 'Atención por pérdida de video',       description: 'Una o varias cámaras no muestran imagen.' },
  reset:         { icon: RotateCcw,  label: 'Reseteo DVR/NVR',             name: 'Reseteo DVR/NVR',                     description: 'Restablecimiento sujeto a compatibilidad.' },
  configuration: { icon: Settings,   label: 'Configuración DVR/NVR',       name: 'Configuración DVR/NVR',               description: 'Ajustes y puesta a punto del grabador.' },
  remote:        { icon: Globe,      label: 'Acceso remoto',               name: 'Configuración de acceso remoto',      description: 'Visualización desde celular o computador.' },
  app:           { icon: Smartphone, label: 'Configuración de aplicación', name: 'Configuración de aplicación',         description: 'Instalación y vinculación de la app.' },
  password:      { icon: KeyRound,   label: 'Contraseña',                  name: 'Cambio o recuperación de contraseña', description: 'Cambio o recuperación según fabricante.' },
  recording:     { icon: HardDrive,  label: 'Revisión de grabaciones',     name: 'Revisión de grabaciones',             description: 'Revisión de configuración y almacenamiento.' },
  power:         { icon: Power,      label: 'Alimentación eléctrica',      name: 'Revisión de alimentación',            description: 'Revisión inicial de fuente y conexiones.' },
  other:         { icon: PlusCircle, label: 'Otro servicio',               name: 'Otro servicio',                       description: 'Requiere descripción y evaluación.' },
};
type ServiceKey = keyof typeof SERVICES;

const PRICE_CONFIG = [
  { key: 'pReset',                label: 'Reseteo DVR/NVR',                                   value: 80000 },
  { key: 'pConfiguration',        label: 'Configuración DVR/NVR',                             value: 100000 },
  { key: 'pRemote',               label: 'Acceso remoto',                                     value: 90000 },
  { key: 'pApp',                  label: 'Configuración de aplicación',                       value: 60000 },
  { key: 'pPassword',             label: 'Cambio / recuperación de contraseña',               value: 70000 },
  { key: 'pRecording',            label: 'Revisión de grabaciones',                           value: 90000 },
  { key: 'pVisit',                label: 'Visita / diagnóstico técnico',                      value: 80000 },
  { key: 'pPower',                label: 'Pérdida de video / alimentación',                   value: 80000 },
  { key: 'pOther',                label: 'Evaluación de otro servicio',                       value: 80000 },
  { key: 'pAccessDistance',       label: 'Accesibilidad cámaras — metro de distancia adicional', value: 1500 },
  { key: 'pAccessHeight',         label: 'Accesibilidad cámaras — metro de altura adicional',    value: 15000 },
  { key: 'pAccessHeightDistance', label: 'Accesibilidad cámaras — penalización por altura sobre la distancia (por metro)', value: 2000 },
  { key: 'pDvrAccessBase',        label: 'Accesibilidad DVR — base (0–10 m / 0–3 m / 0–4 canales)', value: 60000 },
  { key: 'pDvrAccessDistance',    label: 'Accesibilidad DVR — metro de distancia adicional',  value: 1500 },
  { key: 'pDvrAccessHeight',      label: 'Accesibilidad DVR — metro de altura adicional',     value: 15000 },
  { key: 'pDvrExtraChannel',      label: 'Accesibilidad DVR — canal de video adicional (desde el 5.º)', value: 5000 },
  { key: 'pCableDistanceRate',    label: 'Cambio de cableado — metro de distancia adicional', value: 1500 },
  { key: 'pCableHeightRate',      label: 'Cambio de cableado — metro de altura adicional',    value: 15000 },
] as const;

type PriceKey = (typeof PRICE_CONFIG)[number]['key'];
type Prices = Record<PriceKey, number>;
const DEFAULT_PRICES = Object.fromEntries(PRICE_CONFIG.map(p => [p.key, p.value])) as Prices;

const item = (
  key: string, label: string, unit: string, defaultQuantity: number, defaultPrice: number, perCamera?: boolean,
): CatalogItem => ({ key, label, unit, defaultQuantity, defaultPrice, perCamera });

const GLOBAL_TASKS = [
  item('lensAndHousingCleaning', 'Limpieza de lentes y carcaza',                'cámara',  8, 35000, true),
  item('internalDvrCleaning',    'Limpieza interna de DVR/NVR',                 'equipo',  1, 30000),
  item('batteryChange',          'Cambio de batería interna del DVR',           'equipo',  1, 20000),
  item('firmwareUpdate',         'Actualización de firmware',                   'equipo',  1, 40000),
];

const FAULT_TASKS = [
  item('powerSupplyChange',      'Cambio de fuente de alimentación',            'unidad',  1, 45000),
  item('videoBalunChange',       'Cambio de video baluns',                      'par',     1, 45000),
  item('cableChange',            'Cambio de cableado',                          'punto',   1, 50000),
  item('cameraChange',           'Cambio de cámara',                            'unidad',  1, 45000),
  item('junctionBoxChange',      'Cambio de caja de paso',                      'unidad',  1, 15000),
  item('resplice',               'Reempalme de cableado',                       'empalme', 1, 45000),
];

const M = {
  powerSupply: item('powerSupply', 'Fuente de alimentación', 'unidad', 1, 45000),
  videoBalun:  item('videoBalun',  'Video balun',            'par',    1, 25000),
  cable:       item('cable',       'Cable UTP / coaxial',    'metros', 20, 3500),
  camera:      item('camera',      'Cámara de seguridad',    'unidad', 1, 180000),
};

const MAINTENANCE_MATERIALS = [
  M.powerSupply, M.videoBalun, M.cable, M.camera,
  item('junctionBox',   'Caja de paso',             'unidad', 1, 8000),
  item('cr2032Battery', 'Batería interna (CR2032)', 'unidad', 1, 5000),
  item('bncConnector',  'Conector BNC',             'unidad', 1, 3000),
];

const VIDEO_MATERIALS = [
  M.cable, M.powerSupply, M.videoBalun, M.camera,
  item('dvrChannel', 'Reemplazo de canal DVR/NVR', 'unidad', 1, 250000),
];

const VIDEO_CAUSES: { value: VideoCause; label: string; suggested: string[] }[] = [
  { value: 'balun',       label: 'Pérdida de video por cambio de video baluns',  suggested: ['videoBalun'] },
  { value: 'power',       label: 'Pérdida de video por cambio de fuente',         suggested: ['powerSupply'] },
  { value: 'splice',      label: 'Pérdida de video por reempalme del cableado',   suggested: [] },
  { value: 'cable',       label: 'Pérdida de video por cambio de cable',          suggested: ['cable'] },
  { value: 'camera',      label: 'Pérdida de video por cambio de cámara',         suggested: ['camera'] },
  { value: 'dvr-channel', label: 'Canal del DVR/NVR dañado',                      suggested: ['dvrChannel'] },
  { value: 'unknown',     label: 'No se sabe / requiere diagnóstico',             suggested: [] },
];

const AFFECTED: Record<string, { factor: number; option: string; label: string }> = {
  '1':   { factor: 0.75, option: '1 cámara',         label: '1 cámara afectada' },
  '2-4': { factor: 1,    option: '2 a 4 cámaras',    label: '2 a 4 cámaras afectadas' },
  '5-8': { factor: 1.5,  option: '5 a 8 cámaras',    label: '5 a 8 cámaras afectadas' },
  '9+':  { factor: 2,    option: 'Más de 8 cámaras', label: 'Más de 8 cámaras afectadas' },
};

const DIFFICULTIES = [
  { key: 'reversedRack',   label: 'DVR de espaldas en Rack (Baluns atrás)',       price: 15000 },
  { key: 'tangledCables',  label: 'Cableado enredado / cables muy cortos',        price: 20000 },
  { key: 'tightSpace',     label: 'Espacio ultra reducido (No cabe la mano)',     price: 10000 },
  { key: 'dirtyEquipment', label: 'Equipo muy sucio / polvo / pelos de mascota',  price: 8000 },
  { key: 'noWorkspace',    label: 'Sin espacio de trabajo (No hay mesa cerca)',   price: 5000 },
];

const BASE = { distance: 10, height: 3, dvrDistance: 10, dvrHeight: 3, dvrChannels: 4 };
const IVA = 0.19;
const DEVICE_SERVICES = ['maintenance', 'reset', 'configuration', 'remote', 'app', 'password', 'recording'];
const CAUSE_SERVICES = ['power', 'recording'];
const INTERNET_SERVICES = ['remote', 'app'];

const BUNDLE_DISCOUNTS = [
  { min: 2, pct: 15 },
  { min: 3, pct: 30 },
  { min: 4, pct: 45 },
  { min: 5, pct: 60 },
] as const;

/* =========================================================================
 * Helpers
 * ========================================================================= */

const money = (value: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);

const nonNegative = (value: unknown) => Math.max(0, Number(value) || 0);
const excess = (value: number, base: number) => Math.max(0, value - base);
const lineTotal = (m: MaterialState) => m.quantity * m.unitPrice;
const sumSelected = (items: Items) => Object.values(items).reduce((s, m) => (m.selected ? s + lineTotal(m) : s), 0);
const opts = (...values: string[]): Option[] => values.map(v => [v, v]);

const initItems = (defs: CatalogItem[], selected: string[] = []): Items =>
  Object.fromEntries(defs.map(d => [d.key, {
    selected: selected.includes(d.key), quantity: d.defaultQuantity, unitPrice: d.defaultPrice,
  }]));

function useItems(defs: CatalogItem[], selected?: string[]) {
  const [items, setItems] = useState<Items>(() => initItems(defs, selected));
  const patch = useCallback(
    (key: string, p: Partial<MaterialState>) => setItems(prev => ({ ...prev, [key]: { ...prev[key], ...p } })),
    [],
  );
  return [items, patch, setItems] as const;
}

function calcularAccesibilidadCamaras(distance: number, height: number, prices: Prices) {
  const extraDistance = excess(distance, BASE.distance);
  const extraHeight = excess(height, BASE.height);
  const distanceRate = prices.pAccessDistance + extraHeight * prices.pAccessHeightDistance;
  const distanceCost = extraDistance * distanceRate;
  const heightCost = extraHeight * prices.pAccessHeight;
  return { extraDistance, extraHeight, distanceRate, distanceCost, heightCost, total: distanceCost + heightCost };
}

function calcularAccesibilidadDvr(distance: number, height: number, channels: number, difficultyCost: number, prices: Prices) {
  const extraDistance = excess(distance, BASE.dvrDistance);
  const extraHeight = excess(height, BASE.dvrHeight);
  const extraChannels = excess(Math.floor(channels), BASE.dvrChannels);
  const base = prices.pDvrAccessBase;
  const distanceCost = extraDistance * prices.pDvrAccessDistance;
  const heightCost = extraHeight * prices.pDvrAccessHeight;
  const channelCost = extraChannels * prices.pDvrExtraChannel;
  const subtotal = base + distanceCost + heightCost + channelCost;
  return {
    base, extraDistance, extraHeight, extraChannels, distanceCost, heightCost, channelCost,
    subtotal, difficultyCost, total: subtotal + difficultyCost,
  };
}

function calcularMontoCableado(task: MaterialState, distance: number, height: number, prices: Prices) {
  const extraDistance = excess(distance, BASE.distance);
  const extraHeight = excess(height, BASE.height);
  if (!task.selected) return { total: 0, baseAmount: 0, distanceExcess: 0, heightExcess: 0, extraDistance, extraHeight };
  const baseAmount = lineTotal(task);
  const distanceExcess = task.quantity * extraDistance * prices.pCableDistanceRate;
  const heightExcess = task.quantity * extraHeight * prices.pCableHeightRate;
  return { total: baseAmount + distanceExcess + heightExcess, baseAmount, distanceExcess, heightExcess, extraDistance, extraHeight };
}

/* =========================================================================
 * Subcomponentes de UI
 * ========================================================================= */

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <div className="d-flex align-items-center gap-2">
    <span className="rounded-circle bg-primary text-white px-2 py-1 small fw-bold">{n}</span>
    {children}
  </div>
);

const Panel = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`border rounded-3 p-3 bg-light ${className}`}>{children}</div>
);

const PanelHeader = ({ title, hint, badge }: { title: ReactNode; hint: ReactNode; badge?: ReactNode }) => (
  <div className="d-flex justify-content-between align-items-center mb-2">
    <div>
      <div className="fw-semibold small">{title}</div>
      <div className="text-muted small">{hint}</div>
    </div>
    {badge}
  </div>
);

const Row2 = ({ l, r, className = '' }: { l: ReactNode; r: ReactNode; className?: string }) => (
  <div className={`d-flex justify-content-between ${className}`}><span>{l}</span><span>{r}</span></div>
);

const Breakdown = ({ rows }: { rows: [ReactNode, number][] }) => (
  <div className="small text-muted mt-2" style={{ lineHeight: 1.4 }}>
    {rows.map(([label, amount], i) => <Row2 key={i} l={label} r={money(amount)} />)}
  </div>
);

const PriceInput = ({ value, onChange, disabled, placeholder, maxWidth }: {
  value: number | string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; maxWidth?: number;
}) => (
  <InputGroup size="sm" style={maxWidth ? { maxWidth } : undefined}>
    <InputGroup.Text>$</InputGroup.Text>
    <Form.Control type="number" min={0} value={value} disabled={disabled} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} />
  </InputGroup>
);

interface NumFieldProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  icon?: typeof MapPin;
  unit?: string;
  prefix?: string;
  size?: 'sm';
  min?: number;
  compact?: boolean;
}

function NumField({ id, label, value, onChange, icon: Icon, unit, prefix, size, min = 0, compact }: NumFieldProps) {
  return (
    <Form.Group controlId={id}>
      <Form.Label className={`small fw-semibold ${compact ? 'mb-0' : ''}`}>
        {Icon && <Icon size={compact ? 12 : 14} className="me-1" />}{label}
      </Form.Label>
      <InputGroup size={size}>
        {prefix && <InputGroup.Text>{prefix}</InputGroup.Text>}
        <Form.Control type="number" min={min} step={1} value={value} onChange={e => onChange(e.target.value)} />
        {unit && <InputGroup.Text>{unit}</InputGroup.Text>}
      </InputGroup>
    </Form.Group>
  );
}

const SelectField = ({ id, label, value, onChange, options }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: Option[];
}) => (
  <Form.Group controlId={id}>
    <Form.Label className="small fw-semibold">{label}</Form.Label>
    <Form.Select value={value} onChange={e => onChange(e.target.value)}>
      {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
    </Form.Select>
  </Form.Group>
);

interface ItemRowsProps {
  defs: CatalogItem[];
  state: Items;
  patch: (key: string, p: Partial<MaterialState>) => void;
  labelWidth: number;
  priceWidth?: number;
  totalOf?: (key: string) => number;
  afterUnit?: (def: CatalogItem, st: MaterialState) => ReactNode;
  below?: (def: CatalogItem, st: MaterialState) => ReactNode;
}

function ItemRows({ defs, state, patch, labelWidth, priceWidth = 160, totalOf, afterUnit, below }: ItemRowsProps) {
  return (
    <>
      {defs.map(def => {
        const st = state[def.key];
        return (
          <div key={def.key} className="border-top py-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Form.Check
                type="checkbox" className="me-2" checked={st.selected}
                onChange={e => patch(def.key, { selected: e.target.checked })}
                label={<span className="small fw-semibold">{def.label}</span>}
                style={{ minWidth: labelWidth }}
              />
              <Form.Control
                type="number" min={1} size="sm" value={st.quantity} disabled={!st.selected}
                onChange={e => patch(def.key, { quantity: Math.max(1, nonNegative(e.target.value)) })}
                style={{ maxWidth: 80 }}
              />
              <span className="small text-muted">{def.unit}</span>
              {afterUnit?.(def, st)}
              <PriceInput value={st.unitPrice} disabled={!st.selected} maxWidth={priceWidth}
                onChange={v => patch(def.key, { unitPrice: nonNegative(v) })} />
              <span className="small fw-semibold ms-auto">{money(totalOf ? totalOf(def.key) : lineTotal(st))}</span>
            </div>
            {below?.(def, st)}
          </div>
        );
      })}
    </>
  );
}

/* =========================================================================
 * Componente principal
 * ========================================================================= */

export function CalcularServicios({ show, onHide, onAddItems }: CalcularServiciosProps) {
  const [selectedService, setSelectedService] = useState<ServiceKey>('maintenance');
  const [showPrices, setShowPrices] = useState(false);
  const [prices, setPrices] = useState<Prices>({ ...DEFAULT_PRICES });
  
  const [videoCause, setVideoCause] = useState<VideoCause>('unknown');

  const [videoMaterials, patchVideoMaterial, setVideoMaterials] = useItems(VIDEO_MATERIALS);
  const [globalTasks, patchGlobalTask] = useItems(GLOBAL_TASKS, ['lensAndHousingCleaning']);
  
  const [faultGroups, setFaultGroups] = useState<FaultGroup[]>(() => [
    { id: 'group-1', label: 'Cámara 1', tasks: initItems(FAULT_TASKS), photo: undefined }
  ]);

  // NUEVO: Estado para múltiples grabadores (DVR/NVR)
  const [dvrGroups, setDvrGroups] = useState<DvrGroup[]>(() => [
    {
      id: 'dvr-1',
      label: 'DVR / NVR 1',
      included: false,
      distance: '10',
      height: '3',
      channels: '4',
      photo: undefined,
      difficulties: {
        ...Object.fromEntries(DIFFICULTIES.map(d => [d.key, { selected: false, price: d.price }])),
        custom: { selected: false, price: 0, text: '' },
      },
    },
  ]);

  const [maintenanceMaterials, patchMaterial] = useItems(MAINTENANCE_MATERIALS);

  const [data, setData] = useState({
    cameras: '8', device: 'DVR', knownCause: 'yes', affected: '1', internet: 'yes', otherText: '',
    travel: '20000', materials: '0', extraLabor: '0',
    avgDistance: '10', avgHeight: '3',
    cableDistance: '10', cableHeight: '3',
  });
  type DataKey = keyof typeof data;

  const updateField = (field: DataKey, value: string) => setData(prev => ({ ...prev, [field]: value }));
  const bind = (field: DataKey) => ({ value: data[field], onChange: (v: string) => updateField(field, v) });
  const updatePrice = (field: PriceKey, value: string) => setPrices(prev => ({ ...prev, [field]: nonNegative(value) }));

  const cameraCount = Math.max(1, Math.floor(Number(data.cameras) || 1));
  const cableDistance = nonNegative(data.cableDistance);
  const cableHeight = nonNegative(data.cableHeight);

  useEffect(() => {
    patchGlobalTask('lensAndHousingCleaning', { quantity: cameraCount });
  }, [cameraCount, patchGlobalTask]);

  // Handlers para Cámaras
  const addFaultGroup = () => {
    setFaultGroups(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: `Cámara ${prev.length + 1}`, tasks: initItems(FAULT_TASKS), photo: undefined }
    ]);
  };
  const removeFaultGroup = (id: string) => setFaultGroups(prev => prev.filter(g => g.id !== id));
  const updateFaultGroupLabel = (id: string, label: string) => setFaultGroups(prev => prev.map(g => g.id === id ? { ...g, label } : g));
  const updateFaultGroupPhoto = (id: string, photo?: string) => setFaultGroups(prev => prev.map(g => g.id === id ? { ...g, photo } : g));
  const patchFaultTask = (groupId: string, key: string, p: Partial<MaterialState>) => {
    setFaultGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, tasks: { ...g.tasks, [key]: { ...g.tasks[key], ...p } } };
    }));
  };

  // Handlers para DVRs
  const addDvrGroup = () => {
    setDvrGroups(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `DVR / NVR ${prev.length + 1}`,
        included: true,
        distance: '10',
        height: '3',
        channels: '4',
        photo: undefined,
        difficulties: {
          ...Object.fromEntries(DIFFICULTIES.map(d => [d.key, { selected: false, price: d.price }])),
          custom: { selected: false, price: 0, text: '' },
        },
      }
    ]);
  };
  const removeDvrGroup = (id: string) => setDvrGroups(prev => prev.filter(g => g.id !== id));
  const updateDvrGroup = (id: string, patch: Partial<DvrGroup>) => setDvrGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  const updateDvrDifficulty = (id: string, key: string, patch: Partial<DifficultyState>) => {
    setDvrGroups(prev => prev.map(g => {
      if (g.id !== id) return g;
      return {
        ...g,
        difficulties: { ...g.difficulties, [key]: { ...g.difficulties[key], ...patch } }
      };
    }));
  };

  // Lector de archivos
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleVideoCauseChange = (cause: VideoCause) => {
    setVideoCause(cause);
    const suggested = VIDEO_CAUSES.find(c => c.value === cause)?.suggested ?? [];
    setVideoMaterials(prev => Object.fromEntries(
      Object.entries(prev).map(([key, m]) => [key, { ...m, selected: suggested.includes(key) }]),
    ));
  };

  const videoMaterialsTotal = useMemo(() => sumSelected(videoMaterials), [videoMaterials]);

  const cameraAccess = useMemo(
    () => calcularAccesibilidadCamaras(nonNegative(data.avgDistance), nonNegative(data.avgHeight), prices),
    [data.avgDistance, data.avgHeight, prices],
  );

  const dvrAccessTotals = useMemo(() => {
    return dvrGroups.map(dvr => {
      const totalDificultades = Object.values(dvr.difficulties).reduce((sum, d) => (d.selected ? sum + d.price : sum), 0);
      return calcularAccesibilidadDvr(
        nonNegative(dvr.distance), nonNegative(dvr.height), nonNegative(dvr.channels), totalDificultades, prices
      );
    });
  }, [dvrGroups, prices]);

  const cableTotals = useMemo(() => {
    const map: Record<string, ReturnType<typeof calcularMontoCableado>> = {};
    faultGroups.forEach(g => {
      map[g.id] = calcularMontoCableado(g.tasks.cableChange, cableDistance, cableHeight, prices);
    });
    return map;
  }, [faultGroups, cableDistance, cableHeight, prices]);

  const bundleDiscount = useMemo(() => {
    let count = 0;
    let laborBase = 0;

    Object.values(globalTasks).forEach(t => {
      if (t.selected) { count++; laborBase += lineTotal(t); }
    });

    faultGroups.forEach(group => {
      Object.values(group.tasks).forEach(t => {
        if (t.selected) { count++; laborBase += lineTotal(t); }
      });
    });

    let totalPct = 0;
    for (const t of BUNDLE_DISCOUNTS) if (count >= t.min) totalPct = t.pct;

    return { count, laborBase, totalPct, amount: Math.round(laborBase * totalPct / 100) };
  }, [globalTasks, faultGroups]);

  const maintenanceExtrasTotal = useMemo(() => {
    let total = sumSelected(globalTasks);

    faultGroups.forEach(g => {
      Object.entries(g.tasks).forEach(([key, t]) => {
        if (!t.selected) return;
        if (key === 'cableChange') total += cableTotals[g.id].total;
        else total += lineTotal(t);
      });
    });

    return total + sumSelected(maintenanceMaterials) - bundleDiscount.amount;
  }, [globalTasks, faultGroups, maintenanceMaterials, cableTotals, bundleDiscount]);

  const result = useMemo(() => {
    const lines: ServiceLine[] = [];
    let direct = true;
    let title = 'Cotización preliminar disponible';
    let message = 'Confirme el alcance del trabajo y los valores con el cliente antes de generar la cotización.';
    let script = '';

    const addLine = (
      id: string, description: string, detail: string, amount: number, itemType: 'service' | 'product' = 'service',
    ) => lines.push({ id, description, detail, amount: nonNegative(amount), itemType });

    const addDiscount = (id: string, description: string, detail: string, amount: number) => {
      if (amount > 0) lines.push({ id, description, detail, amount: -amount, itemType: 'service' });
    };

    const diagnose = (
      t: string, m: string, s: string, line: [id: string, description: string, detail: string, amount: number],
    ) => {
      direct = false; title = t; message = m; script = s;
      addLine(...line);
    };

    const addItem = (def: CatalogItem, st: MaterialState, prefix: string, type: 'service' | 'product') => {
      const amount = lineTotal(st);
      if (!st.selected || amount <= 0) return;
      addLine(`${prefix}-${def.key}`, def.label, `${st.quantity} ${def.unit} × ${money(st.unitPrice)}`, amount, type);
    };

    const { device } = data;

    switch (selectedService) {
      case 'maintenance': {
        if (cameraAccess.total > 0) {
          const parts: string[] = [];
          if (cameraAccess.extraDistance > 0) parts.push(`${cameraAccess.extraDistance} m dist × ${money(cameraAccess.distanceRate)}/m`);
          if (cameraAccess.extraHeight > 0) parts.push(`${cameraAccess.extraHeight} m alt × ${money(prices.pAccessHeight)}/m`);
          addLine('camera-access-excess', 'Accesibilidad adicional de cámaras',
            `${parts.join(' · ')} (base 10 m / 3 m incluida)`, cameraAccess.total);
        }

        // Múltiples DVRs
        dvrGroups.forEach((dvr, index) => {
          if (!dvr.included) return;
          const acc = dvrAccessTotals[index];
          const parts = [`${dvr.distance || 0} m al tomacorriente`, `${dvr.height || 0} m altura`, `${dvr.channels || 0} canales`];
          if (acc.extraDistance > 0) parts.push(`+${acc.extraDistance} m dist`);
          if (acc.extraHeight > 0) parts.push(`+${acc.extraHeight} m alt`);
          if (acc.extraChannels > 0) parts.push(`+${acc.extraChannels} canales`);
          if (acc.difficultyCost > 0) parts.push('+ Dificultades físicas');
          
          let detail = parts.join(' · ');
          if (dvr.photo) detail += ' | 📸 Foto adjunta';

          addLine(
            `dvr-accessibility-${dvr.id}`,
            `Accesibilidad de ${dvr.label || 'Grabador'}`,
            detail,
            acc.total
          );
        });

        GLOBAL_TASKS.forEach(def => {
          addItem(def, globalTasks[def.key], 'global-task', 'service');
        });

        faultGroups.forEach(group => {
          let videoLossAmount = 0;
          const videoLossDetails: string[] = [];

          FAULT_TASKS.forEach(def => {
            const task = group.tasks[def.key];
            if (!task.selected) return;

            const amount = def.key === 'cableChange' ? cableTotals[group.id].total : lineTotal(task);
            videoLossAmount += amount;

            let detailStr = `${task.quantity} ${def.unit} - ${def.label}`;
            if (def.key === 'cableChange' && (cableTotals[group.id].extraDistance > 0 || cableTotals[group.id].extraHeight > 0)) {
              detailStr += ` (incluye excedente)`;
            }
            videoLossDetails.push(detailStr);
          });

          if (videoLossAmount > 0) {
            let finalDetail = videoLossDetails.join(' + ');
            if (group.photo) finalDetail += ' | 📸 Foto adjunta';

            addLine(
              `video-loss-repair-${group.id}`,
              `Atención integral: ${group.label.trim() || 'Cámara / Falla'}`,
              finalDetail,
              videoLossAmount
            );
          }
        });

        if (bundleDiscount.amount > 0) {
          addDiscount(
            'bundle-discount',
            'Descuento por servicios combinados',
            `${bundleDiscount.count} servicio(s) en total · ${bundleDiscount.totalPct}% sobre ${money(bundleDiscount.laborBase)}`,
            bundleDiscount.amount,
          );
        }

        MAINTENANCE_MATERIALS.forEach(def => addItem(def, maintenanceMaterials[def.key], 'maint-material', 'product'));

        script = `La cotización parte de la limpieza de lentes y carcaza para las ${cameraCount} cámaras (incluye hasta 10 m de distancia y 3 m de altura). A partir de ahí se suman las reparaciones específicas agrupadas por cámara y los materiales que el técnico identifique.${bundleDiscount.amount > 0 ? ` Se aplicó un descuento del ${bundleDiscount.totalPct}% sobre la mano de obra por combinar ${bundleDiscount.count} servicios.` : ''}`;
        break;
      }
      case 'video': {
        if (videoCause === 'unknown') {
          diagnose(
            'Requiere diagnóstico técnico',
            'La causa no está confirmada. El valor corresponde a visita o diagnóstico, no a una reparación garantizada.',
            'Para determinar qué está ocasionando la pérdida de video, un técnico debe revisar el sistema. La reparación y los repuestos se cotizan después del diagnóstico.',
            ['diagnostic-visit', 'Visita / diagnóstico técnico', 'Evaluación en sitio; reparación no incluida', prices.pVisit],
          );
          break;
        }
        const affected = AFFECTED[data.affected] ?? AFFECTED['1'];
        const causeLabel = VIDEO_CAUSES.find(c => c.value === videoCause)?.label ?? 'Causa identificada';
        addLine('video-loss', 'Atención por pérdida de video', `${causeLabel} · ${affected.label}`, Math.round(prices.pPower * affected.factor));
        VIDEO_MATERIALS.forEach(def => addItem(def, videoMaterials[def.key], 'material', 'product'));
        script = 'Cotizamos la atención según la causa informada y los materiales probables. Cualquier material o trabajo no descrito se aprueba con el cliente antes de ejecutarlo.';
        break;
      }
      case 'reset':
        addLine('reset', `Reseteo de ${device}`, 'Sujeto al procedimiento compatible con el fabricante', prices.pReset);
        script = 'El valor corresponde al procedimiento de reseteo. Si el fabricante requiere un proceso especial o una visita adicional, se informa antes de continuar.';
        break;
      case 'configuration':
        addLine('configuration', `Configuración de ${device}`, 'No incluye repuestos ni ampliaciones de cableado', prices.pConfiguration);
        script = 'Podemos realizar la configuración del grabador. El valor no incluye repuestos ni trabajos adicionales no descritos.';
        break;
      case 'remote':
      case 'app':
        if (data.internet !== 'yes') {
          diagnose(
            'Validar conexión antes de cotizar',
            'No se ha confirmado que exista una conexión a internet funcional. El valor mostrado corresponde a visita o diagnóstico.',
            'Para configurar el acceso remoto o vincular la aplicación, primero debemos verificar la conexión, la compatibilidad del equipo y los permisos necesarios.',
            ['connectivity-visit', 'Visita / diagnóstico de conectividad', 'Configuración final no garantizada', prices.pVisit],
          );
        } else {
          const isRemote = selectedService === 'remote';
          addLine(
            'app-setup',
            isRemote ? 'Configuración de acceso remoto' : 'Configuración de aplicación',
            `Equipo: ${device}; requiere compatibilidad e internet`,
            isRemote ? prices.pRemote : prices.pApp,
          );
          script = 'Podemos realizar la configuración si el equipo es compatible, hay internet y se cuenta con los accesos necesarios.';
        }
        break;
      case 'password':
        addLine('password', 'Cambio / recuperación de contraseña', `Equipo: ${device}; sujeto al método del fabricante`, prices.pPassword);
        script = 'El procedimiento depende de la marca, el modelo y la validación de propiedad del equipo. No se garantiza el restablecimiento hasta confirmar el método disponible.';
        break;
      case 'recording':
        if (data.knownCause !== 'yes') {
          diagnose(
            'Requiere diagnóstico técnico',
            'No está confirmada la causa del problema de grabación. El diagnóstico no incluye reparación ni disco duro.',
            'Debemos revisar la configuración, el almacenamiento y el estado del equipo para identificar la causa. Los repuestos se cotizan aparte.',
            ['recording-diagnostic', 'Visita / diagnóstico de grabación', 'Revisión en sitio; repuestos no incluidos', prices.pVisit],
          );
        } else {
          addLine('recording-review', 'Revisión de grabaciones', `Equipo: ${device}`, prices.pRecording);
          script = 'Atenderemos la revisión indicada. Si se identifica un daño de hardware, se informa y se cotiza antes de cambiar piezas.';
        }
        break;
      case 'power':
        if (data.knownCause !== 'yes') {
          diagnose(
            'Requiere diagnóstico técnico',
            'No se ha confirmado si la falla corresponde a la fuente, el cableado, los conectores o el equipo.',
            'Un técnico debe revisar la alimentación y las conexiones. Cualquier material o reparación adicional se informa antes de realizarse.',
            ['power-diagnostic', 'Visita / diagnóstico de alimentación', 'Repuestos y reparación no incluidos', prices.pVisit],
          );
        } else {
          addLine('power-review', 'Revisión de alimentación', 'Fuente, conexiones y cableado accesible', prices.pPower);
          script = 'Atenderemos la revisión indicada. Los materiales o repuestos adicionales se cotizan por separado si son necesarios.';
        }
        break;
      case 'other':
        diagnose(
          'Requiere evaluación técnica',
          'El servicio no está parametrizado. El precio mostrado es una referencia de evaluación, no una cotización de reparación.',
          'Cuéntenos qué está ocurriendo. Validaremos el alcance y coordinaremos una evaluación antes de confirmar el precio final.',
          ['other-evaluation', 'Evaluación de servicio personalizado', data.otherText.trim() || 'Descripción pendiente del cliente', prices.pOther],
        );
        break;
    }

    const travel = nonNegative(data.travel);
    const materials = nonNegative(data.materials);
    const extraLabor = nonNegative(data.extraLabor);
    if (travel > 0) addLine('travel', 'Desplazamiento', 'Cargo adicional', travel);
    if (materials > 0) addLine('materials', 'Otros materiales / repuestos', 'Valor ingresado manualmente', materials, 'product');
    if (extraLabor > 0) addLine('extra-labor', 'Mano de obra adicional', 'Cargo adicional', extraLabor);

    return { direct, title, message, script, lines, subtotal: lines.reduce((sum, l) => sum + l.amount, 0) };
  }, [
    data, prices, selectedService, videoCause, videoMaterials, globalTasks, faultGroups, maintenanceMaterials,
    dvrGroups, dvrAccessTotals, cameraAccess, cableTotals, cameraCount, cableDistance, cableHeight, bundleDiscount,
  ]);

  const estimatedTax = Math.round(result.subtotal * IVA);
  const estimatedTotal = result.subtotal + estimatedTax;
  const otherNote = selectedService === 'other' ? data.otherText.trim() : '';

  const handleAddToQuote = () => {
    if (!result.lines.length) return;
    onAddItems(result.lines.map(line => ({
      item_type: line.itemType,
      description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}${otherNote ? ` | Solicitud: ${otherNote}` : ''}`,
      quantity: 1,
      unit_price: line.amount < 0 ? 0 : Math.round(line.amount),
      discount: line.amount < 0 ? Math.abs(Math.round(line.amount)) : 0,
      tax_rate: 19,
    })));
    onHide();
  };

  const copyQuote = async () => {
    const text = [
      'COTIZACIÓN PRELIMINAR S24 — SERVICIOS CCTV',
      `Servicio: ${SERVICES[selectedService].name}`,
      `Resultado: ${result.title}`,
      ...(otherNote ? [`Descripción: ${otherNote}`] : []),
      '',
      ...result.lines.map(l => `${l.description} (${l.detail}): ${money(l.amount)}`),
      '',
      `Subtotal: ${money(result.subtotal)}`,
      `IVA estimado (19%): ${money(estimatedTax)}`,
      `TOTAL ESTIMADO CON IVA: ${money(estimatedTotal)}`,
      '',
      `Observación: ${result.message}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      window.alert('Cotización copiada al portapapeles.');
    } catch {
      window.alert('No fue posible copiar automáticamente. Verifica los permisos del navegador.');
    }
  };

  const isMaintenance = selectedService === 'maintenance';
  const isVideo = selectedService === 'video';

  const cameraAccessRows: [string, number][] = [
    [cameraAccess.extraDistance > 0 ? `${cameraAccess.extraDistance} m distancia × ${money(cameraAccess.distanceRate)}/m` : 'Sin excedente de distancia', cameraAccess.distanceCost],
    [cameraAccess.extraHeight > 0 ? `${cameraAccess.extraHeight} m altura × ${money(prices.pAccessHeight)}/m` : 'Sin excedente de altura', cameraAccess.heightCost],
  ];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable dialogClassName="s24-service-calculator-modal">
      <Modal.Header closeButton className="border-bottom-0 pb-2">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-2"><Calculator size={24} /></div>
          <div>
            <Modal.Title className="fw-bold">Calculadora de servicios CCTV</Modal.Title>
            <div className="small text-muted">S24 Seguridad Electrónica · Cotización preliminar</div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-2" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
        <Alert variant="light" className="border d-flex align-items-start gap-2 small mb-4">
          <Info size={18} className="text-primary flex-shrink-0 mt-1" />
          <span>Use esta herramienta como apoyo comercial. Si la causa de la falla no está confirmada, cotice el diagnóstico y no prometa una reparación específica.</span>
        </Alert>

        <Row className="g-4">
          <Col lg={7}>
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
                <Step n={1}><strong>Seleccione el servicio</strong></Step>
                <Badge bg="light" text="dark">{Object.keys(SERVICES).length} opciones</Badge>
              </Card.Header>
              <Card.Body>
                <Row className="g-2">
                  {(Object.entries(SERVICES) as [ServiceKey, (typeof SERVICES)[ServiceKey]][]).map(([key, { icon: Icon, label, description }]) => {
                    const active = selectedService === key;
                    return (
                      <Col sm={6} key={key}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedService(key)}
                          className={`btn text-start w-100 h-100 p-3 rounded-3 ${active ? 'btn-outline-primary border-2 bg-primary bg-opacity-10' : 'btn-outline-secondary border'}`}
                        >
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <Icon size={20} className={active ? 'text-primary' : 'text-secondary'} />
                            {active && <CheckCircle2 size={16} className="ms-auto text-primary" />}
                          </div>
                          <div className={`fw-semibold small ${active ? 'text-primary' : 'text-dark'}`}>{label}</div>
                          <div className="small text-muted mt-1">{description}</div>
                        </button>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white border-bottom py-3">
                <Step n={2}><strong>Datos del servicio</strong></Step>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {isMaintenance && (
                    <Col md={6}>
                      <NumField id="service-camera-count" label="Cantidad de cámaras" min={1} unit="cámaras" {...bind('cameras')} />
                    </Col>
                  )}

                  {DEVICE_SERVICES.includes(selectedService) && (
                    <Col md={6}>
                      <SelectField id="service-device" label="Equipo principal" options={opts('DVR', 'NVR', 'DVR + NVR', 'No sabe')} {...bind('device')} />
                    </Col>
                  )}

                  {CAUSE_SERVICES.includes(selectedService) && (
                    <Col md={6}>
                      <SelectField id="service-known-cause" label="¿La causa está identificada?"
                        options={[['yes', 'Sí, está identificada'], ['no', 'No / no se sabe']]} {...bind('knownCause')} />
                    </Col>
                  )}

                  {isMaintenance && (
                    <Col xs={12}>
                      <Panel>
                        <PanelHeader
                          title={<><Ruler size={14} className="me-1" />Accesibilidad de cámaras</>}
                          hint={<>Base incluida: hasta <strong>10 m</strong> de distancia y <strong>3 m</strong> de altura. Si se excede, se cobra solo el excedente.</>}
                          badge={cameraAccess.total > 0
                            ? <Badge bg="warning" text="dark">{money(cameraAccess.total)} excedente</Badge>
                            : <Badge bg="success" text="dark">Dentro de base</Badge>}
                        />
                        <Row className="g-2 mt-1">
                          <Col md={6}>
                            <NumField id="service-avg-distance" size="sm" icon={MapPin} unit="m"
                              label="Distancia promedio al grabador / energía" {...bind('avgDistance')} />
                          </Col>
                          <Col md={6}>
                            <NumField id="service-avg-height" size="sm" icon={ArrowUp} unit="m"
                              label="Altura promedio de instalación" {...bind('avgHeight')} />
                          </Col>
                        </Row>
                        {cameraAccess.total > 0 && <Breakdown rows={cameraAccessRows} />}
                      </Panel>
                    </Col>
                  )}

                  {/* --- SECCIÓN DE MÚLTIPLES DVRs --- */}
                  {isMaintenance && (
                    <Col xs={12}>
                      <Panel className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h6 className="fw-bold mb-1"><Zap size={16} className="me-1" /> Accesibilidad de Grabadores (DVR/NVR)</h6>
                            <div className="text-muted small">Agregue los grabadores que requieran cobro por accesibilidad.</div>
                          </div>
                          <Button variant="outline-primary" size="sm" onClick={addDvrGroup}>
                            <PlusCircle size={14} className="me-1" /> Añadir otro grabador
                          </Button>
                        </div>

                        {dvrGroups.map((dvr, index) => {
                          const acc = dvrAccessTotals[index];
                          return (
                            <Card key={dvr.id} className="mb-3 border-0 shadow-sm">
                              <Card.Body className="bg-white rounded-3 border">
                                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <Form.Check
                                      type="checkbox"
                                      checked={dvr.included}
                                      onChange={e => updateDvrGroup(dvr.id, { included: e.target.checked })}
                                      label={<span className="fw-semibold small text-primary">Incluir accesibilidad</span>}
                                    />
                                    <Form.Control
                                      size="sm"
                                      style={{ maxWidth: 200 }}
                                      value={dvr.label}
                                      onChange={e => updateDvrGroup(dvr.id, { label: e.target.value })}
                                      placeholder="Ej: DVR Principal"
                                      disabled={!dvr.included}
                                    />
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    {dvr.included && <Badge bg="info" text="dark">{money(acc.total)}</Badge>}
                                    {dvrGroups.length > 1 && (
                                      <Button variant="outline-danger" size="sm" onClick={() => removeDvrGroup(dvr.id)}>
                                        <Trash2 size={14} />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {dvr.included && (
                                  <>
                                    <div className="text-muted small mt-1 mb-2">
                                      Base: 0–10 m al tomacorriente, 0–3 m de altura y hasta 4 canales de video.
                                      Cada canal adicional se cobra a {money(prices.pDvrExtraChannel)}.
                                    </div>

                                    <Row className="g-2 mt-1">
                                      <Col md={4}>
                                        <NumField id={`dvr-dist-${dvr.id}`} size="sm" icon={MapPin} unit="m" label="Dist. al tomacorriente"
                                          value={dvr.distance} onChange={v => updateDvrGroup(dvr.id, { distance: v })} />
                                      </Col>
                                      <Col md={4}>
                                        <NumField id={`dvr-height-${dvr.id}`} size="sm" icon={ArrowUp} unit="m" label="Altura"
                                          value={dvr.height} onChange={v => updateDvrGroup(dvr.id, { height: v })} />
                                      </Col>
                                      <Col md={4}>
                                        <NumField id={`dvr-channels-${dvr.id}`} size="sm" icon={Video} unit="canales" label="Canales ocupados"
                                          value={dvr.channels} onChange={v => updateDvrGroup(dvr.id, { channels: v })} />
                                      </Col>
                                    </Row>

                                    <div className="mb-3">
                                      <Breakdown rows={[
                                        ['Base (0–10 m / 0–3 m / 0–4 canales)', acc.base],
                                        [acc.extraDistance > 0 ? `${acc.extraDistance} m distancia × ${money(prices.pDvrAccessDistance)}/m` : 'Sin metros de distancia adicionales', acc.distanceCost],
                                        [acc.extraHeight > 0 ? `${acc.extraHeight} m altura × ${money(prices.pDvrAccessHeight)}/m` : 'Sin metros de altura adicionales', acc.heightCost],
                                        [acc.extraChannels > 0 ? `${acc.extraChannels} canal(es) extra × ${money(prices.pDvrExtraChannel)}` : 'Sin canales adicionales (4 incluidos)', acc.channelCost],
                                      ]} />
                                    </div>

                                    {/* Foto para el DVR */}
                                    <div className="d-flex align-items-center gap-3 mt-3 mb-3 p-2 border rounded bg-light">
                                      {dvr.photo ? (
                                        <div className="position-relative">
                                          <img src={dvr.photo} alt={dvr.label} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                                          <Button variant="danger" size="sm" className="position-absolute top-0 end-0 rounded-circle p-1" style={{ transform: 'translate(50%, -50%)' }} onClick={() => updateDvrGroup(dvr.id, { photo: undefined })}>
                                            <X size={12} />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="d-flex align-items-center justify-content-center bg-white border rounded" style={{ width: 80, height: 80 }}>
                                          <HardDrive size={24} className="text-secondary opacity-50" />
                                        </div>
                                      )}
                                      <div>
                                        <div className="small fw-semibold">Foto del Grabador</div>
                                        <label className="btn btn-outline-primary btn-sm mt-1 mb-0">
                                          <Camera size={14} className="me-1" /> {dvr.photo ? 'Cambiar foto' : 'Tomar / Subir foto'}
                                          <input type="file" accept="image/*" capture="environment" className="d-none" onChange={(e) => handleImageUpload(e, (b64) => updateDvrGroup(dvr.id, { photo: b64 }))} />
                                        </label>
                                      </div>
                                    </div>

                                    {/* Dificultades físicas */}
                                    <div className="border-top pt-3 mt-2 border-danger border-opacity-25">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                          <div className="fw-semibold small text-danger">
                                            <AlertTriangle size={14} className="me-1" />
                                            Dificultades Físicas (Este Grabador)
                                          </div>
                                          <div className="text-muted small">Condiciones que complican el acceso a este equipo.</div>
                                        </div>
                                        <Badge bg="danger" text="white">{money(acc.difficultyCost)} extra</Badge>
                                      </div>

                                      <Row className="g-3">
                                        {DIFFICULTIES.map(({ key, label }) => (
                                          <Col md={6} key={key}>
                                            <Form.Check
                                              type="switch"
                                              id={`diff-${dvr.id}-${key}`}
                                              label={<span className="small fw-semibold">{label}</span>}
                                              checked={dvr.difficulties[key].selected}
                                              onChange={e => updateDvrDifficulty(dvr.id, key, { selected: e.target.checked })}
                                            />
                                            <div className="mt-2">
                                              <PriceInput value={dvr.difficulties[key].price} maxWidth={150}
                                                onChange={v => updateDvrDifficulty(dvr.id, key, { price: Number(v) })} />
                                            </div>
                                          </Col>
                                        ))}

                                        <Col md={12}>
                                          <div className="p-2 border rounded bg-white">
                                            <Form.Check
                                              type="switch"
                                              id={`diff-custom-${dvr.id}`}
                                              label={<span className="small fw-bold text-primary">Otra dificultad</span>}
                                              checked={dvr.difficulties.custom.selected}
                                              onChange={e => updateDvrDifficulty(dvr.id, 'custom', { selected: e.target.checked })}
                                            />
                                            {dvr.difficulties.custom.selected && (
                                              <Row className="g-2 mt-1">
                                                <Col md={8}>
                                                  <Form.Control
                                                    type="text" size="sm"
                                                    placeholder="Ej: El DVR está amarrado con guaya y toca cortarla..."
                                                    value={dvr.difficulties.custom.text}
                                                    onChange={e => updateDvrDifficulty(dvr.id, 'custom', { text: e.target.value })}
                                                  />
                                                </Col>
                                                <Col md={4}>
                                                  <PriceInput placeholder="Valor extra"
                                                    value={dvr.difficulties.custom.price === 0 ? '' : dvr.difficulties.custom.price}
                                                    onChange={v => updateDvrDifficulty(dvr.id, 'custom', { price: Number(v) })} />
                                                </Col>
                                              </Row>
                                            )}
                                          </div>
                                        </Col>
                                      </Row>
                                    </div>
                                  </>
                                )}
                              </Card.Body>
                            </Card>
                          );
                        })}
                      </Panel>
                    </Col>
                  )}

                  {isMaintenance && (
                    <Col xs={12}>
                      <Panel className="mb-3">
                        <PanelHeader
                          title="Tareas generales (Globales)"
                          hint="Tareas de revisión o limpieza que no dependen de una falla específica."
                          badge={<Badge bg="info" text="dark">{money(sumSelected(globalTasks))}</Badge>}
                        />
                        <ItemRows
                          defs={GLOBAL_TASKS}
                          state={globalTasks}
                          patch={patchGlobalTask}
                          labelWidth={260}
                          afterUnit={(def, st) => def.perCamera && (
                            <Button variant="link" size="sm" className="p-0 small text-decoration-none" disabled={!st.selected}
                              onClick={() => patchGlobalTask(def.key, { quantity: cameraCount })}>
                              usar {data.cameras} cámaras
                            </Button>
                          )}
                        />
                      </Panel>

                      <div className="d-flex justify-content-between align-items-center mb-2 mt-4">
                        <h6 className="fw-bold mb-0">Reparaciones específicas por cámara</h6>
                        <Button variant="outline-primary" size="sm" onClick={addFaultGroup}>
                          <PlusCircle size={14} className="me-1" /> Añadir otra cámara
                        </Button>
                      </div>

                      {faultGroups.some(g => g.tasks.cableChange?.selected) && (
                        <Panel className="mb-3 border-info bg-info bg-opacity-10">
                          <PanelHeader 
                            title="Configuración de cableado" 
                            hint="Aplica a todos los puntos de cambio de cableado seleccionados en las cámaras."
                          />
                          <Row className="g-2">
                            <Col sm={6}>
                              <NumField id="service-cable-distance" size="sm" compact icon={MapPin} unit="m"
                                label="Distancia al grabador / energía" {...bind('cableDistance')} />
                            </Col>
                            <Col sm={6}>
                              <NumField id="service-cable-height" size="sm" compact icon={ArrowUp} unit="m"
                                label="Altura de instalación" {...bind('cableHeight')} />
                            </Col>
                          </Row>
                        </Panel>
                      )}

                      {faultGroups.map((group) => (
                        <Card key={group.id} className="mb-3 border-0 shadow-sm">
                          <Card.Body className="bg-light rounded-3 border">
                            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                              <div className="d-flex align-items-center gap-2">
                                <Video size={16} className="text-primary" />
                                <Form.Control
                                  size="sm"
                                  style={{ maxWidth: 250 }}
                                  value={group.label}
                                  onChange={e => updateFaultGroupLabel(group.id, e.target.value)}
                                  placeholder="Ej: Cámara Entrada, Falla Pasillo..."
                                />
                              </div>
                              {faultGroups.length > 1 && (
                                <Button variant="outline-danger" size="sm" onClick={() => removeFaultGroup(group.id)}>
                                  <Trash2 size={14} className="me-1" /> Eliminar
                                </Button>
                              )}
                            </div>
                            
                            <ItemRows
                              defs={FAULT_TASKS}
                              state={group.tasks}
                              patch={(key, p) => patchFaultTask(group.id, key, p)}
                              labelWidth={240}
                              totalOf={key => key === 'cableChange' ? cableTotals[group.id].total : lineTotal(group.tasks[key])}
                            />
                            
                            {group.tasks.cableChange.selected && (cableTotals[group.id].extraDistance > 0 || cableTotals[group.id].extraHeight > 0) && (
                              <div className="small text-muted mt-2 ms-4 p-2 bg-white rounded border" style={{ lineHeight: 1.4 }}>
                                <Row2 l="Base incluida (10 m / 3 m)" r={`${money(group.tasks.cableChange.unitPrice)} × ${group.tasks.cableChange.quantity} punto(s)`} />
                                {cableTotals[group.id].extraDistance > 0 && (
                                  <Row2 l={`${cableTotals[group.id].extraDistance} m dist extra × ${money(prices.pCableDistanceRate)}/m × ${group.tasks.cableChange.quantity} punto(s)`} r={money(cableTotals[group.id].distanceExcess)} />
                                )}
                                {cableTotals[group.id].extraHeight > 0 && (
                                  <Row2 l={`${cableTotals[group.id].extraHeight} m alt extra × ${money(prices.pCableHeightRate)}/m × ${group.tasks.cableChange.quantity} punto(s)`} r={money(cableTotals[group.id].heightExcess)} />
                                )}
                                <Row2 className="border-top pt-1 mt-1" l={<strong>Subtotal cableado</strong>} r={<strong>{money(cableTotals[group.id].total)}</strong>} />
                              </div>
                            )}

                            {/* Foto para la Cámara */}
                            <div className="d-flex align-items-center gap-3 mt-3 p-2 border rounded bg-white">
                              {group.photo ? (
                                <div className="position-relative">
                                  <img src={group.photo} alt={group.label} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                                  <Button variant="danger" size="sm" className="position-absolute top-0 end-0 rounded-circle p-1" style={{ transform: 'translate(50%, -50%)' }} onClick={() => updateFaultGroupPhoto(group.id, undefined)}>
                                    <X size={12} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="d-flex align-items-center justify-content-center bg-light border rounded" style={{ width: 80, height: 80 }}>
                                  <Camera size={24} className="text-secondary opacity-50" />
                                </div>
                              )}
                              <div>
                                <div className="small fw-semibold">Evidencia fotográfica</div>
                                <label className="btn btn-outline-primary btn-sm mt-1 mb-0">
                                  <Camera size={14} className="me-1" /> {group.photo ? 'Cambiar foto' : 'Tomar / Subir foto'}
                                  <input type="file" accept="image/*" capture="environment" className="d-none" onChange={(e) => handleImageUpload(e, (b64) => updateFaultGroupPhoto(group.id, b64))} />
                                </label>
                              </div>
                            </div>

                          </Card.Body>
                        </Card>
                      ))}

                      <div className="mt-3">
                        {bundleDiscount.amount > 0 ? (
                          <div className="small text-success fw-semibold">
                            <strong>Descuento por combo:</strong> {bundleDiscount.count} servicio(s) en total → <strong>{bundleDiscount.totalPct}%</strong>
                            {' '}sobre {money(bundleDiscount.laborBase)} de mano de obra = <strong>−{money(bundleDiscount.amount)}</strong>.
                          </div>
                        ) : bundleDiscount.count === 1 ? (
                          <div className="small text-muted">
                            💡 Marca un segundo servicio (en cualquier cámara) para activar el descuento por combo (15%).
                          </div>
                        ) : null}
                      </div>

                      <Panel className="mt-4">
                        <PanelHeader
                          title="Materiales adicionales"
                          hint="Repuestos o consumibles (fuentes, baluns, cable, cámaras, etc.). No incluyen mano de obra."
                        />
                        <ItemRows defs={MAINTENANCE_MATERIALS} state={maintenanceMaterials} patch={patchMaterial} labelWidth={260} />
                      </Panel>
                    </Col>
                  )}

                  {isVideo && (
                    <>
                      <Col md={6}>
                        <SelectField id="service-video-cause" label="Causa probable de la pérdida" value={videoCause}
                          onChange={v => handleVideoCauseChange(v as VideoCause)}
                          options={VIDEO_CAUSES.map(c => [c.value, c.label])} />
                      </Col>
                      <Col md={6}>
                        <SelectField id="service-affected-cameras" label="Cámaras afectadas"
                          options={Object.entries(AFFECTED).map(([k, a]) => [k, a.option])} {...bind('affected')} />
                      </Col>
                      {videoCause !== 'unknown' && (
                        <Col xs={12}>
                          <Panel>
                            <PanelHeader
                              title="Materiales probables"
                              hint="Marque los que se requieran y ajuste cantidad y precio."
                              badge={<Badge bg="info" text="dark">{money(videoMaterialsTotal)}</Badge>}
                            />
                            <ItemRows defs={VIDEO_MATERIALS} state={videoMaterials} patch={patchVideoMaterial} labelWidth={200} priceWidth={170} />
                          </Panel>
                        </Col>
                      )}
                    </>
                  )}

                  {INTERNET_SERVICES.includes(selectedService) && (
                    <Col md={6}>
                      <SelectField id="service-internet" label="¿Hay internet disponible?"
                        options={[['yes', 'Sí, funciona'], ['no', 'No hay internet'], ['unknown', 'No sabe']]} {...bind('internet')} />
                    </Col>
                  )}

                  {selectedService === 'other' && (
                    <Col xs={12}>
                      <Form.Group controlId="service-other-description">
                        <Form.Label className="small fw-semibold">Descripción de la solicitud</Form.Label>
                        <Form.Control
                          as="textarea" rows={3} maxLength={500}
                          value={data.otherText}
                          onChange={e => updateField('otherText', e.target.value)}
                          placeholder="Describa el problema o servicio que solicita el cliente"
                        />
                        <Form.Text muted>{data.otherText.length}/500 caracteres</Form.Text>
                      </Form.Group>
                    </Col>
                  )}

                  <Col md={4}><NumField id="service-travel" icon={MapPin} prefix="$" label="Desplazamiento" {...bind('travel')} /></Col>
                  <Col md={4}><NumField id="service-materials" icon={Package} prefix="$" label="Otros materiales" {...bind('materials')} /></Col>
                  <Col md={4}><NumField id="service-extra-labor" icon={Clock3} prefix="$" label="Mano de obra extra" {...bind('extraLabor')} /></Col>
                </Row>
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                  <Settings size={17} className="text-secondary" />
                  <strong className="small">Configuración de precios</strong>
                </div>
                <Button variant="link" size="sm" className="text-decoration-none" onClick={() => setShowPrices(v => !v)}>
                  {showPrices ? 'Ocultar precios' : 'Editar precios'}
                </Button>
              </Card.Header>
              {showPrices && (
                <Card.Body>
                  <Alert variant="warning" className="small">
                    Estos precios se guardan solo en el estado de este componente. Para administrarlos desde el ERP, deben cargarse desde la configuración o la base de datos.
                  </Alert>
                  <Row className="g-3">
                    {PRICE_CONFIG.map(({ key, label }) => (
                      <Col md={6} key={key}>
                        <Form.Group controlId={`price-${key}`}>
                          <Form.Label className="small text-muted">{label}</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control type="number" min={0} value={prices[key]} onChange={e => updatePrice(key, e.target.value)} />
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    ))}
                  </Row>
                  <div className="text-end mt-3">
                    <Button variant="outline-secondary" size="sm" onClick={() => setPrices({ ...DEFAULT_PRICES })}>
                      <RotateCcw size={14} className="me-1" />Restablecer valores iniciales
                    </Button>
                  </div>
                </Card.Body>
              )}
            </Card>
          </Col>

          <Col lg={5}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-bottom py-3">
                <Step n={3}>
                  <div>
                    <strong>Resumen de cotización</strong>
                    <div className="small text-muted">{SERVICES[selectedService].name}</div>
                  </div>
                </Step>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <Alert variant={result.direct ? 'success' : 'warning'} className="border-0">
                  <div className="d-flex align-items-start gap-2">
                    <ClipboardList size={19} className="flex-shrink-0 mt-1" />
                    <div>
                      <div className="small text-uppercase fw-bold">{result.direct ? 'Cotización directa' : 'Validación requerida'}</div>
                      <div className="fw-bold mt-1">{result.title}</div>
                      <div className="small mt-2">{result.message}</div>
                    </div>
                  </div>
                </Alert>

                <div className="fw-semibold small mb-2">Detalle de valores</div>

                {result.lines.length ? result.lines.map(line => (
                  <div key={line.id} className="d-flex justify-content-between gap-3 py-3 border-bottom">
                    <div className="min-w-0">
                      <div className="small fw-semibold">
                        {line.itemType === 'product' && (
                          <Badge bg="info" text="dark" className="me-2" style={{ fontSize: '0.6rem' }}>Material</Badge>
                        )}
                        {line.amount < 0 && (
                          <Badge bg="success" text="dark" className="me-2" style={{ fontSize: '0.6rem' }}>Descuento</Badge>
                        )}
                        {line.description}
                      </div>
                      <div className="small text-muted">{line.detail}</div>
                    </div>
                    <div className={`small fw-semibold text-nowrap ${line.amount < 0 ? 'text-success' : ''}`}>
                      {line.amount < 0 ? `−${money(-line.amount)}` : money(line.amount)}
                    </div>
                  </div>
                )) : (
                  <div className="small text-muted py-3">No hay conceptos calculados.</div>
                )}

                <div className="mt-3 pt-2">
                  <Row2 className="small mb-2" l={<span className="text-muted">Subtotal</span>} r={money(result.subtotal)} />
                  <Row2 className="small mb-2" l={<span className="text-muted">IVA estimado (19%)</span>} r={money(estimatedTax)} />
                  <div className="d-flex justify-content-between align-items-end border-top pt-3 mt-2">
                    <div>
                      <div className="small text-uppercase text-muted fw-bold">Total estimado con IVA</div>
                      <div className="small text-muted">COP · sujeto a validación</div>
                    </div>
                    <div className="fs-3 fw-bold text-primary text-end">{money(estimatedTotal)}</div>
                  </div>
                </div>

                <Card className="bg-light border-0 mt-4">
                  <Card.Body>
                    <div className="small text-uppercase text-muted fw-bold">Guion sugerido para el vendedor</div>
                    <p className="small mt-2 mb-0">{result.script}</p>
                  </Card.Body>
                </Card>

                <div className="mt-auto pt-3">
                  <Button variant="primary" className="w-100 py-2 fw-semibold" onClick={handleAddToQuote}>
                    <PlusCircle size={17} className="me-2" />Agregar conceptos a cotización
                  </Button>
                  <Button variant="outline-secondary" className="w-100 mt-2" onClick={copyQuote}>
                    <Copy size={16} className="me-2" />Copiar resumen
                  </Button>
                  <div className="small text-muted mt-3">
                    El IVA mostrado es una estimación. Confirme la configuración tributaria de cada concepto en el ERP antes de emitir la cotización definitiva.
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>
  );
}