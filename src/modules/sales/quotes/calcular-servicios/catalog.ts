import {
  Wrench, Video, RotateCcw, Settings, Globe, Smartphone, KeyRound, HardDrive, Power, PlusCircle,
} from 'lucide-react';
import type { CatalogItem, Option, VideoCause } from './types';

/* =========================================================================
 * Catálogos
 * ========================================================================= */

export const SERVICES = {
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
} as const;
export type ServiceKey = keyof typeof SERVICES;
export const SERVICE_ENTRIES = Object.entries(SERVICES) as [ServiceKey, (typeof SERVICES)[ServiceKey]][];

export const PRICE_CONFIG = [
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
  { key: 'pDvrAccessBase',        label: 'Accesibilidad DVR/NVR — base (0–10 m / 0–3 m / 0–4 canales)', value: 60000 },
  { key: 'pDvrAccessDistance',    label: 'Accesibilidad DVR/NVR — metro de distancia adicional',  value: 1500 },
  { key: 'pDvrAccessHeight',      label: 'Accesibilidad DVR/NVR — metro de altura adicional',     value: 15000 },
  { key: 'pDvrExtraChannel',      label: 'Accesibilidad DVR/NVR — canal de video adicional (desde el 5.º)', value: 5000 },
  { key: 'pCableDistanceRate',    label: 'Cambio de cableado — metro de distancia adicional', value: 1500 },
  { key: 'pCableHeightRate',      label: 'Cambio de cableado — metro de altura adicional',    value: 15000 },
] as const;

export type PriceKey = (typeof PRICE_CONFIG)[number]['key'];
export type Prices = Record<PriceKey, number>;
export const DEFAULT_PRICES = Object.fromEntries(PRICE_CONFIG.map(p => [p.key, p.value])) as Prices;

export const item = (key: string, label: string, unit: string, defaultQuantity: number, defaultPrice: number): CatalogItem =>
  ({ key, label, unit, defaultQuantity, defaultPrice });

/* --- Analógico --- */
export const ANALOG_CAMERA_TASKS = [
  item('deepCleaningDismount',   'Desmonte y limpieza general (lentes, carcaza, cajas, recorte de UTP/energía)', 'servicio', 1, 60000),
  item('deepCleaningNoDismount', 'Limpieza general sin desmonte (lentes, carcaza, cajas, recorte de UTP/energía)', 'servicio', 1, 50000),
  item('lensAndHousingCleaning', 'Limpieza de lentes y carcaza', 'cámara', 1, 35000),
  item('powerSupplyChange',      'Cambio de fuente de alimentación', 'unidad', 1, 45000),
  item('videoBalunChange',       'Cambio de video baluns', 'par', 1, 45000),
  item('cableChange',            'Cambio de cableado (coaxial/UTP)', 'punto', 1, 50000),
  item('cameraChange',           'Cambio de cámara analógica', 'unidad', 1, 45000),
  item('junctionBoxChange',      'Cambio de caja de paso', 'unidad', 1, 15000),
  item('resplice',               'Reempalme de cableado', 'empalme', 1, 45000),
];

export const DVR_MAINTENANCE_TASKS = [
  item('dvrCleaning',       'Limpieza interna y externa DVR', 'equipo', 1, 50000),
  item('dvrBatteryChange',  'Cambio de batería interna',      'equipo', 1, 50000),
  item('dvrFirmwareUpdate', 'Actualización de firmware DVR',  'equipo', 1, 45000),
  item('dvrPasswordChange', 'Cambio de contraseña',           'equipo', 1, 30000),
  item('dvrReset',          'Reseteo de fábrica',             'equipo', 1, 40000),
  item('dvrUnlink',         'Desvinculación (App/Nube)',      'equipo', 1, 30000),
  item('dvrInternet',       'Conexión a internet',            'equipo', 1, 40000),
];

/* --- IP --- */
export const IP_CAMERA_TASKS = [
  item('deepCleaningDismount',   'Desmonte y limpieza general (lentes, carcaza, cajas, recorte de UTP/energía)', 'servicio', 1, 60000),
  item('deepCleaningNoDismount', 'Limpieza general sin desmonte (lentes, carcaza, cajas, recorte de UTP/energía)', 'servicio', 1, 50000),
  item('lensAndHousingCleaning', 'Limpieza de lentes y carcaza', 'cámara', 1, 35000),
  item('powerSupplyChange',      'Cambio de fuente / inyector PoE', 'unidad', 1, 45000),
  item('ipConfiguration',        'Configuración de red IP (IP, Gateway, DNS)', 'servicio', 1, 30000),
  item('cameraFirmwareUpdate',   'Actualización de firmware de la cámara', 'servicio', 1, 35000),
  item('cableChange',            'Cambio de cableado UTP', 'punto', 1, 50000),
  item('cameraChange',           'Cambio de cámara IP', 'unidad', 1, 45000),
  item('junctionBoxChange',      'Cambio de caja de paso', 'unidad', 1, 15000),
  item('resplice',               'Reempalme de cableado', 'empalme', 1, 45000),
];

export const NVR_MAINTENANCE_TASKS = [
  item('dvrCleaning',       'Limpieza interna y externa NVR', 'equipo', 1, 50000),
  item('dvrFirmwareUpdate', 'Actualización de firmware NVR',  'equipo', 1, 45000),
  item('dvrPasswordChange', 'Cambio de contraseña',           'equipo', 1, 30000),
  item('dvrReset',          'Reseteo de fábrica',             'equipo', 1, 40000),
  item('dvrUnlink',         'Desvinculación (App/Nube)',      'equipo', 1, 30000),
  item('dvrInternet',       'Conexión a internet',            'equipo', 1, 40000),
  item('storageCheck',      'Revisión de estado de disco duro', 'equipo', 1, 20000),
];

export const SYSTEMS = {
  analog: { label: 'Analógico (DVR)', deviceName: 'DVR', cameraTasks: ANALOG_CAMERA_TASKS, dvrTasks: DVR_MAINTENANCE_TASKS },
  ip:     { label: 'IP (NVR)',        deviceName: 'NVR', cameraTasks: IP_CAMERA_TASKS,     dvrTasks: NVR_MAINTENANCE_TASKS },
} as const;
export type SystemType = keyof typeof SYSTEMS;

export const CAMERA_DIFFICULTIES = [
  { key: 'protectiveBase',  label: 'Cámara dentro de base protectora',             price: 15000 },
  { key: 'moveObstacles',   label: 'Mover objetos para llegar a la cámara',        price: 10000 },
  { key: 'difficultAccess', label: 'Acceso muy difícil (escalera/altura extrema)', price: 20000 },
];

export const DVR_DIFFICULTIES = [
  { key: 'reversedRack',   label: 'Grabador de espaldas en Rack (Baluns atrás)', price: 15000 },
  { key: 'tangledCables',  label: 'Cableado enredado / cables muy cortos',       price: 20000 },
  { key: 'tightSpace',     label: 'Espacio ultra reducido (No cabe la mano)',    price: 10000 },
  { key: 'dirtyEquipment', label: 'Equipo muy sucio / polvo / pelos de mascota', price: 8000 },
  { key: 'noWorkspace',    label: 'Sin espacio de trabajo (No hay mesa cerca)',  price: 5000 },
];

export const M = {
  powerSupply: item('powerSupply', 'Fuente de alimentación / PoE', 'unidad', 1, 45000),
  videoBalun:  item('videoBalun',  'Video balun',                  'par',    1, 25000),
  cable:       item('cable',       'Cable UTP / coaxial',          'metros', 20, 3500),
  camera:      item('camera',      'Cámara de seguridad (Analógica o IP)', 'unidad', 1, 180000),
};

export const MAINTENANCE_MATERIALS = [
  M.powerSupply, M.videoBalun, M.cable, M.camera,
  item('junctionBox',   'Caja de paso',             'unidad', 1, 8000),
  item('cr2032Battery', 'Batería interna (CR2032)', 'unidad', 1, 5000),
  item('bncConnector',  'Conector BNC',             'unidad', 1, 3000),
];

export const VIDEO_MATERIALS = [
  M.cable, M.powerSupply, M.videoBalun, M.camera,
  item('dvrChannel', 'Reemplazo de canal DVR/NVR', 'unidad', 1, 250000),
];

export const VIDEO_CAUSES: { value: VideoCause; label: string; suggested: string[] }[] = [
  { value: 'balun',       label: 'Pérdida de video por cambio de video baluns', suggested: ['videoBalun'] },
  { value: 'power',       label: 'Pérdida de video por cambio de fuente',       suggested: ['powerSupply'] },
  { value: 'splice',      label: 'Pérdida de video por reempalme del cableado', suggested: [] },
  { value: 'cable',       label: 'Pérdida de video por cambio de cable',        suggested: ['cable'] },
  { value: 'camera',      label: 'Pérdida de video por cambio de cámara',       suggested: ['camera'] },
  { value: 'dvr-channel', label: 'Canal del DVR/NVR dañado',                    suggested: ['dvrChannel'] },
  { value: 'unknown',     label: 'No se sabe / requiere diagnóstico',           suggested: [] },
];
export const VIDEO_CAUSE_OPTIONS: Option[] = VIDEO_CAUSES.map(c => [c.value, c.label]);

export const AFFECTED: Record<string, { factor: number; option: string; label: string }> = {
  '1':   { factor: 0.75, option: '1 cámara',         label: '1 cámara afectada' },
  '2-4': { factor: 1,    option: '2 a 4 cámaras',    label: '2 a 4 cámaras afectadas' },
  '5-8': { factor: 1.5,  option: '5 a 8 cámaras',    label: '5 a 8 cámaras afectadas' },
  '9+':  { factor: 2,    option: 'Más de 8 cámaras', label: 'Más de 8 cámaras afectadas' },
};
export const AFFECTED_OPTIONS: Option[] = Object.entries(AFFECTED).map(([k, a]) => [k, a.option]);

export const DEVICE_OPTIONS: Option[] = [['DVR', 'DVR'], ['NVR', 'NVR'], ['DVR + NVR', 'DVR + NVR'], ['No sabe', 'No sabe']];
export const KNOWN_CAUSE_OPTIONS: Option[] = [['yes', 'Sí, está identificada'], ['no', 'No / no se sabe']];
export const INTERNET_OPTIONS: Option[] = [['yes', 'Sí, funciona'], ['no', 'No hay internet'], ['unknown', 'No sabe']];

export const LABOR_CAP_BASE = 98500;

export const LABOR_CAP_TIERS = [
  { maxCameras: 1,        cap: LABOR_CAP_BASE,        note: 'Tope base' },
  { maxCameras: 2,        cap: LABOR_CAP_BASE * 0.9,  note: 'Descuento 10%' },
  { maxCameras: 3,        cap: LABOR_CAP_BASE * 0.8,  note: 'Descuento 20%' },
  { maxCameras: 8,        cap: 75000,                 note: 'Tope $75.000' },
  { maxCameras: 16,       cap: 70000,                 note: 'Tope $70.000' },
  { maxCameras: Infinity, cap: 67000,                 note: 'Tope $67.000' },
];

export const getLaborCap = (cameras: number) =>
  LABOR_CAP_TIERS.find(t => cameras <= t.maxCameras) ?? LABOR_CAP_TIERS[LABOR_CAP_TIERS.length - 1];

export const BASE = { distance: 10, height: 3, dvrChannels: 4 };
export const IVA = 0.19;
export const TAX_RATE = Math.round(IVA * 100);
export const DEVICE_SERVICES: ServiceKey[] = ['reset', 'configuration', 'remote', 'app', 'password', 'recording'];
export const CAUSE_SERVICES: ServiceKey[] = ['power', 'recording'];
export const INTERNET_SERVICES: ServiceKey[] = ['remote', 'app'];

/** Recargos comerciales opcionales (porcentaje sobre la mano de obra). */
export const SURCHARGES = [
  { key: 'urgency', label: 'Urgencia', hint: 'Atención inmediata' },
  { key: 'night', label: 'Nocturno', hint: 'Después de 6:00 p. m.' },
  { key: 'sunday', label: 'Dominical / festivo', hint: 'Domingos y festivos' },
] as const;
export type SurchargeKey = (typeof SURCHARGES)[number]['key'];

export const INITIAL_FORM = {
  device: 'DVR', knownCause: 'yes', affected: '1', internet: 'yes', otherText: '',
  travel: '20000', materials: '0', extraLabor: '0', discount: '0',
  urgency: '0', night: '0', sunday: '0',
};
export type ServiceForm = typeof INITIAL_FORM;
