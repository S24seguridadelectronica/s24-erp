import {
  ANALOG_CAMERA_TASKS,
  DVR_MAINTENANCE_TASKS,
  IP_CAMERA_TASKS,
  MAINTENANCE_MATERIALS,
  NVR_MAINTENANCE_TASKS,
  type SystemType,
} from '../calcular-servicios/catalog';
import type { CameraGroup, DvrGroup, Items, MaterialState } from '../calcular-servicios/types';

/* =========================================================================
 * Tipos para el Sistema de Kits de Mantenimiento CCTV
 * ========================================================================= */

export type KitTarget = 'camera' | 'dvr' | 'both';
export type KitApplyMode = 'replace' | 'combine';

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
