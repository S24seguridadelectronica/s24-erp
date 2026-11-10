import {
  AFFECTED, BASE, CAMERA_DIFFICULTIES, DVR_DIFFICULTIES, MAINTENANCE_MATERIALS, SURCHARGES, SYSTEMS, VIDEO_CAUSES,
  VIDEO_MATERIALS, getLaborCap,
} from './catalog';
import type { Prices, ServiceForm, ServiceKey, SystemType } from './catalog';
import type {
  CameraGroup, CatalogItem, Difficulties, DvrGroup, ItemType, Items, MaterialState, ServiceLine, VideoCause,
} from './types';

/* =========================================================================
 * Helpers puros
 * ========================================================================= */

export const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
});
export const money = (value: number) => moneyFormatter.format(Number.isFinite(value) ? value : 0);

export const nonNegative = (value: unknown) => Math.max(0, Number(value) || 0);
export const excess = (value: number, base: number) => Math.max(0, value - base);
export const lineTotal = (m: MaterialState) => m.quantity * m.unitPrice;
export const sumSelected = (items: Items) => Object.values(items).reduce((s, m) => (m.selected ? s + lineTotal(m) : s), 0);
export const sumDifficulties = (d: Difficulties) => Object.values(d).reduce((s, x) => (x.selected ? s + x.price : s), 0);
export const initItems = (defs: CatalogItem[], selected: string[] = []): Items =>
  Object.fromEntries(defs.map(d => [d.key, {
    selected: selected.includes(d.key), quantity: d.defaultQuantity, unitPrice: d.defaultPrice,
  }]));

export const initDifficulties = (defs: { key: string; price: number }[]): Difficulties =>
  Object.fromEntries(defs.map(d => [d.key, { selected: false, price: d.price }]));

/* `crypto.randomUUID` no existe en WebViews antiguos (APK Android). Fallback estable. */
export const uid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Reconstruye un catálogo de tareas sin perder lo que el usuario ya eligió.
 * Conserva selección, cantidad y precio de las claves que existen en ambos sistemas
 * y descarta las que ya no aplican (p. ej. balun al pasar de analógico a IP).
 */
export const remapItems = (prev: Items | undefined, defs: CatalogItem[], defaults: string[] = []): Items =>
  Object.fromEntries(defs.map(def => {
    const old = prev?.[def.key];
    return [
      def.key,
      old
        ? { ...old }
        : { selected: defaults.includes(def.key), quantity: def.defaultQuantity, unitPrice: def.defaultPrice },
    ];
  }));

export const createCamera = (label: string, system: SystemType, expanded = true): CameraGroup => ({
  id: uid(),
  label,
  tasks: initItems(SYSTEMS[system].cameraTasks, ['deepCleaningDismount']),
  photos: [],
  expanded,
  active: true,
  distance: String(BASE.distance),
  height: String(BASE.height),
  cableDistance: String(BASE.distance),
  cableHeight: String(BASE.height),
  difficulties: initDifficulties(CAMERA_DIFFICULTIES),
});

export const createDvr = (label: string, system: SystemType, included: boolean, cameraCount: number): DvrGroup => ({
  id: uid(),
  label, included, active: true,
  distance: String(BASE.distance),
  height: String(BASE.height),
  channels: String(BASE.dvrChannels),
  photos: [],
  difficulties: initDifficulties(DVR_DIFFICULTIES),
  maintenance: initItems(SYSTEMS[system].dvrTasks, ['dvrCleaning']),
  cameras: Array.from({ length: cameraCount }, (_, i) => createCamera(`Cámara ${i + 1}`, system, i === 0)),
});

export function calcularAccesibilidadCamaras(distance: number, height: number, difficultyCost: number, prices: Prices) {
  const extraDistance = excess(distance, BASE.distance);
  const extraHeight = excess(height, BASE.height);
  const distanceRate = prices.pAccessDistance + extraHeight * prices.pAccessHeightDistance;
  const distanceCost = extraDistance * distanceRate;
  const heightCost = extraHeight * prices.pAccessHeight;
  return { extraDistance, extraHeight, distanceRate, distanceCost, heightCost, difficultyCost, total: distanceCost + heightCost + difficultyCost };
}

export function calcularAccesibilidadDvr(distance: number, height: number, channels: number, difficultyCost: number, prices: Prices) {
  const extraDistance = excess(distance, BASE.distance);
  const extraHeight = excess(height, BASE.height);
  const extraChannels = excess(Math.floor(channels), BASE.dvrChannels);
  const base = prices.pDvrAccessBase;
  const distanceCost = extraDistance * prices.pDvrAccessDistance;
  const heightCost = extraHeight * prices.pDvrAccessHeight;
  const channelCost = extraChannels * prices.pDvrExtraChannel;
  const subtotal = base + distanceCost + heightCost + channelCost;
  return { base, extraDistance, extraHeight, extraChannels, distanceCost, heightCost, channelCost, subtotal, difficultyCost, total: subtotal + difficultyCost };
}

export const dvrAccess = (dvr: DvrGroup, prices: Prices) =>
  calcularAccesibilidadDvr(nonNegative(dvr.distance), nonNegative(dvr.height), nonNegative(dvr.channels), sumDifficulties(dvr.difficulties), prices);

export const cameraAccess = (cam: CameraGroup, prices: Prices) =>
  calcularAccesibilidadCamaras(nonNegative(cam.distance), nonNegative(cam.height), sumDifficulties(cam.difficulties), prices);

export function calcularMontoCableado(task: MaterialState | undefined, distance: number, height: number, prices: Prices) {
  const extraDistance = excess(distance, BASE.distance);
  const extraHeight = excess(height, BASE.height);
  if (!task?.selected) return { total: 0, baseAmount: 0, distanceExcess: 0, heightExcess: 0, extraDistance, extraHeight };
  const baseAmount = lineTotal(task);
  const distanceExcess = task.quantity * extraDistance * prices.pCableDistanceRate;
  const heightExcess = task.quantity * extraHeight * prices.pCableHeightRate;
  return { total: baseAmount + distanceExcess + heightExcess, baseAmount, distanceExcess, heightExcess, extraDistance, extraHeight };
}

/**
 * Cámara con mano de obra facturable. El cambio de cableado no cuenta porque
 * se cobra fuera del tope: si contara, bajaría el tope de las demás cámaras sin
 * aportar mano de obra a la suma.
 */
export const cameraHasLabor = (cam: CameraGroup, system: SystemType) =>
  SYSTEMS[system].cameraTasks.some(def => def.key !== 'cableChange' && cam.tasks[def.key]?.selected);

export const countCamerasWithWork = (dvrGroups: DvrGroup[], system: SystemType) =>
  dvrGroups.reduce((n, dvr) => dvr.active ? n + dvr.cameras.filter(c => c.active && cameraHasLabor(c, system)).length : n, 0);
/* =========================================================================
 * Motor de cotización
 * ========================================================================= */

export interface QuoteInput {
  service: ServiceKey; system: SystemType; prices: Prices; data: ServiceForm;
  videoCause: VideoCause; videoMaterials: Items; maintenanceMaterials: Items;
  dvrGroups: DvrGroup[];
  laborCap: number; camerasWithWork: number;
  /** El vendedor autorizó no aplicar el tope de mano de obra (queda en el detalle). */
  noCap?: boolean;
}

export type AddLine = (
  id: string, description: string, detail: string, amount: number,
  itemType?: ItemType, photos?: string[], meta?: Record<string, unknown>,
) => void;

export function addMaintenanceLines(i: QuoteInput, add: AddLine) {
  const { dvrGroups, system, prices, laborCap, noCap = false } = i;
  const { deviceName, cameraTasks, dvrTasks } = SYSTEMS[system];

  for (const dvr of dvrGroups) {
    if (!dvr.active) continue;
    const dvrName = dvr.label.trim() || deviceName;

    if (dvr.included) {
      const acc = dvrAccess(dvr, prices);
      const parts = [`${dvr.distance || 0} m al tomacorriente`, `${dvr.height || 0} m altura`, `${dvr.channels || 0} canales`];
      if (acc.extraDistance > 0) parts.push(`+${acc.extraDistance} m dist`);
      if (acc.extraHeight > 0) parts.push(`+${acc.extraHeight} m alt`);
      if (acc.extraChannels > 0) parts.push(`+${acc.extraChannels} canales`);
      if (acc.difficultyCost > 0) parts.push('+ Dificultades físicas');
      if (dvr.note?.trim()) parts.push(`Nota: ${dvr.note.trim()}`);
      if (dvr.photos.length > 0) parts.push(`📸 ${dvr.photos.length} foto(s)`);
      add(`dvr-accessibility-${dvr.id}`, `Accesibilidad Grabador: ${dvrName}`, parts.join(' · '), acc.total, 'service', dvr.photos, {
        categoria: 'accesibilidad_grabador', grabador: dvrName, nota: dvr.note?.trim() || null,
        extraDistance: acc.extraDistance, extraHeight: acc.extraHeight, canalesExtra: acc.extraChannels, dificultades: acc.difficultyCost,
      });
    }

    /* Mantenimiento del grabador: igual que la cámara, el tope de mano de obra
     * baja a medida que se suman servicios (tramos por volumen). */
    const maintDetails: string[] = [];
    let maintRaw = 0;
    let maintServices = 0;
    for (const def of dvrTasks) {
      const st = dvr.maintenance[def.key];
      const amount = lineTotal(st);
      if (!st.selected || amount <= 0) continue;
      maintRaw += amount;
      maintServices += 1;
      maintDetails.push(`${st.quantity > 1 ? `${st.quantity} ${def.unit} - ` : ''}${def.label}`);
    }

    const maintTier = getLaborCap(maintServices);
    const maintCap = maintTier.cap;
    const maintAmount = noCap ? maintRaw : Math.min(maintRaw, maintCap);

    if (maintRaw > maintCap) {
      maintDetails.push(noCap
        ? `Tope no aplicado (autorizado): ${money(maintRaw - maintCap)} adicionales`
        : `Tope de mano de obra aplicado: -${money(maintRaw - maintCap)}`);
    }

    if (dvr.note?.trim()) maintDetails.push(`Nota: ${dvr.note.trim()}`);
    if (maintAmount > 0) add(`dvr-maint-${dvr.id}`, `Mantenimiento Grabador: ${dvrName}`, maintDetails.join(' + '), maintAmount, 'service', dvr.photos, {
      categoria: 'mantenimiento_grabador', grabador: dvrName, fotos: dvr.photos.length, nota: dvr.note?.trim() || null,
      servicios: maintServices, bruto: maintRaw, tope: maintCap, topeAplicado: maintRaw - maintAmount, topeIgnorado: noCap,
    });

    for (const cam of dvr.cameras) {
      if (!cam.active) continue;
      const camName = cam.label.trim() || 'Cámara';
      const camAcc = cameraAccess(cam, prices);
      const cable = calcularMontoCableado(
        cam.tasks.cableChange,
        nonNegative(cam.cableDistance),
        nonNegative(cam.cableHeight),
        prices,
      );
      const cableExtra = cable.distanceExcess + cable.heightExcess;
      const cableTotal = cable.baseAmount + cableExtra;

      /* El tope es de MANO DE OBRA: el cableado (material + metros) se cobra íntegro aparte. */
      let laborTotal = 0;
      const laborDetails: string[] = [];
      for (const def of cameraTasks) {
        if (def.key === 'cableChange') continue;
        const task = cam.tasks[def.key];
        if (!task.selected) continue;
        laborTotal += lineTotal(task);
        laborDetails.push(`${task.quantity} ${def.unit} - ${def.label}`);
      }
      const laborCharged = noCap ? laborTotal : Math.min(laborTotal, laborCap);

      /* --- Línea 1: mano de obra (con tope aplicado) --- */
      if (laborCharged > 0) {
        const parts: string[] = [laborDetails.join(' + ')];
        if (laborTotal > laborCap) {
          parts.push(noCap
            ? `Tope no aplicado (autorizado): ${money(laborTotal - laborCap)} adicionales`
            : `Tope de mano de obra aplicado: -${money(laborTotal - laborCap)}`);
        }
        if (cam.note?.trim()) parts.push(`Nota: ${cam.note.trim()}`);
        if (cam.photos.length > 0) parts.push(`📸 ${cam.photos.length} foto(s)`);
        add(`cam-labor-${cam.id}`, `Mantenimiento Cámara: ${camName} (${dvrName})`, parts.join(' | '), laborCharged, 'service', cam.photos, {
          categoria: 'mano_obra', camara: camName, bruto: laborTotal, tope: laborCap,
          topeAplicado: laborTotal - laborCharged, topeIgnorado: noCap,
          nota: cam.note?.trim() || null, fotos: cam.photos.length,
        });
      }

      /* --- Línea 2: accesibilidad (si aplica) --- */
      if (camAcc.total > 0) {
        const accParts = ['Base 0-3m alt / 0-10m dist sin obstáculos'];
        if (camAcc.extraDistance > 0) accParts.push(`+${camAcc.extraDistance}m dist extra`);
        if (camAcc.extraHeight > 0) accParts.push(`+${camAcc.extraHeight}m alt extra`);
        if (camAcc.difficultyCost > 0) accParts.push(`+ Dificultades (${money(camAcc.difficultyCost)})`);
        add(`cam-access-${cam.id}`, `Accesibilidad Cámara: ${camName} (${dvrName})`, accParts.join(' · '), camAcc.total, 'service', [], {
          categoria: 'accesibilidad', camara: camName, extraDistance: camAcc.extraDistance, extraHeight: camAcc.extraHeight, dificultades: camAcc.difficultyCost,
        });
      }

      /* --- Línea 3: cambio de cableado (fuera del tope) --- */
      if (cableTotal > 0 && cam.tasks.cableChange) {
        const cb = cam.tasks.cableChange;
        const cableParts = [`${cb.quantity} punto(s) × ${money(cb.unitPrice)}`];
        if (cable.extraDistance > 0) cableParts.push(`+${cable.extraDistance} m dist × ${money(prices.pCableDistanceRate)}/m`);
        if (cable.extraHeight > 0) cableParts.push(`+${cable.extraHeight} m alt × ${money(prices.pCableHeightRate)}/m`);
        add(`cam-cable-${cam.id}`, `Cambio de cableado Cámara: ${camName} (${dvrName})`, cableParts.join(' · '), cableTotal, 'service', [], {
          categoria: 'cableado', camara: camName, puntos: cb.quantity, extraDistance: cable.extraDistance, extraHeight: cable.extraHeight,
        });
      }
    }
  }

  MAINTENANCE_MATERIALS.forEach(def => {
    const st = i.maintenanceMaterials[def.key];
    const amount = lineTotal(st);
    if (st.selected && amount > 0) add(`maint-material-${def.key}`, def.label, `${st.quantity} ${def.unit} × ${money(st.unitPrice)}`, amount, 'product', [], { categoria: 'material' });
  });
}

export function buildQuote(i: QuoteInput) {
  const { service, prices, data } = i;
  const lines: ServiceLine[] = [];
  let direct = true;
  let title = 'Cotización preliminar disponible';
  let message = 'Confirme el alcance del trabajo y los valores con el cliente antes de generar la cotización.';
  let script = '';

  const add: AddLine = (id, description, detail, amount, itemType = 'service', photos = [], meta) =>
    lines.push({ id, description, detail, amount: nonNegative(amount), itemType, photos, meta });

  const diagnose = (t: string, m: string, s: string, id: string, description: string, detail: string, amount: number) => {
    direct = false; title = t; message = m; script = s;
    add(id, description, detail, amount);
  };

  const equipment = data.device === 'No sabe' ? 'DVR/NVR' : data.device;

  switch (service) {
    case 'maintenance':
      addMaintenanceLines(i, add);
      script = `La cotización agrupa el mantenimiento para un sistema ${SYSTEMS[i.system].label}. Se aplicó un tope de mano de obra de ${money(i.laborCap)} por cámara (basado en ${i.camerasWithWork} cámaras intervenidas). El mantenimiento del grabador usa el mismo esquema de tope por volumen según cuántos servicios se marquen. El cambio de cableado, y los excedentes de altura y distancia, se cobran aparte y no entran en ese tope.`;
      break;

    case 'video': {
      if (i.videoCause === 'unknown') {
        diagnose('Requiere diagnóstico técnico', 'La causa no está confirmada. El valor corresponde a visita o diagnóstico, no a una reparación garantizada.',
          'Para determinar qué está ocasionando la pérdida de video, un técnico debe revisar el sistema. La reparación y los repuestos se cotizan después del diagnóstico.',
          'diagnostic-visit', 'Visita / diagnóstico técnico', 'Evaluación en sitio; reparación no incluida', prices.pVisit);
        break;
      }
      const affected = AFFECTED[data.affected] ?? AFFECTED['1'];
      const causeLabel = VIDEO_CAUSES.find(c => c.value === i.videoCause)?.label ?? 'Causa identificada';
      add('video-loss', 'Atención por pérdida de video', `${causeLabel} · ${affected.label}`, Math.round(prices.pPower * affected.factor));
      VIDEO_MATERIALS.forEach(def => {
        const st = i.videoMaterials[def.key];
        const amount = lineTotal(st);
        if (st.selected && amount > 0) add(`material-${def.key}`, def.label, `${st.quantity} ${def.unit} × ${money(st.unitPrice)}`, amount, 'product');
      });
      script = 'Cotizamos la atención según la causa informada y los materiales probables. Cualquier material o trabajo no descrito se aprueba con el cliente antes de ejecutarlo.';
      break;
    }

    case 'reset':
      add('reset', `Reseteo de ${equipment}`, 'Sujeto al procedimiento compatible con el fabricante', prices.pReset);
      script = 'El valor corresponde al procedimiento de reseteo. Si el fabricante requiere un proceso especial o una visita adicional, se informa antes de continuar.';
      break;

    case 'configuration':
      add('configuration', `Configuración de ${equipment}`, 'No incluye repuestos ni ampliaciones de cableado', prices.pConfiguration);
      script = 'Podemos realizar la configuración del grabador. El valor no incluye repuestos ni trabajos adicionales no descritos.';
      break;

    case 'remote':
    case 'app':
      if (data.internet !== 'yes') {
        diagnose('Validar conexión antes de cotizar', 'No se ha confirmado que exista una conexión a internet funcional. El valor mostrado corresponde a visita o diagnóstico.',
          'Para configurar el acceso remoto o vincular la aplicación, primero debemos verificar la conexión, la compatibilidad del equipo y los permisos necesarios.',
          'connectivity-visit', 'Visita / diagnóstico de conectividad', 'Configuración final no garantizada', prices.pVisit);
      } else {
        const isRemote = service === 'remote';
        add('app-setup', isRemote ? 'Configuración de acceso remoto' : 'Configuración de aplicación',
          `Equipo: ${equipment}; requiere compatibilidad e internet`,
          isRemote ? prices.pRemote : prices.pApp);
        script = 'Podemos realizar la configuración si el equipo es compatible, hay internet y se cuenta con los accesos necesarios.';
      }
      break;

    case 'password':
      add('password', 'Cambio / recuperación de contraseña', `Equipo: ${equipment}; sujeto al método del fabricante`, prices.pPassword);
      script = 'El procedimiento depende de la marca, el modelo y la validación de propiedad del equipo. No se garantiza el restablecimiento hasta confirmar el método disponible.';
      break;

    case 'recording':
      if (data.knownCause !== 'yes') {
        diagnose('Requiere diagnóstico técnico', 'No está confirmada la causa del problema de grabación. El diagnóstico no incluye reparación ni disco duro.',
          'Debemos revisar la configuración, el almacenamiento y el estado del equipo para identificar la causa. Los repuestos se cotizan aparte.',
          'recording-diagnostic', 'Visita / diagnóstico de grabación', 'Revisión en sitio; repuestos no incluidos', prices.pVisit);
      } else {
        add('recording-review', 'Revisión de grabaciones', `Equipo: ${equipment}`, prices.pRecording);
        script = 'Atenderemos la revisión indicada. Si se identifica un daño de hardware, se informa y se cotiza antes de cambiar piezas.';
      }
      break;

    case 'power':
      if (data.knownCause !== 'yes') {
        diagnose('Requiere diagnóstico técnico', 'No se ha confirmado si la falla corresponde a la fuente, el cableado, los conectores o el equipo.',
          'Un técnico debe revisar la alimentación y las conexiones. Cualquier material o reparación adicional se informa antes de realizarse.',
          'power-diagnostic', 'Visita / diagnóstico de alimentación', 'Repuestos y reparación no incluidos', prices.pVisit);
      } else {
        add('power-review', 'Revisión de alimentación', 'Fuente, conexiones y cableado accesible', prices.pPower);
        script = 'Atenderemos la revisión indicada. Los materiales o repuestos adicionales se cotizan por separado si son necesarios.';
      }
      break;

    case 'other':
      diagnose('Requiere evaluación técnica', 'El servicio no está parametrizado. El precio mostrado es una referencia de evaluación, no una cotización de reparación.',
        'Cuéntenos qué está ocurriendo. Validaremos el alcance y coordinaremos una evaluación antes de confirmar el precio final.',
        'other-evaluation', 'Evaluación de servicio personalizado', data.otherText.trim() || 'Descripción pendiente del cliente', prices.pOther);
      break;
  }

  const travel = nonNegative(data.travel);
  const materials = nonNegative(data.materials);
  const extraLabor = nonNegative(data.extraLabor);
  if (travel > 0) add('travel', 'Desplazamiento', 'Cargo adicional', travel);
  if (materials > 0) add('materials', 'Otros materiales / repuestos', 'Valor ingresado manualmente', materials, 'product');
  if (extraLabor > 0) add('extra-labor', 'Mano de obra adicional', 'Cargo adicional', extraLabor);

  /* Recargos: se calculan sobre los servicios (no sobre materiales ni desplazamiento). */
  const surchargeBase = lines.reduce((sum, line) => (line.itemType === 'service' ? sum + line.amount : sum), 0);
  for (const { key, label } of SURCHARGES) {
    const pct = nonNegative(data[key]);
    if (pct <= 0) continue;
    add(`surcharge-${key}`, `Recargo ${label} (${pct}%)`, `${pct}% sobre servicios (${money(surchargeBase)})`,
      Math.round(surchargeBase * pct / 100));
  }

  return { direct, title, message, script, lines, subtotal: lines.reduce((sum, l) => sum + l.amount, 0) };
}
