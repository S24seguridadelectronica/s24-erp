import { useEffect, useMemo, useState } from 'react';
import {
  Modal, Button, Form, Row, Col, Card, Alert, Badge, InputGroup,
} from 'react-bootstrap';
import {
  Calculator, Copy, Wrench, Video, RotateCcw, Settings, Globe,
  Smartphone, KeyRound, HardDrive, Power, PlusCircle, CheckCircle2,
  ClipboardList, MapPin, Package, Clock3, Info, Ruler, ArrowUp, Zap,
} from 'lucide-react';

/* =========================================================================
 * Tipos base
 * ========================================================================= */

interface CalcularServiciosProps {
  show: boolean;
  onHide: () => void;
  onAddItems: (items: QuoteItem[]) => void;
}

interface QuoteItem {
  item_type: 'product' | 'service';
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

type ServiceKey =
  | 'maintenance' | 'video' | 'reset' | 'configuration' | 'remote'
  | 'app' | 'password' | 'recording' | 'power' | 'other';

type PriceKey =
  | 'pReset' | 'pConfiguration' | 'pRemote' | 'pApp' | 'pPassword' | 'pRecording'
  | 'pVisit' | 'pPower' | 'pOther'
  | 'pAccessDistance' | 'pAccessHeight' | 'pAccessHeightDistance'
  | 'pDvrAccessBase' | 'pDvrAccessDistance' | 'pDvrAccessHeight'
  | 'pDvrExtraChannel' | 'pDvrDifficultySurcharge'
  | 'pCableDistanceRate' | 'pCableHeightRate';

type VideoCause =
  | 'balun' | 'power' | 'splice' | 'cable'
  | 'camera' | 'dvr-channel' | 'unknown';

type VideoMaterialKey =
  | 'cable' | 'powerSupply' | 'videoBalun' | 'camera' | 'dvrChannel';

type MaintenanceTaskKey =
  | 'lensAndHousingCleaning'
  | 'powerSupplyChange'
  | 'videoBalunChange'
  | 'cableChange'
  | 'junctionBoxChange'
  | 'internalDvrCleaning'
  | 'resplice'
  | 'batteryChange'
  | 'firmwareUpdate';

type MaintenanceMaterialKey =
  | 'powerSupply' | 'videoBalun' | 'cable'
  | 'junctionBox' | 'cr2032Battery' | 'bncConnector';

type DvrDifficulty = 'easy' | 'difficult';

interface ServiceDefinition {
  icon: typeof Wrench;
  label: string;
  description: string;
}

interface ServiceLine {
  id: string;
  description: string;
  detail: string;
  amount: number;
  itemType: 'service' | 'product';
}

interface CalculationResult {
  direct: boolean;
  title: string;
  message: string;
  script: string;
  lines: ServiceLine[];
  subtotal: number;
}

interface VideoCauseDefinition {
  value: VideoCause;
  label: string;
  suggestedMaterials: VideoMaterialKey[];
}

interface VideoMaterialDefinition {
  key: VideoMaterialKey;
  label: string;
  unit: string;
  defaultQuantity: number;
  defaultPrice: number;
}

interface MaintenanceTaskDefinition {
  key: MaintenanceTaskKey;
  label: string;
  unit: string;
  defaultQuantity: number;
  defaultPrice: number;
  perCamera?: boolean;
  laborOnly?: boolean;
}

interface MaintenanceMaterialDefinition {
  key: MaintenanceMaterialKey;
  label: string;
  unit: string;
  defaultQuantity: number;
  defaultPrice: number;
}

interface MaterialState {
  selected: boolean;
  quantity: number;
  unitPrice: number;
}

/* =========================================================================
 * Catálogos
 * ========================================================================= */

const SERVICES: Record<ServiceKey, ServiceDefinition> = {
  maintenance: { icon: Wrench, label: 'Mantenimiento preventivo', description: 'Revisión, limpieza y pruebas del sistema.' },
  video: { icon: Video, label: 'Pérdida de video', description: 'Una o varias cámaras no muestran imagen.' },
  reset: { icon: RotateCcw, label: 'Reseteo DVR/NVR', description: 'Restablecimiento sujeto a compatibilidad.' },
  configuration: { icon: Settings, label: 'Configuración DVR/NVR', description: 'Ajustes y puesta a punto del grabador.' },
  remote: { icon: Globe, label: 'Acceso remoto', description: 'Visualización desde celular o computador.' },
  app: { icon: Smartphone, label: 'Configuración de aplicación', description: 'Instalación y vinculación de la app.' },
  password: { icon: KeyRound, label: 'Contraseña', description: 'Cambio o recuperación según fabricante.' },
  recording: { icon: HardDrive, label: 'Revisión de grabaciones', description: 'Revisión de configuración y almacenamiento.' },
  power: { icon: Power, label: 'Alimentación eléctrica', description: 'Revisión inicial de fuente y conexiones.' },
  other: { icon: PlusCircle, label: 'Otro servicio', description: 'Requiere descripción y evaluación.' },
};

const SERVICE_NAMES: Record<ServiceKey, string> = {
  maintenance: 'Mantenimiento preventivo',
  video: 'Atención por pérdida de video',
  reset: 'Reseteo DVR/NVR',
  configuration: 'Configuración DVR/NVR',
  remote: 'Configuración de acceso remoto',
  app: 'Configuración de aplicación',
  password: 'Cambio o recuperación de contraseña',
  recording: 'Revisión de grabaciones',
  power: 'Revisión de alimentación',
  other: 'Otro servicio',
};

const DEFAULT_PRICES: Record<PriceKey, number> = {
  pReset: 80000,
  pConfiguration: 100000,
  pRemote: 90000,
  pApp: 60000,
  pPassword: 70000,
  pRecording: 90000,
  pVisit: 80000,
  pPower: 80000,
  pOther: 80000,
  pAccessDistance: 1500,
  pAccessHeight: 15000,
  pAccessHeightDistance: 2000,
  pDvrAccessBase: 60000,
  pDvrAccessDistance: 1500,
  pDvrAccessHeight: 15000,
  pDvrExtraChannel: 5000,
  pDvrDifficultySurcharge: 20,
  pCableDistanceRate: 1500,
  pCableHeightRate: 15000,
};

const PRICE_FIELDS: { key: PriceKey; label: string }[] = [
  { key: 'pReset', label: 'Reseteo DVR/NVR' },
  { key: 'pConfiguration', label: 'Configuración DVR/NVR' },
  { key: 'pRemote', label: 'Acceso remoto' },
  { key: 'pApp', label: 'Configuración de aplicación' },
  { key: 'pPassword', label: 'Cambio / recuperación de contraseña' },
  { key: 'pRecording', label: 'Revisión de grabaciones' },
  { key: 'pVisit', label: 'Visita / diagnóstico técnico' },
  { key: 'pPower', label: 'Pérdida de video / alimentación' },
  { key: 'pOther', label: 'Evaluación de otro servicio' },
  { key: 'pAccessDistance', label: 'Accesibilidad cámaras — metro de distancia adicional' },
  { key: 'pAccessHeight', label: 'Accesibilidad cámaras — metro de altura adicional' },
  { key: 'pAccessHeightDistance', label: 'Accesibilidad cámaras — penalización por altura sobre la distancia (por metro)' },
  { key: 'pDvrAccessBase', label: 'Accesibilidad DVR — base (0–10 m / 0–3 m / 0–4 canales)' },
  { key: 'pDvrAccessDistance', label: 'Accesibilidad DVR — metro de distancia adicional' },
  { key: 'pDvrAccessHeight', label: 'Accesibilidad DVR — metro de altura adicional' },
  { key: 'pDvrExtraChannel', label: 'Accesibilidad DVR — canal de video adicional (desde el 5.º)' },
  { key: 'pDvrDifficultySurcharge', label: 'Accesibilidad DVR — recargo por dificultad (%)' },
  { key: 'pCableDistanceRate', label: 'Cambio de cableado — metro de distancia adicional' },
  { key: 'pCableHeightRate', label: 'Cambio de cableado — metro de altura adicional' },
];

/* --- Mantenimiento: tareas (todas mano de obra) --- */
const MAINTENANCE_TASKS: MaintenanceTaskDefinition[] = [
  { key: 'lensAndHousingCleaning', label: 'Limpieza de lentes y carcaza',              unit: 'cámara',  defaultQuantity: 8, defaultPrice: 35000, perCamera: true, laborOnly: true },
  { key: 'powerSupplyChange',      label: 'Cambio de fuente (mano de obra)',           unit: 'unidad',  defaultQuantity: 1, defaultPrice: 45000, laborOnly: true },
  { key: 'videoBalunChange',       label: 'Cambio de video baluns (mano de obra)',     unit: 'par',     defaultQuantity: 1, defaultPrice: 45000, laborOnly: true },
  { key: 'cableChange',            label: 'Cambio de cableado (mano de obra)',         unit: 'punto',   defaultQuantity: 1, defaultPrice: 50000, laborOnly: true },
  { key: 'junctionBoxChange',      label: 'Cambio de caja de paso (mano de obra)',     unit: 'unidad',  defaultQuantity: 1, defaultPrice: 15000, laborOnly: true },
  { key: 'internalDvrCleaning',    label: 'Limpieza interna de DVR/NVR',               unit: 'equipo',  defaultQuantity: 1, defaultPrice: 30000, laborOnly: true },
  { key: 'resplice',               label: 'Reempalme de empalmes',                     unit: 'empalme', defaultQuantity: 1, defaultPrice: 45000, laborOnly: true },
  { key: 'batteryChange',          label: 'Cambio de batería interna del DVR',         unit: 'equipo',  defaultQuantity: 1, defaultPrice: 20000, laborOnly: true },
  { key: 'firmwareUpdate',         label: 'Actualización de firmware',                 unit: 'equipo',  defaultQuantity: 1, defaultPrice: 40000, laborOnly: true },
];

const MAINTENANCE_MATERIALS: MaintenanceMaterialDefinition[] = [
  { key: 'powerSupply',   label: 'Fuente de alimentación',     unit: 'unidad', defaultQuantity: 1,  defaultPrice: 45000 },
  { key: 'videoBalun',    label: 'Video balun',                unit: 'par',    defaultQuantity: 1,  defaultPrice: 25000 },
  { key: 'cable',         label: 'Cable UTP / coaxial',        unit: 'metros', defaultQuantity: 20, defaultPrice: 3500 },
  { key: 'junctionBox',   label: 'Caja de paso',               unit: 'unidad', defaultQuantity: 1,  defaultPrice: 8000 },
  { key: 'cr2032Battery', label: 'Batería interna (CR2032)',   unit: 'unidad', defaultQuantity: 1,  defaultPrice: 5000 },
  { key: 'bncConnector',  label: 'Conector BNC',               unit: 'unidad', defaultQuantity: 1,  defaultPrice: 3000 },
];

const INITIAL_MAINTENANCE_TASKS: Record<MaintenanceTaskKey, MaterialState> = {
  lensAndHousingCleaning: { selected: true,  quantity: 8, unitPrice: 35000 },
  powerSupplyChange:      { selected: false, quantity: 1, unitPrice: 45000 },
  videoBalunChange:       { selected: false, quantity: 1, unitPrice: 45000 },
  cableChange:            { selected: false, quantity: 1, unitPrice: 50000 },
  junctionBoxChange:      { selected: false, quantity: 1, unitPrice: 15000 },
  internalDvrCleaning:    { selected: false, quantity: 1, unitPrice: 30000 },
  resplice:               { selected: false, quantity: 1, unitPrice: 45000 },
  batteryChange:          { selected: false, quantity: 1, unitPrice: 20000 },
  firmwareUpdate:         { selected: false, quantity: 1, unitPrice: 40000 },
};

const INITIAL_MAINTENANCE_MATERIALS: Record<MaintenanceMaterialKey, MaterialState> = {
  powerSupply:   { selected: false, quantity: 1,  unitPrice: 45000 },
  videoBalun:    { selected: false, quantity: 1,  unitPrice: 25000 },
  cable:         { selected: false, quantity: 20, unitPrice: 3500 },
  junctionBox:   { selected: false, quantity: 1,  unitPrice: 8000 },
  cr2032Battery: { selected: false, quantity: 1,  unitPrice: 5000 },
  bncConnector:  { selected: false, quantity: 1,  unitPrice: 3000 },
};

/* --- Video --- */
const VIDEO_CAUSES: VideoCauseDefinition[] = [
  { value: 'balun',       label: 'Video balun defectuoso',                 suggestedMaterials: ['videoBalun'] },
  { value: 'power',       label: 'Fuente de alimentación',                  suggestedMaterials: ['powerSupply'] },
  { value: 'splice',      label: 'Empalme o conector en mal estado',        suggestedMaterials: [] },
  { value: 'cable',       label: 'Cable dañado (requiere cambio)',          suggestedMaterials: ['cable'] },
  { value: 'camera',      label: 'Cámara dañada',                           suggestedMaterials: ['camera'] },
  { value: 'dvr-channel', label: 'Canal del DVR/NVR dañado',                suggestedMaterials: ['dvrChannel'] },
  { value: 'unknown',     label: 'No se sabe / requiere diagnóstico',       suggestedMaterials: [] },
];

const VIDEO_MATERIALS: VideoMaterialDefinition[] = [
  { key: 'cable',       label: 'Cable UTP / coaxial',        unit: 'metros', defaultQuantity: 20, defaultPrice: 3500 },
  { key: 'powerSupply', label: 'Fuente de alimentación',     unit: 'unidad', defaultQuantity: 1,  defaultPrice: 45000 },
  { key: 'videoBalun',  label: 'Video balun',                unit: 'par',    defaultQuantity: 1,  defaultPrice: 25000 },
  { key: 'camera',      label: 'Cámara de seguridad',        unit: 'unidad', defaultQuantity: 1,  defaultPrice: 180000 },
  { key: 'dvrChannel',  label: 'Reemplazo de canal DVR/NVR', unit: 'unidad', defaultQuantity: 1,  defaultPrice: 250000 },
];

const INITIAL_VIDEO_MATERIALS: Record<VideoMaterialKey, MaterialState> = {
  cable:       { selected: false, quantity: 20, unitPrice: 3500 },
  powerSupply: { selected: false, quantity: 1,  unitPrice: 45000 },
  videoBalun:  { selected: false, quantity: 1,  unitPrice: 25000 },
  camera:      { selected: false, quantity: 1,  unitPrice: 180000 },
  dvrChannel:  { selected: false, quantity: 1,  unitPrice: 250000 },
};

/* =========================================================================
 * Constantes
 * ========================================================================= */

const BASE_DISTANCE_M = 10;
const BASE_HEIGHT_M = 3;
const BASE_DVR_DISTANCE_M = 10;
const BASE_DVR_HEIGHT_M = 3;
const BASE_DVR_CHANNELS = 4;

/* =========================================================================
 * Helpers
 * ========================================================================= */

const money = (value: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number.isFinite(value) ? value : 0);

const nonNegative = (value: unknown) => Math.max(0, Number(value) || 0);

function calcularExcedenteAccesibilidadCamaras(
  avgDistance: number,
  avgHeight: number,
  prices: Record<PriceKey, number>,
) {
  const extraDistance = Math.max(0, avgDistance - BASE_DISTANCE_M);
  const extraHeight = Math.max(0, avgHeight - BASE_HEIGHT_M);
  const distanceRate = prices.pAccessDistance + extraHeight * prices.pAccessHeightDistance;
  const distanceCost = extraDistance * distanceRate;
  const heightCost = extraHeight * prices.pAccessHeight;
  return {
    extraDistance,
    extraHeight,
    distanceRate,
    distanceCost,
    heightCost,
    total: distanceCost + heightCost,
  };
}

function calcularAccesibilidadDvr(
  distance: number,
  height: number,
  channels: number,
  difficulty: DvrDifficulty,
  prices: Record<PriceKey, number>,
) {
  const extraDistance = Math.max(0, distance - BASE_DVR_DISTANCE_M);
  const extraHeight = Math.max(0, height - BASE_DVR_HEIGHT_M);
  const extraChannels = Math.max(0, Math.floor(channels) - BASE_DVR_CHANNELS);
  const base = prices.pDvrAccessBase;
  const distanceCost = extraDistance * prices.pDvrAccessDistance;
  const heightCost = extraHeight * prices.pDvrAccessHeight;
  const channelCost = extraChannels * prices.pDvrExtraChannel;
  const subtotal = base + distanceCost + heightCost + channelCost;
  const difficultyCost = difficulty === 'difficult'
    ? Math.round(subtotal * (prices.pDvrDifficultySurcharge / 100))
    : 0;
  return {
    base,
    extraDistance,
    extraHeight,
    extraChannels,
    distanceCost,
    heightCost,
    channelCost,
    subtotal,
    difficultyCost,
    difficultyLabel: difficulty === 'difficult' ? 'Difícil acceso' : 'Fácil acceso',
    difficultyPercent: difficulty === 'difficult' ? prices.pDvrDifficultySurcharge : 0,
    total: subtotal + difficultyCost,
  };
}

/**
 * Monto total del "Cambio de cableado":
 *   - $50.000 por punto, con 10 m de distancia y 3 m de altura incluidos.
 *   - El técnico puede ajustar los metros específicos del cableado (independiente
 *     de la "distancia/altura promedio" de las cámaras).
 *   - Cada metro extra de distancia se cobra a pCableDistanceRate ($1.500/m).
 *   - Cada metro extra de altura se cobra a pCableHeightRate ($15.000/m).
 */
function calcularMontoCableado(
  task: MaterialState,
  cableDistance: number,
  cableHeight: number,
  prices: Record<PriceKey, number>,
) {
  if (!task.selected) {
    return { total: 0, baseAmount: 0, distanceExcess: 0, heightExcess: 0, extraDistance: 0, extraHeight: 0 };
  }
  const extraDistance = Math.max(0, cableDistance - BASE_DISTANCE_M);
  const extraHeight = Math.max(0, cableHeight - BASE_HEIGHT_M);
  const baseAmount = task.quantity * task.unitPrice;
  const distanceExcess = task.quantity * extraDistance * prices.pCableDistanceRate;
  const heightExcess = task.quantity * extraHeight * prices.pCableHeightRate;
  return {
    total: baseAmount + distanceExcess + heightExcess,
    baseAmount,
    distanceExcess,
    heightExcess,
    extraDistance,
    extraHeight,
  };
}

/* =========================================================================
 * Componente
 * ========================================================================= */

export function CalcularServicios({ show, onHide, onAddItems }: CalcularServiciosProps) {
  const [selectedService, setSelectedService] = useState<ServiceKey>('maintenance');
  const [showPrices, setShowPrices] = useState(false);
  const [prices, setPrices] = useState<Record<PriceKey, number>>({ ...DEFAULT_PRICES });

  const [videoCause, setVideoCause] = useState<VideoCause>('unknown');
  const [videoMaterials, setVideoMaterials] = useState<Record<VideoMaterialKey, MaterialState>>(
    () => ({ ...INITIAL_VIDEO_MATERIALS }),
  );

  const [maintenanceTasks, setMaintenanceTasks] = useState<Record<MaintenanceTaskKey, MaterialState>>(
    () => ({ ...INITIAL_MAINTENANCE_TASKS }),
  );
  const [maintenanceMaterials, setMaintenanceMaterials] = useState<Record<MaintenanceMaterialKey, MaterialState>>(
    () => ({ ...INITIAL_MAINTENANCE_MATERIALS }),
  );

  const [includeDvrAccess, setIncludeDvrAccess] = useState(false);

  const [data, setData] = useState({
    cameras: '8',
    device: 'DVR',
    knownCause: 'yes',
    affected: '1',
    internet: 'yes',
    otherText: '',
    travel: '20000',
    materials: '0',
    extraLabor: '0',
    avgDistance: '10',
    avgHeight: '3',
    dvrDistance: '10',
    dvrHeight: '3',
    dvrChannels: '4',
    dvrDifficulty: 'easy' as DvrDifficulty,
    // Metros específicos del cambio de cableado (base: 10 m / 3 m)
    cableDistance: '10',
    cableHeight: '3',
  });

  const updateField = (field: keyof typeof data, value: string) => {
    setData(previous => ({ ...previous, [field]: value }));
  };

  const updatePrice = (field: PriceKey, value: string) => {
    setPrices(previous => ({ ...previous, [field]: nonNegative(value) }));
  };

  /* Sincroniza la cantidad de "Limpieza de lentes y carcaza" con la cantidad de cámaras. */
  useEffect(() => {
    const count = Math.max(1, Math.floor(Number(data.cameras) || 1));
    setMaintenanceTasks(prev => ({
      ...prev,
      lensAndHousingCleaning: { ...prev.lensAndHousingCleaning, quantity: count },
    }));
  }, [data.cameras]);

  const syncTaskQuantityToCameras = (key: MaintenanceTaskKey) => {
    const cameraCount = Math.max(1, Math.floor(Number(data.cameras) || 1));
    setMaintenanceTasks(prev => ({
      ...prev,
      [key]: { ...prev[key], quantity: cameraCount },
    }));
  };

  const handleVideoCauseChange = (cause: VideoCause) => {
    setVideoCause(cause);
    const definition = VIDEO_CAUSES.find(c => c.value === cause);
    setVideoMaterials(prev => {
      const next: Record<VideoMaterialKey, MaterialState> = { ...prev };
      (Object.keys(next) as VideoMaterialKey[]).forEach(key => {
        next[key] = { ...next[key], selected: false };
      });
      definition?.suggestedMaterials.forEach(key => {
        next[key] = { ...next[key], selected: true };
      });
      return next;
    });
  };

  const videoMaterialsTotal = useMemo(
    () => (Object.entries(videoMaterials) as [VideoMaterialKey, MaterialState][]).reduce(
      (sum, [, mat]) => (mat.selected ? sum + mat.quantity * mat.unitPrice : sum),
      0,
    ),
    [videoMaterials],
  );

  const avgDistanceNum = nonNegative(data.avgDistance);
  const avgHeightNum = nonNegative(data.avgHeight);
  const cableDistanceNum = nonNegative(data.cableDistance);
  const cableHeightNum = nonNegative(data.cableHeight);

  const maintenanceExtrasTotal = useMemo(() => {
    const tasksTotal = (Object.entries(maintenanceTasks) as [MaintenanceTaskKey, MaterialState][])
      .reduce((sum, [key, t]) => {
        if (!t.selected) return sum;
        if (key === 'cableChange') {
          return sum + calcularMontoCableado(t, cableDistanceNum, cableHeightNum, prices).total;
        }
        return sum + t.quantity * t.unitPrice;
      }, 0);
    const mats = (Object.entries(maintenanceMaterials) as [MaintenanceMaterialKey, MaterialState][])
      .reduce((sum, [, m]) => (m.selected ? sum + m.quantity * m.unitPrice : sum), 0);
    return tasksTotal + mats;
  }, [maintenanceTasks, maintenanceMaterials, cableDistanceNum, cableHeightNum, prices]);

  const cameraAccessExcess = useMemo(
    () => calcularExcedenteAccesibilidadCamaras(avgDistanceNum, avgHeightNum, prices),
    [avgDistanceNum, avgHeightNum, prices],
  );

  const dvrAccessPreview = useMemo(
    () => calcularAccesibilidadDvr(
      nonNegative(data.dvrDistance),
      nonNegative(data.dvrHeight),
      nonNegative(data.dvrChannels),
      data.dvrDifficulty,
      prices,
    ),
    [data.dvrDistance, data.dvrHeight, data.dvrChannels, data.dvrDifficulty, prices],
  );

  const result = useMemo<CalculationResult>(() => {
    const cameraCount = Math.max(1, Math.floor(Number(data.cameras) || 1));
    const travel = nonNegative(data.travel);
    const materials = nonNegative(data.materials);
    const extraLabor = nonNegative(data.extraLabor);
    const lines: ServiceLine[] = [];
    let direct = true;
    let title = 'Cotización preliminar disponible';
    let message = 'Confirme el alcance del trabajo y los valores con el cliente antes de generar la cotización.';
    let script = '';
    let serviceAmount = 0;

    const addLine = (
      id: string,
      description: string,
      detail: string,
      amount: number,
      itemType: 'service' | 'product' = 'service',
    ) => {
      lines.push({ id, description, detail, amount: nonNegative(amount), itemType });
    };

    switch (selectedService) {
      case 'maintenance': {
        // 1) Excedente de accesibilidad de cámaras (solo si >10 m o >3 m)
        if (cameraAccessExcess.total > 0) {
          const detailParts: string[] = [];
          if (cameraAccessExcess.extraDistance > 0) {
            detailParts.push(`${cameraAccessExcess.extraDistance} m dist × ${money(cameraAccessExcess.distanceRate)}/m`);
          }
          if (cameraAccessExcess.extraHeight > 0) {
            detailParts.push(`${cameraAccessExcess.extraHeight} m alt × ${money(prices.pAccessHeight)}/m`);
          }
          addLine(
            'camera-access-excess',
            'Accesibilidad adicional de cámaras',
            detailParts.join(' · ') + ' (base 10 m / 3 m incluida)',
            cameraAccessExcess.total,
          );
        }

        // 2) Accesibilidad DVR/NVR (opcional)
        if (includeDvrAccess) {
          const dvrAccess = calcularAccesibilidadDvr(
            nonNegative(data.dvrDistance),
            nonNegative(data.dvrHeight),
            nonNegative(data.dvrChannels),
            data.dvrDifficulty,
            prices,
          );
          const dvrDetailParts: string[] = [
            `${data.dvrDistance || 0} m al tomacorriente`,
            `${data.dvrHeight || 0} m altura`,
            `${data.dvrChannels || 0} canales`,
          ];
          if (dvrAccess.extraDistance > 0) dvrDetailParts.push(`+${dvrAccess.extraDistance} m dist`);
          if (dvrAccess.extraHeight > 0) dvrDetailParts.push(`+${dvrAccess.extraHeight} m alt`);
          if (dvrAccess.extraChannels > 0) dvrDetailParts.push(`+${dvrAccess.extraChannels} canales`);
          dvrDetailParts.push(dvrAccess.difficultyLabel);
          if (dvrAccess.difficultyCost > 0) dvrDetailParts.push(`+${dvrAccess.difficultyPercent}% dificultad`);
          addLine(
            'dvr-accessibility',
            `Accesibilidad de ${data.device}`,
            dvrDetailParts.join(' · '),
            dvrAccess.total,
          );
        }

        // 3) Tareas (mano de obra) — cálculo especial para cableado
        (Object.entries(maintenanceTasks) as [MaintenanceTaskKey, MaterialState][]).forEach(([key, task]) => {
          if (!task.selected) return;
          const def = MAINTENANCE_TASKS.find(t => t.key === key);

          if (key === 'cableChange') {
            const cable = calcularMontoCableado(task, cableDistanceNum, cableHeightNum, prices);
            if (cable.total <= 0) return;
            const detailParts: string[] = [`${task.quantity} punto(s) × ${money(task.unitPrice)}`];
            if (cable.extraDistance > 0) detailParts.push(`+${cable.extraDistance} m dist × ${money(prices.pCableDistanceRate)}/m`);
            if (cable.extraHeight > 0) detailParts.push(`+${cable.extraHeight} m alt × ${money(prices.pCableHeightRate)}/m`);
            addLine(
              `maint-task-${key}`,
              def?.label ?? key,
              detailParts.join(' ') + ` · ${cableDistanceNum} m / ${cableHeightNum} m`,
              cable.total,
            );
            return;
          }

          const amount = task.quantity * task.unitPrice;
          if (amount <= 0) return;
          addLine(
            `maint-task-${key}`,
            def?.label ?? key,
            `${task.quantity} ${def?.unit ?? 'und'} × ${money(task.unitPrice)}`,
            amount,
          );
        });

        // 4) Materiales
        (Object.entries(maintenanceMaterials) as [MaintenanceMaterialKey, MaterialState][]).forEach(([key, mat]) => {
          if (!mat.selected) return;
          const amount = mat.quantity * mat.unitPrice;
          if (amount <= 0) return;
          const def = MAINTENANCE_MATERIALS.find(m => m.key === key);
          addLine(
            `maint-material-${key}`,
            def?.label ?? key,
            `${mat.quantity} ${def?.unit ?? 'und'} × ${money(mat.unitPrice)}`,
            amount,
            'product',
          );
        });

        script = `La cotización parte de la limpieza de lentes y carcaza para las ${cameraCount} cámaras (incluye hasta 10 m de distancia y 3 m de altura). A partir de ahí se van sumando los servicios puntuales (cambio de fuente, baluns, reempalme, cableado, caja de paso, etc.) y los materiales que el técnico identifique.`;
        break;
      }

      case 'video': {
        if (videoCause === 'unknown') {
          direct = false;
          serviceAmount = prices.pVisit;
          title = 'Requiere diagnóstico técnico';
          message = 'La causa no está confirmada. El valor corresponde a visita o diagnóstico, no a una reparación garantizada.';
          script = 'Para determinar qué está ocasionando la pérdida de video, un técnico debe revisar el sistema. La reparación y los repuestos se cotizan después del diagnóstico.';
          addLine('diagnostic-visit', 'Visita / diagnóstico técnico', 'Evaluación en sitio; reparación no incluida', serviceAmount);
        } else {
          const affectedMap: Record<string, { factor: number; label: string }> = {
            '1':   { factor: 0.75, label: '1 cámara afectada' },
            '2-4': { factor: 1,    label: '2 a 4 cámaras afectadas' },
            '5-8': { factor: 1.5,  label: '5 a 8 cámaras afectadas' },
            '9+':  { factor: 2,    label: 'Más de 8 cámaras afectadas' },
          };
          const affected = affectedMap[data.affected] ?? affectedMap['1'];
          const causeDef = VIDEO_CAUSES.find(c => c.value === videoCause);

          serviceAmount = Math.round(prices.pPower * affected.factor);
          addLine(
            'video-loss',
            'Atención por pérdida de video',
            `${causeDef?.label ?? 'Causa identificada'} · ${affected.label}`,
            serviceAmount,
          );

          (Object.entries(videoMaterials) as [VideoMaterialKey, MaterialState][]).forEach(([key, mat]) => {
            if (!mat.selected) return;
            const amount = mat.quantity * mat.unitPrice;
            if (amount <= 0) return;
            const matDef = VIDEO_MATERIALS.find(m => m.key === key);
            addLine(
              `material-${key}`,
              matDef?.label ?? key,
              `${mat.quantity} ${matDef?.unit ?? 'und'} × ${money(mat.unitPrice)}`,
              amount,
              'product',
            );
          });

          script = 'Cotizamos la atención según la causa informada y los materiales probables. Cualquier material o trabajo no descrito se aprueba con el cliente antes de ejecutarlo.';
        }
        break;
      }

      case 'reset':
        serviceAmount = prices.pReset;
        addLine('reset', `Reseteo de ${data.device}`, 'Sujeto al procedimiento compatible con el fabricante', serviceAmount);
        script = 'El valor corresponde al procedimiento de reseteo. Si el fabricante requiere un proceso especial o una visita adicional, se informa antes de continuar.';
        break;

      case 'configuration':
        serviceAmount = prices.pConfiguration;
        addLine('configuration', `Configuración de ${data.device}`, 'No incluye repuestos ni ampliaciones de cableado', serviceAmount);
        script = 'Podemos realizar la configuración del grabador. El valor no incluye repuestos ni trabajos adicionales no descritos.';
        break;

      case 'remote':
      case 'app': {
        if (data.internet !== 'yes') {
          direct = false;
          serviceAmount = prices.pVisit;
          title = 'Validar conexión antes de cotizar';
          message = 'No se ha confirmado que exista una conexión a internet funcional. El valor mostrado corresponde a visita o diagnóstico.';
          script = 'Para configurar el acceso remoto o vincular la aplicación, primero debemos verificar la conexión, la compatibilidad del equipo y los permisos necesarios.';
          addLine('connectivity-visit', 'Visita / diagnóstico de conectividad', 'Configuración final no garantizada', serviceAmount);
        } else {
          serviceAmount = selectedService === 'remote' ? prices.pRemote : prices.pApp;
          const description = selectedService === 'remote' ? 'Configuración de acceso remoto' : 'Configuración de aplicación';
          addLine('app-setup', description, `Equipo: ${data.device}; requiere compatibilidad e internet`, serviceAmount);
          script = 'Podemos realizar la configuración si el equipo es compatible, hay internet y se cuenta con los accesos necesarios.';
        }
        break;
      }

      case 'password':
        serviceAmount = prices.pPassword;
        addLine('password', 'Cambio / recuperación de contraseña', `Equipo: ${data.device}; sujeto al método del fabricante`, serviceAmount);
        script = 'El procedimiento depende de la marca, el modelo y la validación de propiedad del equipo. No se garantiza el restablecimiento hasta confirmar el método disponible.';
        break;

      case 'recording':
        if (data.knownCause !== 'yes') {
          direct = false;
          serviceAmount = prices.pVisit;
          title = 'Requiere diagnóstico técnico';
          message = 'No está confirmada la causa del problema de grabación. El diagnóstico no incluye reparación ni disco duro.';
          script = 'Debemos revisar la configuración, el almacenamiento y el estado del equipo para identificar la causa. Los repuestos se cotizan aparte.';
          addLine('recording-diagnostic', 'Visita / diagnóstico de grabación', 'Revisión en sitio; repuestos no incluidos', serviceAmount);
        } else {
          serviceAmount = prices.pRecording;
          addLine('recording-review', 'Revisión de grabaciones', `Equipo: ${data.device}`, serviceAmount);
          script = 'Atenderemos la revisión indicada. Si se identifica un daño de hardware, se informa y se cotiza antes de cambiar piezas.';
        }
        break;

      case 'power':
        if (data.knownCause !== 'yes') {
          direct = false;
          serviceAmount = prices.pVisit;
          title = 'Requiere diagnóstico técnico';
          message = 'No se ha confirmado si la falla corresponde a la fuente, el cableado, los conectores o el equipo.';
          script = 'Un técnico debe revisar la alimentación y las conexiones. Cualquier material o reparación adicional se informa antes de realizarse.';
          addLine('power-diagnostic', 'Visita / diagnóstico de alimentación', 'Repuestos y reparación no incluidos', serviceAmount);
        } else {
          serviceAmount = prices.pPower;
          addLine('power-review', 'Revisión de alimentación', 'Fuente, conexiones y cableado accesible', serviceAmount);
          script = 'Atenderemos la revisión indicada. Los materiales o repuestos adicionales se cotizan por separado si son necesarios.';
        }
        break;

      case 'other':
        direct = false;
        serviceAmount = prices.pOther;
        title = 'Requiere evaluación técnica';
        message = 'El servicio no está parametrizado. El precio mostrado es una referencia de evaluación, no una cotización de reparación.';
        addLine('other-evaluation', 'Evaluación de servicio personalizado', data.otherText.trim() || 'Descripción pendiente del cliente', serviceAmount);
        script = 'Cuéntenos qué está ocurriendo. Validaremos el alcance y coordinaremos una evaluación antes de confirmar el precio final.';
        break;
    }

    if (travel > 0) addLine('travel', 'Desplazamiento', 'Cargo adicional', travel);
    if (materials > 0) addLine('materials', 'Otros materiales / repuestos', 'Valor ingresado manualmente', materials, 'product');
    if (extraLabor > 0) addLine('extra-labor', 'Mano de obra adicional', 'Cargo adicional', extraLabor);

    return {
      direct,
      title,
      message,
      script,
      lines,
      subtotal: lines.reduce((sum, line) => sum + line.amount, 0),
    };
  }, [
    data, prices, selectedService,
    videoCause, videoMaterials,
    maintenanceTasks, maintenanceMaterials,
    includeDvrAccess, cameraAccessExcess,
    avgDistanceNum, avgHeightNum,
    cableDistanceNum, cableHeightNum,
  ]);

  const estimatedTax = Math.round(result.subtotal * 0.19);
  const estimatedTotal = result.subtotal + estimatedTax;

  const handleAddToQuote = () => {
    if (!result.lines.length) return;
    const items: QuoteItem[] = result.lines.map(line => ({
      item_type: line.itemType === 'product' ? 'product' : 'service',
      description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}${selectedService === 'other' && data.otherText.trim() ? ` | Solicitud: ${data.otherText.trim()}` : ''}`,
      quantity: 1,
      unit_price: Math.round(line.amount),
      discount: 0,
      tax_rate: 19,
    }));
    onAddItems(items);
    onHide();
  };

  const copyQuote = async () => {
    const quoteText = [
      'COTIZACIÓN PRELIMINAR S24 — SERVICIOS CCTV',
      `Servicio: ${SERVICE_NAMES[selectedService]}`,
      `Resultado: ${result.title}`,
      ...(selectedService === 'other' && data.otherText.trim() ? [`Descripción: ${data.otherText.trim()}`] : []),
      '',
      ...result.lines.map(line => `${line.description} (${line.detail}): ${money(line.amount)}`),
      '',
      `Subtotal: ${money(result.subtotal)}`,
      `IVA estimado (19%): ${money(estimatedTax)}`,
      `TOTAL ESTIMADO CON IVA: ${money(estimatedTotal)}`,
      '',
      `Observación: ${result.message}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(quoteText);
      window.alert('Cotización copiada al portapapeles.');
    } catch {
      window.alert('No fue posible copiar automáticamente. Verifica los permisos del navegador.');
    }
  };

  const requiresCameraCount = selectedService === 'maintenance';
  const showsAccessibility = selectedService === 'maintenance';
  const showsDevice = ['maintenance', 'reset', 'configuration', 'remote', 'app', 'password', 'recording'].includes(selectedService);
  const showsCause = ['power', 'recording'].includes(selectedService);
  const showsInternet = ['remote', 'app'].includes(selectedService);

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
            {/* ---------- PASO 1 ---------- */}
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle bg-primary text-white px-2 py-1 small fw-bold">1</span>
                  <strong>Seleccione el servicio</strong>
                </div>
                <Badge bg="light" text="dark">{Object.keys(SERVICES).length} opciones</Badge>
              </Card.Header>
              <Card.Body>
                <Row className="g-2">
                  {(Object.entries(SERVICES) as [ServiceKey, ServiceDefinition][]).map(([key, service]) => {
                    const Icon = service.icon;
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
                          <div className={`fw-semibold small ${active ? 'text-primary' : 'text-dark'}`}>{service.label}</div>
                          <div className="small text-muted mt-1">{service.description}</div>
                        </button>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>

            {/* ---------- PASO 2 ---------- */}
            <Card className="border-0 shadow-sm mb-3">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle bg-primary text-white px-2 py-1 small fw-bold">2</span>
                  <strong>Datos del servicio</strong>
                </div>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {requiresCameraCount && (
                    <Col md={6}>
                      <Form.Group controlId="service-camera-count">
                        <Form.Label className="small fw-semibold">Cantidad de cámaras</Form.Label>
                        <InputGroup>
                          <Form.Control type="number" min={1} step={1} value={data.cameras} onChange={e => updateField('cameras', e.target.value)} />
                          <InputGroup.Text>cámaras</InputGroup.Text>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  )}

                  {showsDevice && (
                    <Col md={6}>
                      <Form.Group controlId="service-device">
                        <Form.Label className="small fw-semibold">Equipo principal</Form.Label>
                        <Form.Select value={data.device} onChange={e => updateField('device', e.target.value)}>
                          <option>DVR</option>
                          <option>NVR</option>
                          <option>DVR + NVR</option>
                          <option>No sabe</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  )}

                  {showsCause && (
                    <Col md={6}>
                      <Form.Group controlId="service-known-cause">
                        <Form.Label className="small fw-semibold">¿La causa está identificada?</Form.Label>
                        <Form.Select value={data.knownCause} onChange={e => updateField('knownCause', e.target.value)}>
                          <option value="yes">Sí, está identificada</option>
                          <option value="no">No / no se sabe</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  )}

                  {/* ---- MANTENIMIENTO: accesibilidad de cámaras ---- */}
                  {showsAccessibility && (
                    <Col xs={12}>
                      <div className="border rounded-3 p-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <div className="fw-semibold small">
                              <Ruler size={14} className="me-1" />
                              Accesibilidad de cámaras
                            </div>
                            <div className="text-muted small">
                              Base incluida: hasta <strong>10 m</strong> de distancia y <strong>3 m</strong> de altura.
                              Si se excede, se cobra solo el excedente.
                            </div>
                          </div>
                          {cameraAccessExcess.total > 0 ? (
                            <Badge bg="warning" text="dark">{money(cameraAccessExcess.total)} excedente</Badge>
                          ) : (
                            <Badge bg="success" text="dark">Dentro de base</Badge>
                          )}
                        </div>

                        <Row className="g-2 mt-1">
                          <Col md={6}>
                            <Form.Group controlId="service-avg-distance">
                              <Form.Label className="small fw-semibold">
                                <MapPin size={14} className="me-1" />
                                Distancia promedio al grabador / energía
                              </Form.Label>
                              <InputGroup size="sm">
                                <Form.Control
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={data.avgDistance}
                                  onChange={e => updateField('avgDistance', e.target.value)}
                                />
                                <InputGroup.Text>m</InputGroup.Text>
                              </InputGroup>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group controlId="service-avg-height">
                              <Form.Label className="small fw-semibold">
                                <ArrowUp size={14} className="me-1" />
                                Altura promedio de instalación
                              </Form.Label>
                              <InputGroup size="sm">
                                <Form.Control
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={data.avgHeight}
                                  onChange={e => updateField('avgHeight', e.target.value)}
                                />
                                <InputGroup.Text>m</InputGroup.Text>
                              </InputGroup>
                            </Form.Group>
                          </Col>
                        </Row>

                        {cameraAccessExcess.total > 0 && (
                          <div className="small text-muted mt-2" style={{ lineHeight: 1.4 }}>
                            <div className="d-flex justify-content-between">
                              <span>
                                {cameraAccessExcess.extraDistance > 0
                                  ? `${cameraAccessExcess.extraDistance} m distancia × ${money(cameraAccessExcess.distanceRate)}/m`
                                  : 'Sin excedente de distancia'}
                              </span>
                              <span>{money(cameraAccessExcess.distanceCost)}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span>
                                {cameraAccessExcess.extraHeight > 0
                                  ? `${cameraAccessExcess.extraHeight} m altura × ${money(prices.pAccessHeight)}/m`
                                  : 'Sin excedente de altura'}
                              </span>
                              <span>{money(cameraAccessExcess.heightCost)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Col>
                  )}

                  {/* ---- MANTENIMIENTO: accesibilidad DVR ---- */}
                  {showsAccessibility && (
                    <Col xs={12}>
                      <div className="border rounded-3 p-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <Form.Check
                            id="include-dvr-access"
                            type="checkbox"
                            checked={includeDvrAccess}
                            onChange={e => setIncludeDvrAccess(e.target.checked)}
                            label={
                              <span className="fw-semibold small">
                                <Zap size={14} className="me-1" />
                                Incluir accesibilidad del DVR/NVR (base {money(prices.pDvrAccessBase)})
                              </span>
                            }
                          />
                          {includeDvrAccess && (
                            <Badge bg="info" text="dark">{money(dvrAccessPreview.total)}</Badge>
                          )}
                        </div>

                        {includeDvrAccess ? (
                          <>
                            <div className="text-muted small mt-1 mb-2">
                              Base: 0–10 m al tomacorriente, 0–3 m de altura y hasta 4 canales de video.
                              Cada canal adicional se cobra a {money(prices.pDvrExtraChannel)}. La dificultad aplica un recargo.
                            </div>

                            <Row className="g-2 mt-1">
                              <Col md={3}>
                                <Form.Group controlId="service-dvr-distance">
                                  <Form.Label className="small fw-semibold">
                                    <MapPin size={14} className="me-1" />
                                    Dist. al tomacorriente
                                  </Form.Label>
                                  <InputGroup size="sm">
                                    <Form.Control
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={data.dvrDistance}
                                      onChange={e => updateField('dvrDistance', e.target.value)}
                                    />
                                    <InputGroup.Text>m</InputGroup.Text>
                                  </InputGroup>
                                </Form.Group>
                              </Col>

                              <Col md={3}>
                                <Form.Group controlId="service-dvr-height">
                                  <Form.Label className="small fw-semibold">
                                    <ArrowUp size={14} className="me-1" />
                                    Altura DVR/NVR
                                  </Form.Label>
                                  <InputGroup size="sm">
                                    <Form.Control
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={data.dvrHeight}
                                      onChange={e => updateField('dvrHeight', e.target.value)}
                                    />
                                    <InputGroup.Text>m</InputGroup.Text>
                                  </InputGroup>
                                </Form.Group>
                              </Col>

                              <Col md={3}>
                                <Form.Group controlId="service-dvr-channels">
                                  <Form.Label className="small fw-semibold">
                                    <Video size={14} className="me-1" />
                                    Canales ocupados
                                  </Form.Label>
                                  <InputGroup size="sm">
                                    <Form.Control
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={data.dvrChannels}
                                      onChange={e => updateField('dvrChannels', e.target.value)}
                                    />
                                    <InputGroup.Text>canales</InputGroup.Text>
                                  </InputGroup>
                                </Form.Group>
                              </Col>

                              <Col md={3}>
                                <Form.Group controlId="service-dvr-difficulty">
                                  <Form.Label className="small fw-semibold">
                                    <Info size={14} className="me-1" />
                                    Dificultad
                                  </Form.Label>
                                  <Form.Select
                                    size="sm"
                                    value={data.dvrDifficulty}
                                    onChange={e => updateField('dvrDifficulty', e.target.value)}
                                  >
                                    <option value="easy">Fácil acceso</option>
                                    <option value="difficult">
                                      Difícil (+{prices.pDvrDifficultySurcharge}%)
                                    </option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>

                            <div className="small text-muted mt-2" style={{ lineHeight: 1.4 }}>
                              <div className="d-flex justify-content-between">
                                <span>Base (0–10 m / 0–3 m / 0–4 canales)</span>
                                <span>{money(dvrAccessPreview.base)}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span>
                                  {dvrAccessPreview.extraDistance > 0
                                    ? `${dvrAccessPreview.extraDistance} m distancia × ${money(prices.pDvrAccessDistance)}/m`
                                    : 'Sin metros de distancia adicionales'}
                                </span>
                                <span>{money(dvrAccessPreview.distanceCost)}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span>
                                  {dvrAccessPreview.extraHeight > 0
                                    ? `${dvrAccessPreview.extraHeight} m altura × ${money(prices.pDvrAccessHeight)}/m`
                                    : 'Sin metros de altura adicionales'}
                                </span>
                                <span>{money(dvrAccessPreview.heightCost)}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span>
                                  {dvrAccessPreview.extraChannels > 0
                                    ? `${dvrAccessPreview.extraChannels} canal(es) extra × ${money(prices.pDvrExtraChannel)}`
                                    : 'Sin canales adicionales (4 incluidos)'}
                                </span>
                                <span>{money(dvrAccessPreview.channelCost)}</span>
                              </div>
                              <div className="d-flex justify-content-between">
                                <span>
                                  Dificultad ({dvrAccessPreview.difficultyLabel}
                                  {dvrAccessPreview.difficultyPercent > 0 ? ` · ${dvrAccessPreview.difficultyPercent}%` : ''})
                                </span>
                                <span>{money(dvrAccessPreview.difficultyCost)}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="small text-muted mt-1">
                            Marque esta casilla si el trabajo requiere cobrar accesibilidad del grabador.
                          </div>
                        )}
                      </div>
                    </Col>
                  )}

                  {/* ---- MANTENIMIENTO: tareas ---- */}
                  {selectedService === 'maintenance' && (
                    <Col xs={12}>
                      <div className="border rounded-3 p-3 bg-light mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <div className="fw-semibold small">Tareas de mantenimiento (mano de obra)</div>
                            <div className="text-muted small">
                              Base marcada: <strong>Limpieza de lentes y carcaza</strong> ({data.cameras} cámaras).
                              Cambio de fuente / baluns / reempalme: <strong>{money(45000)}</strong>.
                              Cambio de cableado: <strong>{money(50000)}</strong> por punto (10 m / 3 m incluidos) + {money(prices.pCableDistanceRate)}/m dist + {money(prices.pCableHeightRate)}/m alt.
                            </div>
                          </div>
                          <Badge bg="info" text="dark">{money(maintenanceExtrasTotal)}</Badge>
                        </div>

                        {MAINTENANCE_TASKS.map(task => {
                          const state = maintenanceTasks[task.key];
                          const cable = task.key === 'cableChange'
                            ? calcularMontoCableado(state, cableDistanceNum, cableHeightNum, prices)
                            : null;
                          const total = cable ? cable.total : state.quantity * state.unitPrice;
                          return (
                            <div key={task.key} className="border-top pt-2">
                              <div className="d-flex flex-wrap align-items-center gap-2 py-1">
                                <Form.Check
                                  type="checkbox"
                                  className="me-2"
                                  checked={state.selected}
                                  onChange={e => setMaintenanceTasks(prev => ({
                                    ...prev,
                                    [task.key]: { ...prev[task.key], selected: e.target.checked },
                                  }))}
                                  label={<span className="small fw-semibold">{task.label}</span>}
                                  style={{ minWidth: 260 }}
                                />
                                <Form.Control
                                  type="number"
                                  min={1}
                                  size="sm"
                                  value={state.quantity}
                                  disabled={!state.selected}
                                  onChange={e => setMaintenanceTasks(prev => ({
                                    ...prev,
                                    [task.key]: { ...prev[task.key], quantity: Math.max(1, nonNegative(e.target.value)) },
                                  }))}
                                  style={{ maxWidth: 80 }}
                                />
                                <span className="small text-muted">{task.unit}</span>
                                {task.perCamera && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 small text-decoration-none"
                                    disabled={!state.selected}
                                    onClick={() => syncTaskQuantityToCameras(task.key)}
                                  >
                                    usar {data.cameras} cámaras
                                  </Button>
                                )}
                                <InputGroup size="sm" style={{ maxWidth: 160 }}>
                                  <InputGroup.Text>$</InputGroup.Text>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    value={state.unitPrice}
                                    disabled={!state.selected}
                                    onChange={e => setMaintenanceTasks(prev => ({
                                      ...prev,
                                      [task.key]: { ...prev[task.key], unitPrice: nonNegative(e.target.value) },
                                    }))}
                                  />
                                </InputGroup>
                                <span className="small fw-semibold ms-auto">{money(total)}</span>
                              </div>

                              {/* Sub-panel específico de cableado: metros por punto */}
                              {task.key === 'cableChange' && state.selected && (
                                <div className="ms-4 mt-2 mb-2 p-2 rounded-3 bg-white border">
                                  <div className="small fw-semibold mb-2">
                                    <Ruler size={13} className="me-1" />
                                    Metros del cableado (por punto)
                                  </div>
                                  <Row className="g-2">
                                    <Col sm={6}>
                                      <Form.Group controlId="service-cable-distance">
                                        <Form.Label className="small fw-semibold mb-0">
                                          <MapPin size={12} className="me-1" />
                                          Distancia al grabador / energía
                                        </Form.Label>
                                        <InputGroup size="sm">
                                          <Form.Control
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={data.cableDistance}
                                            onChange={e => updateField('cableDistance', e.target.value)}
                                          />
                                          <InputGroup.Text>m</InputGroup.Text>
                                        </InputGroup>
                                      </Form.Group>
                                    </Col>
                                    <Col sm={6}>
                                      <Form.Group controlId="service-cable-height">
                                        <Form.Label className="small fw-semibold mb-0">
                                          <ArrowUp size={12} className="me-1" />
                                          Altura de instalación
                                        </Form.Label>
                                        <InputGroup size="sm">
                                          <Form.Control
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={data.cableHeight}
                                            onChange={e => updateField('cableHeight', e.target.value)}
                                          />
                                          <InputGroup.Text>m</InputGroup.Text>
                                        </InputGroup>
                                      </Form.Group>
                                    </Col>
                                  </Row>
                                  <div className="small text-muted mt-2" style={{ lineHeight: 1.4 }}>
                                    <div className="d-flex justify-content-between">
                                      <span>Base incluida (10 m / 3 m)</span>
                                      <span>{money(state.unitPrice)} × {state.quantity} punto(s)</span>
                                    </div>
                                    {cable && cable.extraDistance > 0 && (
                                      <div className="d-flex justify-content-between">
                                        <span>{cable.extraDistance} m dist extra × {money(prices.pCableDistanceRate)}/m × {state.quantity} punto(s)</span>
                                        <span>{money(cable.distanceExcess)}</span>
                                      </div>
                                    )}
                                    {cable && cable.extraHeight > 0 && (
                                      <div className="d-flex justify-content-between">
                                        <span>{cable.extraHeight} m alt extra × {money(prices.pCableHeightRate)}/m × {state.quantity} punto(s)</span>
                                        <span>{money(cable.heightExcess)}</span>
                                      </div>
                                    )}
                                    <div className="d-flex justify-content-between border-top pt-1 mt-1">
                                      <strong>Subtotal cableado</strong>
                                      <strong>{money(cable?.total ?? 0)}</strong>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="border rounded-3 p-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <div className="fw-semibold small">Materiales adicionales</div>
                            <div className="text-muted small">
                              Repuestos o consumibles (fuentes, baluns, cable, cajas, etc.). No incluyen mano de obra.
                            </div>
                          </div>
                        </div>

                        {MAINTENANCE_MATERIALS.map(mat => {
                          const state = maintenanceMaterials[mat.key];
                          const total = state.quantity * state.unitPrice;
                          return (
                            <div key={mat.key} className="d-flex flex-wrap align-items-center gap-2 py-2 border-top">
                              <Form.Check
                                type="checkbox"
                                className="me-2"
                                checked={state.selected}
                                onChange={e => setMaintenanceMaterials(prev => ({
                                  ...prev,
                                  [mat.key]: { ...prev[mat.key], selected: e.target.checked },
                                }))}
                                label={<span className="small fw-semibold">{mat.label}</span>}
                                style={{ minWidth: 260 }}
                              />
                              <Form.Control
                                type="number"
                                min={1}
                                size="sm"
                                value={state.quantity}
                                disabled={!state.selected}
                                onChange={e => setMaintenanceMaterials(prev => ({
                                  ...prev,
                                  [mat.key]: { ...prev[mat.key], quantity: Math.max(1, nonNegative(e.target.value)) },
                                }))}
                                style={{ maxWidth: 80 }}
                              />
                              <span className="small text-muted">{mat.unit}</span>
                              <InputGroup size="sm" style={{ maxWidth: 160 }}>
                                <InputGroup.Text>$</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  min={0}
                                  value={state.unitPrice}
                                  disabled={!state.selected}
                                  onChange={e => setMaintenanceMaterials(prev => ({
                                    ...prev,
                                    [mat.key]: { ...prev[mat.key], unitPrice: nonNegative(e.target.value) },
                                  }))}
                                />
                              </InputGroup>
                              <span className="small fw-semibold ms-auto">{money(total)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                  )}

                  {/* ---- VIDEO ---- */}
                  {selectedService === 'video' && (
                    <Col md={6}>
                      <Form.Group controlId="service-video-cause">
                        <Form.Label className="small fw-semibold">Causa probable de la pérdida</Form.Label>
                        <Form.Select
                          value={videoCause}
                          onChange={e => handleVideoCauseChange(e.target.value as VideoCause)}
                        >
                          {VIDEO_CAUSES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  )}

                  {selectedService === 'video' && (
                    <Col md={6}>
                      <Form.Group controlId="service-affected-cameras">
                        <Form.Label className="small fw-semibold">Cámaras afectadas</Form.Label>
                        <Form.Select value={data.affected} onChange={e => updateField('affected', e.target.value)}>
                          <option value="1">1 cámara</option>
                          <option value="2-4">2 a 4 cámaras</option>
                          <option value="5-8">5 a 8 cámaras</option>
                          <option value="9+">Más de 8 cámaras</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  )}

                  {selectedService === 'video' && videoCause !== 'unknown' && (
                    <Col xs={12}>
                      <div className="border rounded-3 p-3 bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <div className="fw-semibold small">Materiales probables</div>
                            <div className="text-muted small">Marque los que se requieran y ajuste cantidad y precio.</div>
                          </div>
                          <Badge bg="info" text="dark">{money(videoMaterialsTotal)}</Badge>
                        </div>

                        {VIDEO_MATERIALS.map(mat => {
                          const state = videoMaterials[mat.key];
                          const total = state.quantity * state.unitPrice;
                          return (
                            <div key={mat.key} className="d-flex flex-wrap align-items-center gap-2 py-2 border-top">
                              <Form.Check
                                type="checkbox"
                                className="me-2"
                                checked={state.selected}
                                onChange={e => setVideoMaterials(prev => ({
                                  ...prev,
                                  [mat.key]: { ...prev[mat.key], selected: e.target.checked },
                                }))}
                                label={<span className="small fw-semibold">{mat.label}</span>}
                                style={{ minWidth: 200 }}
                              />
                              <Form.Control
                                type="number"
                                min={1}
                                size="sm"
                                value={state.quantity}
                                disabled={!state.selected}
                                onChange={e => setVideoMaterials(prev => ({
                                  ...prev,
                                  [mat.key]: { ...prev[mat.key], quantity: Math.max(1, nonNegative(e.target.value)) },
                                }))}
                                style={{ maxWidth: 80 }}
                              />
                              <span className="small text-muted">{mat.unit}</span>
                              <InputGroup size="sm" style={{ maxWidth: 170 }}>
                                <InputGroup.Text>$</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  min={0}
                                  value={state.unitPrice}
                                  disabled={!state.selected}
                                  onChange={e => setVideoMaterials(prev => ({
                                    ...prev,
                                    [mat.key]: { ...prev[mat.key], unitPrice: nonNegative(e.target.value) },
                                  }))}
                                />
                              </InputGroup>
                              <span className="small fw-semibold ms-auto">{money(total)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </Col>
                  )}

                  {showsInternet && (
                    <Col md={6}>
                      <Form.Group controlId="service-internet">
                        <Form.Label className="small fw-semibold">¿Hay internet disponible?</Form.Label>
                        <Form.Select value={data.internet} onChange={e => updateField('internet', e.target.value)}>
                          <option value="yes">Sí, funciona</option>
                          <option value="no">No hay internet</option>
                          <option value="unknown">No sabe</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  )}

                  {selectedService === 'other' && (
                    <Col xs={12}>
                      <Form.Group controlId="service-other-description">
                        <Form.Label className="small fw-semibold">Descripción de la solicitud</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          maxLength={500}
                          value={data.otherText}
                          onChange={e => updateField('otherText', e.target.value)}
                          placeholder="Describa el problema o servicio que solicita el cliente"
                        />
                        <Form.Text muted>{data.otherText.length}/500 caracteres</Form.Text>
                      </Form.Group>
                    </Col>
                  )}

                  <Col md={4}>
                    <Form.Group controlId="service-travel">
                      <Form.Label className="small fw-semibold">
                        <MapPin size={14} className="me-1" />Desplazamiento
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control type="number" min={0} value={data.travel} onChange={e => updateField('travel', e.target.value)} />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group controlId="service-materials">
                      <Form.Label className="small fw-semibold">
                        <Package size={14} className="me-1" />Otros materiales
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control type="number" min={0} value={data.materials} onChange={e => updateField('materials', e.target.value)} />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group controlId="service-extra-labor">
                      <Form.Label className="small fw-semibold">
                        <Clock3 size={14} className="me-1" />Mano de obra extra
                      </Form.Label>
                      <InputGroup>
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control type="number" min={0} value={data.extraLabor} onChange={e => updateField('extraLabor', e.target.value)} />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* ---------- PASO 3 ---------- */}
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                  <Settings size={17} className="text-secondary" />
                  <strong className="small">Configuración de precios</strong>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="text-decoration-none"
                  onClick={() => setShowPrices(value => !value)}
                >
                  {showPrices ? 'Ocultar precios' : 'Editar precios'}
                </Button>
              </Card.Header>
              {showPrices && (
                <Card.Body>
                  <Alert variant="warning" className="small">
                    Estos precios se guardan solo en el estado de este componente. Para administrarlos desde el ERP, deben cargarse desde la configuración o la base de datos.
                  </Alert>
                  <Row className="g-3">
                    {PRICE_FIELDS.map(({ key, label }) => (
                      <Col md={6} key={key}>
                        <Form.Group controlId={`price-${key}`}>
                          <Form.Label className="small text-muted">{label}</Form.Label>
                          <InputGroup>
                            <InputGroup.Text>
                              {key === 'pDvrDifficultySurcharge' ? '%' : '$'}
                            </InputGroup.Text>
                            <Form.Control
                              type="number"
                              min={0}
                              value={prices[key]}
                              onChange={e => updatePrice(key, e.target.value)}
                            />
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

          {/* ---------- RESUMEN ---------- */}
          <Col lg={5}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle bg-primary text-white px-2 py-1 small fw-bold">3</span>
                  <div>
                    <strong>Resumen de cotización</strong>
                    <div className="small text-muted">{SERVICE_NAMES[selectedService]}</div>
                  </div>
                </div>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                <Alert variant={result.direct ? 'success' : 'warning'} className="border-0">
                  <div className="d-flex align-items-start gap-2">
                    <ClipboardList size={19} className="flex-shrink-0 mt-1" />
                    <div>
                      <div className="small text-uppercase fw-bold">
                        {result.direct ? 'Cotización directa' : 'Validación requerida'}
                      </div>
                      <div className="fw-bold mt-1">{result.title}</div>
                      <div className="small mt-2">{result.message}</div>
                    </div>
                  </div>
                </Alert>

                <div className="fw-semibold small mb-2">Detalle de valores</div>

                {result.lines.length ? (
                  result.lines.map(line => (
                    <div
                      key={line.id}
                      className="d-flex justify-content-between gap-3 py-3 border-bottom"
                    >
                      <div className="min-w-0">
                        <div className="small fw-semibold">
                          {line.itemType === 'product' && (
                            <Badge bg="info" text="dark" className="me-2" style={{ fontSize: '0.6rem' }}>
                              Material
                            </Badge>
                          )}
                          {line.description}
                        </div>
                        <div className="small text-muted">{line.detail}</div>
                      </div>
                      <div className="small fw-semibold text-nowrap">{money(line.amount)}</div>
                    </div>
                  ))
                ) : (
                  <div className="small text-muted py-3">No hay conceptos calculados.</div>
                )}

                <div className="mt-3 pt-2">
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">Subtotal</span>
                    <span>{money(result.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between small mb-2">
                    <span className="text-muted">IVA estimado (19%)</span>
                    <span>{money(estimatedTax)}</span>
                  </div>
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
                    <div className="small text-uppercase text-muted fw-bold">
                      Guion sugerido para el vendedor
                    </div>
                    <p className="small mt-2 mb-0">{result.script}</p>
                  </Card.Body>
                </Card>

                <div className="mt-auto pt-3">
                  <Button
                    variant="primary"
                    className="w-100 py-2 fw-semibold"
                    onClick={handleAddToQuote}
                  >
                    <PlusCircle size={17} className="me-2" />
                    Agregar conceptos a cotización
                  </Button>
                  <Button variant="outline-secondary" className="w-100 mt-2" onClick={copyQuote}>
                    <Copy size={16} className="me-2" />
                    Copiar resumen
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