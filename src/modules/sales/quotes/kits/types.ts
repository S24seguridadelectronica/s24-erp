import {
  ANALOG_CAMERA_TASKS,
  DVR_MAINTENANCE_TASKS,
  IP_CAMERA_TASKS,
  MAINTENANCE_MATERIALS,
  NVR_MAINTENANCE_TASKS,
  type SystemType,
} from '../calcular-servicios/catalog';
import type { DvrGroup, Items, MaterialState } from '../calcular-servicios/types';

/* =========================================================================
 * Tipos para el Sistema de Kits de Mantenimiento CCTV
 * ========================================================================= */

export type KitTarget = 'camera' | 'dvr' | 'both';
export type KitApplyMode = 'replace' | 'combine';
export type KitCommercialGroup = 'base' | 'installation' | 'specialized' | 'coproperty';

export interface MaintenanceKit {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  target: KitTarget;
  cameraTasks: string[];
  dvrTasks: string[];
  suggestedMaterials: string[];
  active: boolean;
  isBuiltIn?: boolean;
  color?: 'primary' | 'success' | 'info' | 'warning' | 'secondary' | 'dark' | 'danger';
  group?: KitCommercialGroup;
  clientProfile?: string;
  suggestedChannels?: number;
  suggestedDuct?: string;
}

export interface MaterialSelection {
  selected: boolean;
  quantity: number;
}

export interface ApplyKitOptions {
  mode: KitApplyMode;
  targetDvrId?: string | 'all';
  targetCameraIds?: string[] | 'all';
  materials?: Record<string, MaterialSelection>;
}

/* =========================================================================
 * 10 Kits Predeterminados (según especificación S24 ERP)
 * ========================================================================= */

export const INITIAL_KITS: MaintenanceKit[] = [
  {
    id: 'kit-1-limpieza-camaras',
    name: 'KIT 1. LIMPIEZA DE CÁMARAS',
    shortName: 'Limpieza de Cámaras',
    description: 'Limpieza externa de cámaras, lentes y carcasa, revisión visual de estado físico y comprobación de imagen.',
    target: 'camera',
    cameraTasks: ['lensAndHousingCleaning'],
    dvrTasks: [],
    suggestedMaterials: [],
    active: true,
    isBuiltIn: true,
    color: 'info',
    group: 'base',
    clientProfile: 'Hogar / Comercio / Oficina',
    suggestedChannels: 4,
    suggestedDuct: 'Existente o Canaleta 20x10',
  },
  {
    id: 'kit-2-mantenimiento-camaras',
    name: 'KIT 2. MANTENIMIENTO DE CÁMARAS',
    shortName: 'Mantenimiento de Cámaras',
    description: 'Limpieza general, lentes, revisión de conexiones, alimentación eléctrica, conectores, señal de video y cableado.',
    target: 'camera',
    cameraTasks: ['deepCleaningNoDismount'],
    dvrTasks: [],
    suggestedMaterials: [],
    active: true,
    isBuiltIn: true,
    color: 'primary',
    group: 'base',
    clientProfile: 'Hogar / Comercio / Pyme',
    suggestedChannels: 4,
    suggestedDuct: 'Existente o Tubería PVC 1/2"',
  },
  {
    id: 'kit-3-mantenimiento-fuentes-baluns',
    name: 'KIT 3. MANTENIMIENTO CON FUENTES Y BALUNS',
    shortName: 'Mantenimiento + Fuentes y Baluns',
    description: 'Mantenimiento general de cámaras con revisión y cambio de fuentes de alimentación y video baluns cuando sea necesario.',
    target: 'camera',
    cameraTasks: ['deepCleaningNoDismount', 'powerSupplyChange', 'videoBalunChange'],
    dvrTasks: [],
    suggestedMaterials: ['powerSupply', 'videoBalun'],
    active: true,
    isBuiltIn: true,
    color: 'warning',
    group: 'base',
    clientProfile: 'Locales y oficinas con cámaras parpadeando o fuentes viejas',
    suggestedChannels: 4,
    suggestedDuct: 'Existente o Tubería PVC 1/2"',
  },
  {
    id: 'kit-4-mantenimiento-dvr',
    name: 'KIT 4. MANTENIMIENTO DE DVR/NVR',
    shortName: 'Mantenimiento de DVR/NVR',
    description: 'Limpieza interna y externa de grabador, revisión de conexiones, canales, alimentación, configuración y estado de disco duro.',
    target: 'dvr',
    cameraTasks: [],
    dvrTasks: ['dvrCleaning', 'storageCheck'],
    suggestedMaterials: ['cr2032Battery'],
    active: true,
    isBuiltIn: true,
    color: 'secondary',
    group: 'base',
    clientProfile: 'Empresas y hogares con grabadores sucios o con pérdida de hora',
    suggestedChannels: 4,
    suggestedDuct: 'Rack / Gabinete existente',
  },
  {
    id: 'kit-5-mantenimiento-integral',
    name: 'KIT 5. MANTENIMIENTO INTEGRAL CCTV',
    shortName: 'Mantenimiento Integral',
    description: 'Mantenimiento preventivo completo: todas las cámaras, fuentes, baluns, grabador DVR/NVR y almacenamiento.',
    target: 'both',
    cameraTasks: ['deepCleaningNoDismount', 'powerSupplyChange', 'videoBalunChange'],
    dvrTasks: ['dvrCleaning', 'storageCheck'],
    suggestedMaterials: ['powerSupply', 'videoBalun', 'cr2032Battery'],
    active: true,
    isBuiltIn: true,
    color: 'success',
    group: 'base',
    clientProfile: 'Negocios y fincas con sistema completo de 4 a 16 cámaras',
    suggestedChannels: 8,
    suggestedDuct: 'Existente / Tubería PVC 1/2" a 3/4"',
  },
  {
    id: 'kit-6-limpieza-profunda-desmonte',
    name: 'KIT 6. LIMPIEZA PROFUNDA CON DESMONTE',
    shortName: 'Limpieza Profunda',
    description: 'Desmonte completo de cámaras: lentes, carcaza y cajas de conexión. Para cámaras con suciedad extrema, grasa o instalaciones exteriores muy deterioradas.',
    target: 'camera',
    cameraTasks: ['deepCleaningDismount'],
    dvrTasks: [],
    suggestedMaterials: [],
    active: true,
    isBuiltIn: true,
    color: 'dark',
    group: 'base',
    clientProfile: 'Restaurantes, cocinas, talleres o zonas con grasa/intemperie',
    suggestedChannels: 4,
    suggestedDuct: 'Tubería EMT o PVC intemperie',
  },
  {
    id: 'kit-7-puesta-punto-conectividad',
    name: 'KIT 7. PUESTA A PUNTO Y CONECTIVIDAD REMOTA',
    shortName: 'Conectividad Remota',
    description: 'Reconexión a internet, actualización de firmware, cambio de contraseñas y desvinculación de app anterior. Ideal cuando el cliente cambia de operador o de celular.',
    target: 'dvr',
    cameraTasks: [],
    dvrTasks: ['dvrInternet', 'dvrFirmwareUpdate', 'dvrPasswordChange', 'dvrUnlink'],
    suggestedMaterials: [],
    active: true,
    isBuiltIn: true,
    color: 'info',
    group: 'base',
    clientProfile: 'Clientes que cambiaron de operador de internet, router o celular',
    suggestedChannels: 4,
    suggestedDuct: 'Cable de red directo a router',
  },
  {
    id: 'kit-8-mantenimiento-especializado-ip',
    name: 'KIT 8. MANTENIMIENTO ESPECIALIZADO IP / PoE',
    shortName: 'Mantenimiento IP / PoE',
    description: 'Para sistemas modernos IP con switches PoE. Incluye limpieza de cámaras, configuración de red, actualización de firmware de cámaras y NVR, y revisión de almacenamiento.',
    target: 'both',
    cameraTasks: ['deepCleaningNoDismount', 'ipConfiguration', 'cameraFirmwareUpdate'],
    dvrTasks: ['dvrCleaning', 'dvrFirmwareUpdate', 'storageCheck'],
    suggestedMaterials: [],
    active: true,
    isBuiltIn: true,
    color: 'primary',
    group: 'base',
    clientProfile: 'Empresas con cámaras IP y switches PoE',
    suggestedChannels: 4,
    suggestedDuct: 'Tubería PVC 1/2" o EMT/MT 1/2"',
  },
  {
    id: 'kit-9-reparacion-puntos-criticos',
    name: 'KIT 9. REPARACIÓN DE PUNTOS CRÍTICOS',
    shortName: 'Reparación de Puntos Críticos',
    description: 'Para sistemas con pérdidas de video intermitentes por empalmes sulfatados, cajas de paso rotas o cableado deteriorado por sol y lluvia.',
    target: 'camera',
    cameraTasks: ['resplice', 'junctionBoxChange', 'lensAndHousingCleaning'],
    dvrTasks: [],
    suggestedMaterials: ['junctionBox', 'cable'],
    active: true,
    isBuiltIn: true,
    color: 'warning',
    group: 'base',
    clientProfile: 'Instalaciones con cámaras que se caen por lluvia o viento',
    suggestedChannels: 4,
    suggestedDuct: 'Canaleta exterior o Tubería PVC',
  },
  {
    id: 'kit-10-reemplazo-preventivo-desgaste',
    name: 'KIT 10. REEMPLAZO PREVENTIVO POR DESGASTE',
    shortName: 'Reemplazo Preventivo',
    description: 'Para sistemas con más de 2–3 años: reemplazo de batería CR2032 del grabador, revisión de disco duro y cambio de fuentes de poder con fallas intermitentes.',
    target: 'both',
    cameraTasks: ['powerSupplyChange'],
    dvrTasks: ['dvrCleaning', 'dvrBatteryChange', 'storageCheck'],
    suggestedMaterials: ['cr2032Battery', 'powerSupply'],
    active: true,
    isBuiltIn: true,
    color: 'danger',
    group: 'base',
    clientProfile: 'Sistemas con más de 2 años continuos sin mantenimiento',
    suggestedChannels: 8,
    suggestedDuct: 'Existente',
  },
  {
    id: 'kit-11-instalacion-hogar-2-camaras',
    name: 'KIT 11. INSTALACIÓN HOGAR / APARTAMENTO (2 CÁMARAS) — MANO DE OBRA Y MATERIALES',
    shortName: 'Instalación Hogar (2 Cams)',
    description: 'Instalación completa y puesta a punto para 2 puntos de cámara en casas o apartamentos. Incluye cableado, cajas de paso, conectores, fijación y vinculación a internet en celulares (no incluye equipos grabador/cámaras).',
    target: 'both',
    cameraTasks: ['cameraChange', 'cableChange', 'junctionBoxChange', 'lensAndHousingCleaning'],
    dvrTasks: ['dvrInternet', 'dvrCleaning'],
    suggestedMaterials: ['cable', 'powerSupply', 'videoBalun', 'junctionBox'],
    active: true,
    isBuiltIn: true,
    color: 'info',
    group: 'installation',
    clientProfile: 'Casas, apartamentos o pequeños locales (2 cámaras)',
    suggestedChannels: 2,
    suggestedDuct: 'Canaleta 20x10 / Tubería PVC 1/2"',
  },
  {
    id: 'kit-12-instalacion-comercio-4-camaras',
    name: 'KIT 12. INSTALACIÓN COMERCIO ESTÁNDAR (4 CÁMARAS HD) — MANO DE OBRA Y MATERIALES',
    shortName: 'Instalación Comercio (4 Cams)',
    description: 'Paquete estándar para tiendas, restaurantes y oficinas (hasta 150 m²). Cubre instalación de 4 puntos de cámara, canalización básica, cableado UTP, configuración de DVR y app remota (no incluye equipos grabador/cámaras).',
    target: 'both',
    cameraTasks: ['cameraChange', 'cableChange', 'junctionBoxChange', 'lensAndHousingCleaning'],
    dvrTasks: ['dvrInternet', 'dvrFirmwareUpdate', 'storageCheck'],
    suggestedMaterials: ['cable', 'powerSupply', 'videoBalun', 'junctionBox'],
    active: true,
    isBuiltIn: true,
    color: 'primary',
    group: 'installation',
    clientProfile: 'Locales comerciales, minimarkets, droguerías (4 cámaras)',
    suggestedChannels: 4,
    suggestedDuct: 'Tubería PVC 1/2" / Canaleta 30x15',
  },
  {
    id: 'kit-13-instalacion-pyme-8-camaras',
    name: 'KIT 13. INSTALACIÓN NEGOCIO / BODEGA (8 CÁMARAS HD) — MANO DE OBRA Y MATERIALES',
    shortName: 'Instalación Pyme (8 Cams)',
    description: 'Instalación y cableado estructurado para 8 puntos de cámara en bodegas, minimarkets o talleres. Incluye conexión a DVR de 8 canales, verificación de disco duro y configuración de red (no incluye equipos grabador/cámaras).',
    target: 'both',
    cameraTasks: ['cameraChange', 'cableChange', 'junctionBoxChange', 'lensAndHousingCleaning'],
    dvrTasks: ['dvrInternet', 'dvrFirmwareUpdate', 'storageCheck'],
    suggestedMaterials: ['cable', 'powerSupply', 'videoBalun', 'junctionBox', 'cr2032Battery'],
    active: true,
    isBuiltIn: true,
    color: 'dark',
    group: 'installation',
    clientProfile: 'Bodegas, empresas, talleres, restaurantes grandes (8 cámaras)',
    suggestedChannels: 8,
    suggestedDuct: 'Tubería PVC 3/4" o MT 3/4"',
  },
  {
    id: 'kit-14-instalacion-ip-poe-4-camaras',
    name: 'KIT 14. INSTALACIÓN ALTA DEFINICIÓN IP / PoE (4 CÁMARAS) — MANO DE OBRA Y MATERIALES',
    shortName: 'Instalación IP / PoE (4 Cams)',
    description: 'Instalación profesional para 4 cámaras IP PoE y NVR. Incluye ponchado RJ45, configuración de red local (segmento IP, gateway, DNS), actualización de firmware y visualización remota de alta fidelidad (no incluye equipos grabador/cámaras).',
    target: 'both',
    cameraTasks: ['cameraChange', 'cableChange', 'ipConfiguration', 'cameraFirmwareUpdate', 'junctionBoxChange'],
    dvrTasks: ['dvrInternet', 'dvrFirmwareUpdate', 'storageCheck'],
    suggestedMaterials: ['cable', 'junctionBox'],
    active: true,
    isBuiltIn: true,
    color: 'info',
    group: 'installation',
    clientProfile: 'Oficinas corporativas, clínicas, retail premium (4 cámaras IP)',
    suggestedChannels: 4,
    suggestedDuct: 'Tubería PVC 1/2" o EMT/MT 1/2"',
  },
  {
    id: 'kit-15-traslado-reubicacion-camaras',
    name: 'KIT 15. TRASLADO Y REUBICACIÓN DE PUNTOS CCTV',
    shortName: 'Traslado de Cámaras',
    description: 'Para remodelaciones o redistribución de espacios: desmonte cuidadoso de cámara existente, nuevo tendido de cableado hasta la nueva ubicación, fijación, caja de paso, reempalme y enfoque óptimo de visión.',
    target: 'camera',
    cameraTasks: ['deepCleaningDismount', 'cableChange', 'junctionBoxChange', 'resplice', 'lensAndHousingCleaning'],
    dvrTasks: [],
    suggestedMaterials: ['cable', 'junctionBox', 'bncConnector', 'videoBalun'],
    active: true,
    isBuiltIn: true,
    color: 'warning',
    group: 'specialized',
    clientProfile: 'Remodelaciones comerciales, cambio de diseño o ampliaciones',
    suggestedChannels: 2,
    suggestedDuct: 'Canaleta 20x10 o PVC existente',
  },
  {
    id: 'kit-16-mantenimiento-electrico-ups',
    name: 'KIT 16. MANTENIMIENTO ELÉCTRICO Y RESPALDO (FUENTES / UPS)',
    shortName: 'Mantenimiento Eléctrico & UPS',
    description: 'Revisión y saneamiento del sistema eléctrico CCTV: cambio o ajuste de fuentes de poder, verificación de fusibles, diagnóstico de batería de respaldo UPS y cambio de batería CR2032 del grabador.',
    target: 'both',
    cameraTasks: ['powerSupplyChange'],
    dvrTasks: ['dvrBatteryChange', 'storageCheck', 'dvrCleaning'],
    suggestedMaterials: ['powerSupply', 'cr2032Battery', 'upsBattery', 'centralPowerSupply'],
    active: true,
    isBuiltIn: true,
    color: 'danger',
    group: 'specialized',
    clientProfile: 'Instalaciones con cortes de luz frecuentes o fuentes quemadas',
    suggestedChannels: 8,
    suggestedDuct: 'Rack / Gabinete existente',
  },
  {
    id: 'kit-17-extraccion-grabaciones-peritaje',
    name: 'KIT 17. PUESTA A PUNTO FORENSE / EXTRACCIÓN DE GRABACIONES',
    shortName: 'Extracción Grabaciones & Peritaje',
    description: 'Servicio técnico especializado para incidentes, siniestros o auditorías: diagnóstico de integridad de disco duro, recuperación de acceso/contraseñas del DVR, extracción de evidencia en video y actualización del sistema.',
    target: 'dvr',
    cameraTasks: [],
    dvrTasks: ['storageCheck', 'dvrPasswordChange', 'dvrFirmwareUpdate', 'dvrInternet'],
    suggestedMaterials: ['usbBackup', 'cr2032Battery'],
    active: true,
    isBuiltIn: true,
    color: 'secondary',
    group: 'specialized',
    clientProfile: 'Auditorías, siniestros, juzgados, pérdida de contraseñas de DVR',
    suggestedChannels: 8,
    suggestedDuct: 'N/A (Software y Hardware Grabador)',
  },
  {
    id: 'kit-18-mantenimiento-copropiedades-16-camaras',
    name: 'KIT 18. MANTENIMIENTO INTEGRAL COPROPIEDADES / CONJUNTOS (16+ CÁMARAS)',
    shortName: 'Mantenimiento Copropiedades',
    description: 'Mantenimiento preventivo masivo para conjuntos residenciales, edificios y parques industriales (16 a 32 cámaras). Limpieza profunda en exteriores/interiores, revisión de canalizaciones, auditoría de retención legal (30 días) y puesta a punto de NVRs/DVRs.',
    target: 'both',
    cameraTasks: ['deepCleaningDismount', 'powerSupplyChange', 'videoBalunChange', 'junctionBoxChange', 'lensAndHousingCleaning'],
    dvrTasks: ['dvrCleaning', 'dvrFirmwareUpdate', 'storageCheck', 'dvrBatteryChange', 'dvrInternet'],
    suggestedMaterials: ['powerSupply', 'videoBalun', 'junctionBox', 'cr2032Battery', 'cable'],
    active: true,
    isBuiltIn: true,
    color: 'success',
    group: 'coproperty',
    clientProfile: 'Conjuntos residenciales, edificios, parques logísticos (16 a 32 cámaras)',
    suggestedChannels: 16,
    suggestedDuct: 'Tubería MT/EMT 1" o PVC 1" perimetral',
  },
];

/* =========================================================================
 * Helpers para etiquetas y catálogos
 * ========================================================================= */

export function getAllAvailableCameraTasks(): { key: string; label: string; unit: string; defaultPrice: number }[] {
  const map = new Map<string, { key: string; label: string; unit: string; defaultPrice: number }>();
  for (const t of ANALOG_CAMERA_TASKS) {
    map.set(t.key, { key: t.key, label: t.label, unit: t.unit, defaultPrice: t.defaultPrice });
  }
  for (const t of IP_CAMERA_TASKS) {
    if (!map.has(t.key)) {
      map.set(t.key, { key: t.key, label: t.label, unit: t.unit, defaultPrice: t.defaultPrice });
    }
  }
  return Array.from(map.values());
}

export function getAllAvailableDvrTasks(): { key: string; label: string; unit: string; defaultPrice: number }[] {
  const map = new Map<string, { key: string; label: string; unit: string; defaultPrice: number }>();
  for (const t of DVR_MAINTENANCE_TASKS) {
    map.set(t.key, { key: t.key, label: t.label, unit: t.unit, defaultPrice: t.defaultPrice });
  }
  for (const t of NVR_MAINTENANCE_TASKS) {
    if (!map.has(t.key)) {
      map.set(t.key, { key: t.key, label: t.label, unit: t.unit, defaultPrice: t.defaultPrice });
    }
  }
  return Array.from(map.values());
}

export function getCameraTaskLabel(key: string, system?: SystemType): string {
  const catalog = system === 'ip' ? IP_CAMERA_TASKS : ANALOG_CAMERA_TASKS;
  const found = catalog.find(t => t.key === key) || ANALOG_CAMERA_TASKS.find(t => t.key === key) || IP_CAMERA_TASKS.find(t => t.key === key);
  return found ? found.label : key;
}

export function getDvrTaskLabel(key: string, system?: SystemType): string {
  const catalog = system === 'ip' ? NVR_MAINTENANCE_TASKS : DVR_MAINTENANCE_TASKS;
  const found = catalog.find(t => t.key === key) || DVR_MAINTENANCE_TASKS.find(t => t.key === key) || NVR_MAINTENANCE_TASKS.find(t => t.key === key);
  return found ? found.label : key;
}

export function getMaterialLabel(key: string): string {
  const found = MAINTENANCE_MATERIALS.find(m => m.key === key);
  return found ? `${found.label} (${found.unit})` : key;
}

/* =========================================================================
 * Título dinámico y precio total por cantidad de cámaras
 * ========================================================================= */

/** Catálogo unificado de precios unitarios por tarea (usa el precio por defecto
 *  del catálogo existente; no crea fórmulas ni precios duplicados). */
function getTaskUnitPrice(taskKey: string, system: SystemType): number {
  const cameraCatalog = system === 'ip' ? IP_CAMERA_TASKS : ANALOG_CAMERA_TASKS;
  const foundCamera = cameraCatalog.find(t => t.key === taskKey)
    || ANALOG_CAMERA_TASKS.find(t => t.key === taskKey)
    || IP_CAMERA_TASKS.find(t => t.key === taskKey);
  if (foundCamera) return foundCamera.defaultPrice;

  const dvrCatalog = system === 'ip' ? NVR_MAINTENANCE_TASKS : DVR_MAINTENANCE_TASKS;
  const foundDvr = dvrCatalog.find(t => t.key === taskKey)
    || DVR_MAINTENANCE_TASKS.find(t => t.key === taskKey)
    || NVR_MAINTENANCE_TASKS.find(t => t.key === taskKey);
  return foundDvr ? foundDvr.defaultPrice : 0;
}

/** Precio total del kit (mano de obra de cámaras + grabador + recargos por distancia/altura)
 *  según la cantidad de cámaras configurada y los parámetros del sitio. Reutiliza los precios del catálogo. */
export function getKitTotalPrice(
  kit: MaintenanceKit,
  cameraCount: number,
  system: SystemType,
  siteParams?: { avgDistance?: number; avgHeight?: number; prices?: Record<string, number> }
): number {
  const cameras = Math.max(0, cameraCount);
  const cameraLabor = kit.cameraTasks.reduce((sum, key) => sum + getTaskUnitPrice(key, system), 0) * cameras;
  // Los servicios de grabador se cobran una vez por equipo (se asume 1 grabador).
  const dvrLabor = kit.dvrTasks.reduce((sum, key) => sum + getTaskUnitPrice(key, system), 0);

  // Recargos por distancia y altura por punto de cámara (si aplican)
  let accessSurcharge = 0;
  if (siteParams && cameras > 0) {
    const distRate = siteParams.prices?.pAccessDistance ?? 1500;
    const heightRate = siteParams.prices?.pAccessHeight ?? 15000;
    const dist = siteParams.avgDistance ?? 0;
    const h = siteParams.avgHeight ?? 0;

    // Distancia base incluida: 0-10m. Si supera la base se cobra el exceso por cámara
    const extraDist = Math.max(0, dist - 10);
    // Altura base incluida: 0-3m. Si supera la base se cobra el exceso por cámara
    const extraHeight = Math.max(0, h - 3);

    accessSurcharge = (extraDist * distRate + extraHeight * heightRate) * cameras;
  }

  return cameraLabor + dvrLabor + accessSurcharge;
}

/** Título dinámico del kit según la cantidad de cámaras configurada. */
export function getKitDynamicTitle(kit: MaintenanceKit, cameraCount: number): string {
  const base = kit.shortName || kit.name;
  if (kit.target === 'dvr' || cameraCount <= 0) return base;
  // Elimina menciones fijas de cantidad en el nombre base (ej: "(4 Cams)").
  const cleanName = base
    .replace(/\s*[([]?\s*\d+\s*(cams?|cámaras?|camaras?)\s*[)\]]?\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `${cleanName} de ${cameraCount} cámara${cameraCount !== 1 ? 's' : ''}`;
}

export function getKitTargetLabel(target: KitTarget): string {
  switch (target) {
    case 'camera': return 'Cámaras';
    case 'dvr': return 'DVR / NVR';
    case 'both': return 'Cámaras + Grabadores';
  }
}

export function getKitTargetBadgeVariant(target: KitTarget): string {
  switch (target) {
    case 'camera': return 'info';
    case 'dvr': return 'secondary';
    case 'both': return 'success';
  }
}

export function getKitCommercialGroup(kit: MaintenanceKit): KitCommercialGroup {
  if (kit.group) return kit.group;
  const id = kit.id.toLowerCase();
  if (
    id.startsWith('kit-11') ||
    id.startsWith('kit-12') ||
    id.startsWith('kit-13') ||
    id.startsWith('kit-14') ||
    id.includes('instalacion')
  ) {
    return 'installation';
  }
  if (
    id.startsWith('kit-15') ||
    id.startsWith('kit-16') ||
    id.startsWith('kit-17') ||
    id.includes('traslado') ||
    id.includes('electrico') ||
    id.includes('peritaje')
  ) {
    return 'specialized';
  }
  if (id.startsWith('kit-18') || id.includes('copropiedades')) {
    return 'coproperty';
  }
  return 'base';
}

export function getCommercialGroupLabel(group: KitCommercialGroup): string {
  switch (group) {
    case 'base':
      return 'Mantenimiento & Soporte';
    case 'installation':
      return 'Grupo A: Instalación & Puntos';
    case 'specialized':
      return 'Grupo B: Correctivos & Especializados';
    case 'coproperty':
      return 'Grupo C: Copropiedades & Grandes Superficies';
  }
}

export function getCommercialGroupBadgeVariant(group: KitCommercialGroup): string {
  switch (group) {
    case 'base':
      return 'primary';
    case 'installation':
      return 'info';
    case 'specialized':
      return 'warning';
    case 'coproperty':
      return 'success';
  }
}

/* =========================================================================
 * Lógica de Aplicación de Kits (Pura, inmutable)
 * ========================================================================= */

export function applyKitToGroups(
  dvrGroups: DvrGroup[],
  kit: MaintenanceKit,
  options: ApplyKitOptions,
): DvrGroup[] {
  const { mode, targetDvrId = 'all', targetCameraIds = 'all' } = options;
  const appliesToCameras = kit.target === 'camera' || kit.target === 'both';
  const appliesToDvr = kit.target === 'dvr' || kit.target === 'both';

  return dvrGroups.map(dvr => {
    if (targetDvrId !== 'all' && dvr.id !== targetDvrId) return dvr;

    // 1. Modificar tareas de mantenimiento del Grabador (si aplica)
    let newMaintenance = { ...dvr.maintenance };
    if (appliesToDvr && kit.dvrTasks.length > 0) {
      newMaintenance = Object.fromEntries(
        Object.entries(dvr.maintenance).map(([taskKey, taskState]) => {
          const inKit = kit.dvrTasks.includes(taskKey);
          if (mode === 'replace') {
            return [taskKey, { ...taskState, selected: inKit }];
          } else {
            return [taskKey, { ...taskState, selected: taskState.selected || inKit }];
          }
        }),
      );
    }

    // 2. Modificar tareas de las Cámaras (si aplica)
    const newCameras = dvr.cameras.map(cam => {
      if (targetCameraIds !== 'all' && !targetCameraIds.includes(cam.id)) return cam;
      if (!appliesToCameras || kit.cameraTasks.length === 0) return cam;

      const newTasks: Record<string, MaterialState> = Object.fromEntries(
        Object.entries(cam.tasks).map(([taskKey, taskState]) => {
          const inKit = kit.cameraTasks.includes(taskKey);
          if (mode === 'replace') {
            return [taskKey, { ...taskState, selected: inKit }];
          } else {
            return [taskKey, { ...taskState, selected: taskState.selected || inKit }];
          }
        }),
      );

      return {
        ...cam,
        tasks: newTasks,
      };
    });

    return {
      ...dvr,
      maintenance: newMaintenance,
      cameras: newCameras,
    };
  });
}

export function applyKitMaterials(
  currentMaterials: Items,
  suggestedMaterials: Record<string, MaterialSelection>,
): Items {
  const next = { ...currentMaterials };
  for (const [key, sel] of Object.entries(suggestedMaterials)) {
    if (next[key] && sel.selected) {
      next[key] = {
        ...next[key],
        selected: true,
        quantity: Math.max(1, sel.quantity || next[key].quantity || 1),
      };
    }
  }
  return next;
}
