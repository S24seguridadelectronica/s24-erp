import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import {
  Bookmark, Calculator, ClipboardList, Clock3, Copy, Eye, HardDrive, Info, MapPin, Minus, Package, Plus, PlusCircle, RotateCcw,
  Send, Settings, Zap,
} from 'lucide-react';
import {
  AFFECTED_OPTIONS, CAUSE_SERVICES, DEFAULT_PRICES, DEVICE_OPTIONS, DEVICE_SERVICES, INITIAL_FORM, INTERNET_OPTIONS,
  INTERNET_SERVICES, KNOWN_CAUSE_OPTIONS, MAINTENANCE_MATERIALS, SERVICE_ENTRIES, SERVICES, SURCHARGES, SYSTEMS,
  VIDEO_CAUSE_OPTIONS, VIDEO_CAUSES, VIDEO_MATERIALS, getLaborCap,
} from './catalog';
import type { PriceKey, ServiceForm, ServiceKey, SystemType } from './catalog';
import type {
  CalcularServiciosProps, CameraGroup, DvrGroup, Items, MaterialState, QuoteItem, VideoCause,
} from './types';
import {
  buildQuote, countCamerasWithWork, createCamera, createDvr, initItems, money, nonNegative, remapItems, sumSelected, uid,
} from './calc';
import {
  loadRemotePriceData, readStoredPrices, saveRemotePriceData, writeStoredPrices, type StoredPriceData,
} from './priceStorage';
import { clearDraft, readDraft, writeDraft, type DraftInput } from './draft';
import { addSaved, readSaved, removeSaved, type SavedCalculation } from './savedStore';
import { SavedCalculationsModal } from './saved';
import { CopyCameraModal } from './copyCamera';
import { ItemRows, NumField, Panel, PanelHeader, Row2, SelectField, Step } from './ui';
import { DvrCard } from './cards';
import { LineItemRow, PriceSettings, ServiceGrid } from './panel';
import { MAX_PHOTOS_PER_QUOTE, serializePhotos } from '@/utils/quotePhotos';
import { buildQuotePdf } from '@/services/api/quotePdf';
import { useCctvGroups } from './useCctvGroups';
import { KitsSelectorPanel } from '../kits/KitsSelectorPanel';
import {
  loadRemoteKits, readStoredKits, saveRemoteKits, writeStoredKits,
} from '../kits/kitsStore';
import {
  applyKitMaterials, applyKitToGroups, getCameraTaskLabel, getDvrTaskLabel, type ApplyKitOptions, type MaintenanceKit,
} from '../kits/types';
import './CalcularServicios.css';

/* =========================================================================
 * Componente principal
 * ========================================================================= */

/** Marca o desmarca todas las tareas de un catálogo. */
const setAllTasks = (items: Items, selected: boolean): Items =>
  Object.fromEntries(Object.entries(items).map(([key, task]) => [key, { ...task, selected }]));

const DEFAULT_MAINTENANCE_KIT_CAMERA_COUNT = 4;

const createDefaultMaintenanceKitMaterials = () =>
  initItems(MAINTENANCE_MATERIALS, MAINTENANCE_MATERIALS.map(material => material.key));

const createDefaultMaintenanceKitDvrGroups = (): DvrGroup[] => {
  const dvr = createDvr('DVR / NVR 1', 'analog', false, DEFAULT_MAINTENANCE_KIT_CAMERA_COUNT);
  return [{ ...dvr, maintenance: initItems(SYSTEMS.analog.dvrTasks) }];
};

export function CalcularServicios({ show, onHide, onAddItems, customerName }: CalcularServiciosProps) {
  /* Borrador previo (si la app se cerró a mitad del cálculo). */
  const [initialDraft] = useState(() => readDraft());
  const draftData = initialDraft?.data ? { ...INITIAL_FORM, ...initialDraft.data } : INITIAL_FORM;

  const [selectedService, setSelectedService] = useState<ServiceKey>(initialDraft?.service ?? 'maintenance');
  const [showPrices, setShowPrices] = useState(false);
  const [priceData, setPriceData] = useState<StoredPriceData>(readStoredPrices);
  const [system, setSystem] = useState<SystemType>(initialDraft?.system ?? 'analog');
  const [data, setData] = useState<ServiceForm>(draftData);

  const [kits, setKits] = useState<MaintenanceKit[]>(() => readStoredKits());
  const [activeKitId, setActiveKitId] = useState<string | null>(null);

  const activeKit = useMemo(() => kits.find(k => k.id === activeKitId) || null, [kits, activeKitId]);

  const getActiveCameraTasks = useCallback(() => {
    if (!activeKit) return undefined;
    if (activeKit.target === 'camera' || activeKit.target === 'both') {
      return activeKit.cameraTasks.length > 0 ? activeKit.cameraTasks : undefined;
    }
    return undefined;
  }, [activeKit]);

  const {
    dvrGroups,
    setDvrGroups,
    actions,
    addDvrGroup,
    copyTarget,
    setCopySource,
  } = useCctvGroups({
    initialGroups: initialDraft?.dvrGroups ?? createDefaultMaintenanceKitDvrGroups(),
    system,
    getActiveCameraTasks,
  });

  const [videoCause, setVideoCause] = useState<VideoCause>(initialDraft?.videoCause ?? 'unknown');
  const [videoMaterials, setVideoMaterials] = useState<Items>(() => initialDraft?.videoMaterials ?? initItems(VIDEO_MATERIALS));
  const [maintenanceMaterials, setMaintenanceMaterials] = useState<Items>(() => {
    // Merge stored draft with full defaults to guarantee all keys exist.
    const defaults = createDefaultMaintenanceKitMaterials();
    const stored = initialDraft?.maintenanceMaterials;
    return stored ? remapItems(stored, MAINTENANCE_MATERIALS) : defaults;
  });

  const [ignoreCap, setIgnoreCap] = useState(Boolean(initialDraft?.ignoreCap));
  const [capReason, setCapReason] = useState(initialDraft?.capReason ?? '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'local'>('idle');
  const [savedList, setSavedList] = useState<SavedCalculation[]>(() => readSaved());
  const [showSaved, setShowSaved] = useState(false);

  /** Claves de material marcadas automáticamente por la causa de video. */
  const autoVideoMaterials = useRef<string[]>([]);
  /** Evita que el borrador se reescriba justo después de un "Nuevo cálculo". */
  const skipDraftOnce = useRef(false);

  const prices = priceData.prices;
  /** Si el IVA está apagado, todo sale con 0% (la tasa configurada no se toca). */
  const applyTax = priceData.applyTax;
  const taxRate = applyTax ? priceData.taxRate : 0;

  /* Persiste en el dispositivo al instante y sincroniza con la empresa (debounce). */
  useEffect(() => {
    writeStoredPrices(priceData);
    const timer = setTimeout(async () => {
      const ok = await saveRemotePriceData(priceData);
      setSyncStatus(ok ? 'synced' : 'local');
    }, 800);
    return () => clearTimeout(timer);
  }, [priceData]);

  /* Al abrir, carga la configuración compartida de la empresa si existe. */
  useEffect(() => {
    let cancelled = false;
    loadRemotePriceData().then(remote => {
      if (cancelled || !remote) return;
      setPriceData(remote);
      setSyncStatus('synced');
    });
    loadRemoteKits().then(remote => {
      if (cancelled || !remote || remote.length === 0) return;
      setKits(remote);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSaveKits = useCallback((nextKits: MaintenanceKit[]) => {
    setKits(nextKits);
    writeStoredKits(nextKits);
    saveRemoteKits(nextKits);
  }, []);

  const handleApplyKitConfirm = useCallback((kit: MaintenanceKit, options: ApplyKitOptions) => {
    const unsupportedCameraTasks = kit.cameraTasks.filter(key => !SYSTEMS[system].cameraTasks.some(task => task.key === key));
    const unsupportedDvrTasks = kit.dvrTasks.filter(key => !SYSTEMS[system].dvrTasks.some(task => task.key === key));
    if (unsupportedCameraTasks.length || unsupportedDvrTasks.length) {
      const skipped = [
        ...unsupportedCameraTasks.map(key => getCameraTaskLabel(key, system)),
        ...unsupportedDvrTasks.map(key => getDvrTaskLabel(key, system)),
      ];
      window.alert(`El sistema ${SYSTEMS[system].label} no admite estas tareas del kit; se omitirán:\n${skipped.join('\n')}`);
    }
    setDvrGroups(prev => applyKitToGroups(prev, kit, options));
    if (options.materials && Object.keys(options.materials).length > 0) {
      setMaintenanceMaterials(prev => applyKitMaterials(prev, options.materials!));
    }
    setActiveKitId(kit.id);
  }, [system, setDvrGroups]);

  /** Datos del cálculo actual, para borrador, plantillas e historial. */
  const draftPayload = useCallback((): DraftInput => ({
    service: selectedService,
    system,
    data,
    videoCause,
    videoMaterials,
    maintenanceMaterials,
    dvrGroups,
    ignoreCap,
    capReason,
  }), [selectedService, system, data, videoCause, videoMaterials, maintenanceMaterials, dvrGroups, ignoreCap, capReason]);

  /** Vuelve el cálculo a cero y descarta el borrador guardado. */
  const resetCalculator = useCallback(() => {
    skipDraftOnce.current = true;
    clearDraft();
    setSelectedService('maintenance');
    setSystem('analog');
    setData({ ...INITIAL_FORM });
    setVideoCause('unknown');
    setVideoMaterials(initItems(VIDEO_MATERIALS));
    setMaintenanceMaterials(createDefaultMaintenanceKitMaterials());
    setDvrGroups(createDefaultMaintenanceKitDvrGroups());
    setIgnoreCap(false);
    setCapReason('');
    setCopySource(null);
    autoVideoMaterials.current = [];
  }, []);

  /* Borrador: si la app se cierra a mitad del cálculo, se recupera al abrir. */
  useEffect(() => {
    if (!show) {
      skipDraftOnce.current = false;
      return;
    }
    if (skipDraftOnce.current) {
      skipDraftOnce.current = false;
      return;
    }

    const timer = setTimeout(() => { writeDraft(draftPayload()); }, 900);
    return () => clearTimeout(timer);
  }, [show, draftPayload]);

  const { deviceName } = SYSTEMS[system];
  const isMaintenance = selectedService === 'maintenance';
  const isVideo = selectedService === 'video';

  /* ---- handlers ---- */
  const updateField = useCallback((field: keyof ServiceForm, value: string) =>
    setData(prev => ({ ...prev, [field]: value })), []);

  /* Un handler estable por campo: `bind` devuelve así un `onChange` con identidad
   * constante y los campos memoizados no se re-renderizan al escribir en otro. */
  const fieldHandlers = useMemo(() => {
    const keys = Object.keys(INITIAL_FORM) as (keyof ServiceForm)[];
    return Object.fromEntries(keys.map(f => [f, (v: string) => updateField(f, v)])) as Record<
      keyof ServiceForm,
      (v: string) => void
    >;
  }, [updateField]);

  const bind = useCallback((field: keyof ServiceForm) => ({
    value: data[field],
    onChange: fieldHandlers[field],
  }), [data, fieldHandlers]);

  const updatePrice = useCallback((field: PriceKey, value: string) => {
    setSyncStatus('saving');
    setPriceData(prev => ({ ...prev, prices: { ...prev.prices, [field]: nonNegative(value) } }));
  }, []);

  const updateTaxRate = useCallback((value: string) => {
    setSyncStatus('saving');
    setPriceData(prev => {
      const raw = nonNegative(value);
      return { ...prev, taxRate: Math.min(100, raw) };
    });
  }, []);

  const updateMaxDiscount = useCallback((value: string) => {
    setSyncStatus('saving');
    setPriceData(prev => ({ ...prev, maxDiscount: Math.min(100, nonNegative(value)) }));
  }, []);

  const updateApplyTax = useCallback((value: boolean) => {
    setSyncStatus('saving');
    setPriceData(prev => ({ ...prev, applyTax: value }));
  }, []);

  const resetPrices = useCallback(() => {
    setSyncStatus('saving');
    setPriceData(prev => ({ ...prev, prices: { ...DEFAULT_PRICES } }));
  }, []);

  const patchMaterial = useCallback((key: string, p: Partial<MaterialState>) =>
    setMaintenanceMaterials(prev => ({ ...prev, [key]: { ...prev[key], ...p } })), []);

  const patchVideoMaterial = useCallback((key: string, p: Partial<MaterialState>) => {
    /* Si el vendedor toca la selección a mano, deja de ser "sugerida" por la causa. */
    if (p.selected !== undefined) {
      autoVideoMaterials.current = autoVideoMaterials.current.filter(k => k !== key);
    }
    setVideoMaterials(prev => ({ ...prev, [key]: { ...prev[key], ...p } }));
  }, []);

  const handleSystemChange = useCallback((type: SystemType) => {
    setSystem(type);
    setData(prev => ({ ...prev, device: SYSTEMS[type].deviceName }));
    setDvrGroups(prev => prev.map(dvr => ({
      ...dvr,
      maintenance: remapItems(dvr.maintenance, SYSTEMS[type].dvrTasks, ['dvrCleaning']),
      cameras: dvr.cameras.map(cam => ({
        ...cam,
        tasks: remapItems(cam.tasks, SYSTEMS[type].cameraTasks, ['deepCleaningDismount']),
      })),
    })));
  }, []);

  const handleVideoCauseChange = useCallback((cause: VideoCause) => {
    setVideoCause(cause);
    const suggested = VIDEO_CAUSES.find(c => c.value === cause)?.suggested ?? [];
    const previousAuto = autoVideoMaterials.current;

    /* Marca lo sugerido sin borrar lo que el vendedor eligió a mano; solo
     * desmarca lo que había sugerido la causa anterior. */
    setVideoMaterials(prev => Object.fromEntries(
      Object.entries(prev).map(([key, material]) => {
        if (suggested.includes(key)) return [key, { ...material, selected: true }];
        if (previousAuto.includes(key)) return [key, { ...material, selected: false }];
        return [key, material];
      }),
    ));
    autoVideoMaterials.current = [...suggested];
  }, []);

  const onVideoCauseChange = useCallback(
    (value: string) => handleVideoCauseChange(value as VideoCause),
    [handleVideoCauseChange],
  );

  const primaryDvrCameraCount = dvrGroups[0]?.cameras.length ?? 0;

  const handleSetPrimaryCameraCount = useCallback((target: number) => {
    if (!dvrGroups.length) return;
    const targetId = dvrGroups[0].id;
    const current = dvrGroups[0].cameras.length;
    const validCount = Math.max(1, Math.min(64, isNaN(target) ? 1 : target));
    const diff = validCount - current;
    if (diff > 0) {
      actions.addCameras(targetId, diff, system);
    } else if (diff < 0) {
      setDvrGroups(prev => prev.map(d => d.id === targetId
        ? { ...d, cameras: d.cameras.slice(0, validCount) }
        : d));
    }
  }, [dvrGroups, actions, system, setDvrGroups]);

  /* ---- cálculos derivados ---- */
  const camerasWithWork = useMemo(() => countCamerasWithWork(dvrGroups, system), [dvrGroups, system]);
  const allFullOn = useMemo(() => dvrGroups.every(dvr =>
    Object.values(dvr.maintenance).every(task => task.selected)
    && dvr.cameras.every(camera => Object.values(camera.tasks).every(task => task.selected))), [dvrGroups]);
  const laborTier = getLaborCap(camerasWithWork);
  const laborCap = laborTier.cap;

  const videoMaterialsTotal = useMemo(() => sumSelected(videoMaterials), [videoMaterials]);

  const result = useMemo(() => buildQuote({
    service: selectedService, system, prices, data, videoCause, videoMaterials, maintenanceMaterials,
    dvrGroups, laborCap, camerasWithWork, noCap: ignoreCap,
  }), [selectedService, system, prices, data, videoCause, videoMaterials, maintenanceMaterials, dvrGroups, laborCap, camerasWithWork, ignoreCap]);

  const { estimatedTax, estimatedTotal, discountedSubtotal } = useMemo(() => {
    const discountPct = Math.min(100, nonNegative(data.discount));
    const base = result.subtotal * (1 - discountPct / 100);
    const tax = Math.round(base * (taxRate / 100));
    return { discountedSubtotal: base, estimatedTax: tax, estimatedTotal: base + tax };
  }, [result.subtotal, data.discount, taxRate]);

  const discountPct = Math.min(100, nonNegative(data.discount));

  /** Avisos suaves: no bloquean, pero evitan cotizaciones con datos raros. */
  const warnings = useMemo(() => {
    const list: string[] = [];

    if (discountPct > priceData.maxDiscount) {
      list.push(`Descuento de ${discountPct}%: supera el máximo autorizado (${priceData.maxDiscount}%).`);
    }

    for (const dvr of dvrGroups) {
      if (!dvr.active) continue;
      const dvrName = dvr.label || deviceName;

      if (dvr.cameras.length === 0) list.push(`${dvrName} no tiene cámaras agregadas.`);
      if (dvr.included) {
        if (nonNegative(dvr.distance) > 100) list.push(`${dvrName}: distancia al tomacorriente muy alta (${dvr.distance} m).`);
        if (nonNegative(dvr.height) > 15) list.push(`${dvrName}: altura muy alta (${dvr.height} m).`);
        if (nonNegative(dvr.channels) === 0) list.push(`${dvrName}: canales ocupados en 0.`);
      }

      for (const cam of dvr.cameras) {
        if (!cam.active) continue;
        const camName = cam.label || 'Cámara';
        if (nonNegative(cam.distance) > 100) list.push(`${camName}: distancia muy alta (${cam.distance} m).`);
        if (nonNegative(cam.height) > 15) list.push(`${camName}: altura muy alta (${cam.height} m).`);
      }
    }

    return list;
  }, [discountPct, priceData.maxDiscount, dvrGroups, deviceName]);

  const otherNote = selectedService === 'other' ? data.otherText.trim() : '';

  /* ---- salida ---- */
  const handleAddToQuote = useCallback(() => {
    if (!result.lines.some(line => line.amount > 0)) {
      window.alert('No hay conceptos calculados para agregar a la cotización.');
      return;
    }

    if (discountPct > priceData.maxDiscount) {
      const continuar = window.confirm(
        `El descuento de ${discountPct}% supera el máximo autorizado (${priceData.maxDiscount}%).\n\n` +
        'Si continúas, la cotización quedará con ese descuento. ¿Deseas continuar?',
      );
      if (!continuar) return;
    }

    /* Fotos únicas: la misma foto del grabador se adjunta a dos líneas. */
    const uniquePhotos = new Set(result.lines.flatMap(line => line.photos));

    if (uniquePhotos.size > MAX_PHOTOS_PER_QUOTE) {
      const continuar = window.confirm(
        `La cotización lleva ${uniquePhotos.size} fotos (se recomiendan máximo ${MAX_PHOTOS_PER_QUOTE}).\n\n` +
        'Muchas fotos hacen más pesado el guardado y el PDF. ¿Deseas continuar de todas formas?',
      );
      if (!continuar) return;
    }

    const items: QuoteItem[] = result.lines
      .map(line => ({
        item_type: line.itemType,
        description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}${otherNote ? ` | Solicitud: ${otherNote}` : ''}`,
        quantity: 1,
        unit_price: Math.round(line.amount),
        discount: discountPct,
        tax_rate: taxRate,
        photo: serializePhotos(line.photos),
        detail: line.meta ?? null,
      }))
      .filter(it => it.unit_price > 0);

    if (!items.length) return;

    /* Historial: deja copia del trabajo agregado para reutilizarlo después. */
    const stamp = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    setSavedList(addSaved(`Cálculo ${stamp}`, draftPayload(), 'auto'));

    onAddItems(items);
    resetCalculator();
    onHide();
  }, [result.lines, otherNote, onAddItems, onHide, discountPct, taxRate, resetCalculator, priceData.maxDiscount, draftPayload]);

  const summaryText = useMemo(() => [
    'COTIZACIÓN PRELIMINAR S24 — SERVICIOS CCTV',
    `Servicio: ${SERVICES[selectedService].name}`,
    `Resultado: ${result.title}`,
    ...(customerName ? [`Cliente: ${customerName}`] : []),
    ...(otherNote ? [`Descripción: ${otherNote}`] : []),
    '',
    ...result.lines.map(l => `${l.description} (${l.detail}): ${money(l.amount)}`),
    '',
    `Subtotal: ${money(result.subtotal)}`,
    ...(discountPct > 0 ? [`Descuento (${discountPct}%): -${money(result.subtotal - discountedSubtotal)}`] : []),
    applyTax ? `IVA estimado (${taxRate}%): ${money(estimatedTax)}` : 'IVA: no aplica',
    `TOTAL ESTIMADO ${applyTax ? 'CON IVA' : '(SIN IVA)'}: ${money(estimatedTotal)}`,
    '',
    `Observación: ${result.message}`,
  ].join('\n'), [
    selectedService, result, otherNote, estimatedTax, estimatedTotal, discountPct, discountedSubtotal, taxRate, customerName, applyTax,
  ]);

  const copyQuote = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      window.alert('Cotización copiada al portapapeles.');
    } catch {
      window.alert('No fue posible copiar automáticamente. Verifica los permisos del navegador.');
    }
  }, [summaryText]);

  const shareWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    const win = window.open(url, '_blank');
    if (!win) window.location.href = url;
  }, [summaryText]);

  /* Vista previa del PDF sin tener que guardar la cotización. */
  const previewPdf = useCallback(() => {
    const previewQuote = {
      quote_number: 'PREVIA',
      created_at: new Date().toISOString(),
      status: 'draft',
      customers: { full_name: customerName || 'Cliente (vista previa)' },
      items: result.lines.map(line => ({
        item_type: line.itemType,
        description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}`,
        quantity: 1,
        unit_price: Math.round(line.amount),
        discount: discountPct,
        tax_rate: taxRate,
        photo: serializePhotos(line.photos),
      })),
      subtotal: result.subtotal,
      discount_amount: result.subtotal - discountedSubtotal,
      tax_amount: estimatedTax,
      total: estimatedTotal,
    };

    try {
      const { doc, filename } = buildQuotePdf(previewQuote);
      const url = doc.output('bloburl') as unknown as string;
      const win = window.open(url, '_blank');
      if (!win) doc.save(filename);
    } catch {
      window.alert('No fue posible generar la vista previa del PDF.');
    }
  }, [result, discountPct, taxRate, discountedSubtotal, estimatedTax, estimatedTotal, customerName]);

  /** Carga una plantilla o un cálculo del historial en el estado actual. */
  const applyPayload = useCallback((payload: DraftInput) => {
    if (payload.service && payload.service in SERVICES) setSelectedService(payload.service);
    if (payload.system && payload.system in SYSTEMS) setSystem(payload.system);
    setData({ ...INITIAL_FORM, ...payload.data });
    setVideoCause(payload.videoCause ?? 'unknown');
    setVideoMaterials(payload.videoMaterials ?? initItems(VIDEO_MATERIALS));
    setMaintenanceMaterials(payload.maintenanceMaterials ?? initItems(MAINTENANCE_MATERIALS));
    setDvrGroups(payload.dvrGroups?.length ? payload.dvrGroups : [createDvr('DVR / NVR 1', 'analog', false, 4)]);
    setIgnoreCap(Boolean(payload.ignoreCap));
    setCapReason(payload.capReason ?? '');
    autoVideoMaterials.current = [];
  }, []);

  const handleSaveCurrent = useCallback((name: string) => {
    setSavedList(addSaved(name, draftPayload(), 'template'));
  }, [draftPayload]);

  const handleLoadSaved = useCallback((item: SavedCalculation) => {
    applyPayload(item.payload);
    setShowSaved(false);
  }, [applyPayload]);

  const handleDeleteSaved = useCallback((id: string) => {
    setSavedList(removeSaved(id));
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm(
      'Se reemplazará la configuración actual por un kit base de cuatro cámaras. Se seleccionarán la limpieza general y todos los materiales del catálogo con sus cantidades predeterminadas. Revise las cantidades antes de cotizar. ¿Desea continuar?',
    )) resetCalculator();
  }, [resetCalculator]);

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered scrollable dialogClassName="s24-service-calculator-modal">
      <Modal.Header closeButton className="pb-3">
        <div className="d-flex align-items-center gap-2 gap-md-3 flex-wrap w-100">
          <span className="calc-header-icon"><Calculator size={22} /></span>
          <div>
            <Modal.Title className="fw-bold mb-0">Calculadora de servicios CCTV</Modal.Title>
            <div className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>S24 Seguridad Electrónica · Cotización preliminar</div>
          </div>
          <Button variant="link" size="sm" className="calc-header-link ms-auto text-decoration-none text-nowrap"
            onClick={() => setShowSaved(true)} title="Plantillas e historial de cálculos">
            <Bookmark size={14} className="me-1" /> Cálculos
          </Button>
          <Button variant="link" size="sm" className="calc-header-link me-md-3 text-decoration-none text-nowrap"
            onClick={handleReset} title="Restablecer al kit base de mantenimiento para cuatro cámaras">
            <RotateCcw size={14} className="me-1" /> Restablecer kit
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="light" className="calc-intro d-flex align-items-start gap-2 small mb-4">
          <Info size={18} style={{ color: '#144779' }} className="flex-shrink-0 mt-1" />
          <span>“Restablecer kit” carga una base para cuatro cámaras con limpieza general y todos los materiales seleccionados. Se usan las cantidades predeterminadas del catálogo; revíselas y ajuste lo necesario antes de cotizar.</span>
        </Alert>

        <Row className="g-4">
          <Col lg={7}>
            <Card className="calc-card mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <Step n={1}><strong>Seleccione el servicio</strong></Step>
                <span className="calc-section-badge">{SERVICE_ENTRIES.length} opciones</span>
              </Card.Header>
              <Card.Body>
                <ServiceGrid selected={selectedService} onSelect={setSelectedService} />
              </Card.Body>
            </Card>

            <Card className="calc-card mb-3">
              <Card.Header>
                <Step n={2}><strong>Datos del servicio</strong></Step>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  {isMaintenance && (
                    <Col md={6} className="mb-2">
                      <Form.Group>
                        <Form.Label className="small fw-bold">Tipo de Sistema CCTV</Form.Label>
                        <div className="d-flex gap-2">
                          {(Object.keys(SYSTEMS) as SystemType[]).map(type => (
                            <Button key={type} className={`calc-system-toggle w-50 ${system === type ? 'active' : ''}`}
                              variant={system === type ? 'primary' : 'outline-secondary'}
                              onClick={() => handleSystemChange(type)}>
                              {SYSTEMS[type].label}
                            </Button>
                          ))}
                        </div>
                      </Form.Group>
                    </Col>
                  )}

                  {isMaintenance && (
                    <Col md={6} className="mb-2">
                      <Form.Label className="small fw-semibold d-flex justify-content-between align-items-center mb-1">
                        <span>Cantidad de cámaras (Grabador 1)</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{primaryDvrCameraCount} actual(es)</span>
                      </Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        {/* Celda para aumentar o disminuir de uno en uno */}
                        <InputGroup size="sm" style={{ width: '115px' }} className="flex-shrink-0">
                          <Button
                            variant="outline-secondary"
                            className="px-2"
                            onClick={() => handleSetPrimaryCameraCount(primaryDvrCameraCount - 1)}
                            disabled={primaryDvrCameraCount <= 1}
                            title="Disminuir 1 cámara"
                          >
                            <Minus size={13} />
                          </Button>
                          <Form.Control
                            type="number"
                            min={1}
                            max={64}
                            className="text-center px-1 fw-bold"
                            value={primaryDvrCameraCount}
                            onChange={e => handleSetPrimaryCameraCount(parseInt(e.target.value, 10))}
                            aria-label="Cantidad de cámaras en Grabador 1"
                          />
                          <Button
                            variant="outline-secondary"
                            className="px-2"
                            onClick={() => handleSetPrimaryCameraCount(primaryDvrCameraCount + 1)}
                            disabled={primaryDvrCameraCount >= 64}
                            title="Aumentar 1 cámara"
                          >
                            <Plus size={13} />
                          </Button>
                        </InputGroup>

                        {/* Presets rápidos */}
                        <div className="d-flex gap-1 flex-grow-1">
                          {[4, 8, 16].map(num => (
                            <Button
                              key={num}
                              variant={primaryDvrCameraCount === num ? 'primary' : 'outline-secondary'}
                              size="sm"
                              className="flex-fill px-1 text-nowrap"
                              onClick={() => handleSetPrimaryCameraCount(num)}
                            >
                              {num} Cams
                            </Button>
                          ))}
                        </div>
                      </div>
                    </Col>
                  )}

                  {DEVICE_SERVICES.includes(selectedService) && (
                    <Col md={6}>
                      <SelectField id="service-device" label="Equipo principal" options={DEVICE_OPTIONS} {...bind('device')} />
                    </Col>
                  )}

                  {CAUSE_SERVICES.includes(selectedService) && (
                    <Col md={6}>
                      <SelectField id="service-known-cause" label="¿La causa está identificada?"
                        options={KNOWN_CAUSE_OPTIONS} {...bind('knownCause')} />
                    </Col>
                  )}

                  {isMaintenance && (
                    <Col xs={12}>
                      <KitsSelectorPanel
                        system={system}
                        kits={kits}
                        activeKitId={activeKitId}
                        dvrGroups={dvrGroups}
                        prices={prices}
                        onSetActiveKitId={setActiveKitId}
                        onApplyKitConfirm={handleApplyKitConfirm}
                        onSaveKits={handleSaveKits}
                        collapsible
                      />
                    </Col>
                  )}

                  {isMaintenance && (
                    <Col xs={12}>
                      <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
                        <div>
                          <h6 className="fw-bold mb-1"><HardDrive size={16} className="me-1" /> Grabadores y sus Cámaras</h6>
                          <div className="text-muted small">Agrupe las cámaras según el {deviceName} al que están conectadas.</div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap justify-content-end">
                          <Button
                            variant={allFullOn ? 'success' : 'outline-success'}
                            size="sm"
                            onClick={() => actions.fullMaintenance()}
                            title={allFullOn
                              ? 'Quitar todos los servicios de todos los grabadores y cámaras'
                              : 'Marcar todos los servicios de todos los grabadores y cámaras'}
                          >
                            <Zap size={14} className="me-1" /> {allFullOn ? 'Quitar full' : 'Full mantenimiento'}
                          </Button>
                          <Button variant="outline-primary" size="sm" onClick={addDvrGroup}>
                            <PlusCircle size={14} className="me-1" /> Añadir otro Grabador
                          </Button>
                        </div>
                      </div>

                      <Alert variant="info" className="calc-cap-alert py-2 px-3 small mb-3">
                        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                          <div>
                            <strong>Tope de mano de obra por cámara:</strong> {ignoreCap ? 'no aplicado' : money(laborCap)}
                            <br />
                            <span className="text-muted">
                              Ajustado automáticamente según {camerasWithWork} cámara(s) con mano de obra ({laborTier.note}).
                              El mantenimiento del grabador usa el mismo tope según cuántos servicios se marquen.
                              La distancia y la altura extra se suman al valor de la cámara aunque la mano de obra esté topada.
                              El cambio de cableado se cobra aparte y no consume este tope.
                            </span>
                          </div>
                          <Form.Check
                            type="switch"
                            id="ignore-labor-cap"
                            className="flex-shrink-0"
                            checked={ignoreCap}
                            onChange={event => setIgnoreCap(event.target.checked)}
                            label={<span className="small fw-semibold">No aplicar tope</span>}
                          />
                        </div>
                        {ignoreCap && (
                          <Form.Control
                            size="sm"
                            className="mt-2"
                            placeholder="Motivo de la autorización (queda en el detalle de la cotización)"
                            value={capReason}
                            maxLength={120}
                            onChange={event => setCapReason(event.target.value)}
                            aria-label="Motivo para no aplicar el tope"
                          />
                        )}
                      </Alert>

                      {dvrGroups.map(dvr => (
                        <DvrCard key={dvr.id} dvr={dvr} system={system} prices={prices}
                          canRemove={dvrGroups.length > 1} actions={actions} noCap={ignoreCap} />
                      ))}
                    </Col>
                  )}

                  {isMaintenance && (
                    <Col xs={12}>
                      <Panel className="mt-4">
                        <PanelHeader
                          title="Accesorios y repuestos del kit"
                          hint="Incluye fuentes, adaptadores de video, cable, cámaras, cajas de paso, batería y conectores. Al restablecer se selecciona cada material con su cantidad inicial; revísela antes de cotizar. La instalación se cobra por separado."
                        />
                        <ItemRows defs={MAINTENANCE_MATERIALS} state={maintenanceMaterials} patch={patchMaterial} />
                      </Panel>
                    </Col>
                  )}

                  {isVideo && (
                    <>
                      <Col md={6}>
                        <SelectField id="service-video-cause" label="Causa probable de la pérdida" value={videoCause}
                          onChange={onVideoCauseChange}
                          options={VIDEO_CAUSE_OPTIONS} />
                      </Col>
                      <Col md={6}>
                        <SelectField id="service-affected-cameras" label="Cámaras afectadas"
                          options={AFFECTED_OPTIONS} {...bind('affected')} />
                      </Col>
                      {videoCause !== 'unknown' && (
                        <Col xs={12}>
                          <Panel>
                            <PanelHeader
                              title="Materiales probables"
                              hint="Marque los que se requieran y ajuste cantidad y precio."
                              badge={<Badge bg="info" text="dark">{money(videoMaterialsTotal)}</Badge>}
                            />
                            <ItemRows defs={VIDEO_MATERIALS} state={videoMaterials} patch={patchVideoMaterial} priceWidth={170} />
                          </Panel>
                        </Col>
                      )}
                    </>
                  )}

                  {INTERNET_SERVICES.includes(selectedService) && (
                    <Col md={6}>
                      <SelectField id="service-internet" label="¿Hay internet disponible?"
                        options={INTERNET_OPTIONS} {...bind('internet')} />
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

                  <Col md={3}><NumField id="service-discount" icon={Clock3} prefix="%" label="Descuento general" {...bind('discount')} /></Col>
                  <Col md={3}><NumField id="service-travel" icon={MapPin} prefix="$" label="Desplazamiento" {...bind('travel')} /></Col>
                  <Col md={3}><NumField id="service-materials" icon={Package} prefix="$" label="Otros materiales" {...bind('materials')} /></Col>
                  <Col md={3}><NumField id="service-extra-labor" icon={Clock3} prefix="$" label="Mano de obra extra" {...bind('extraLabor')} /></Col>

                  {SURCHARGES.map(({ key, label }) => (
                    <Col md={4} key={key}>
                      <NumField id={`service-${key}`} icon={Clock3} prefix="%" label={`Recargo ${label.toLowerCase()}`} {...bind(key)} />
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>

            <Card className="calc-card">
              <Card.Header className="calc-config-header d-flex justify-content-between align-items-center py-3">
                <div className="d-flex align-items-center gap-2">
                  <Settings size={17} style={{ color: '#64748b' }} />
                  <strong className="small">Configuración de precios</strong>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <Form.Check
                    type="switch"
                    id="quick-apply-tax"
                    className="small mb-0"
                    checked={applyTax}
                    onChange={e => updateApplyTax(e.target.checked)}
                    title="Encender o apagar el IVA en la cotización"
                    label={<span className="small fw-semibold">IVA</span>}
                  />
                  <Button variant="link" size="sm" className="text-decoration-none" onClick={() => setShowPrices(v => !v)}>
                    {showPrices ? 'Ocultar precios' : 'Editar precios'}
                  </Button>
                </div>
              </Card.Header>
              {showPrices && (
                <PriceSettings prices={prices} taxRate={priceData.taxRate} maxDiscount={priceData.maxDiscount}
                  applyTax={applyTax} syncStatus={syncStatus}
                  onChange={updatePrice} onTaxRateChange={updateTaxRate}
                  onMaxDiscountChange={updateMaxDiscount} onApplyTaxChange={updateApplyTax} onReset={resetPrices} />
              )}
            </Card>
          </Col>

          <Col lg={5}>
            <Card className="calc-card h-100">
              <Card.Header>
                <Step n={3}>
                  <div>
                    <strong>Resumen de cotización</strong>
                    <div className="small text-muted">{SERVICES[selectedService].name}</div>
                  </div>
                </Step>
              </Card.Header>
              <Card.Body className="d-flex flex-column">
                {warnings.length > 0 && (
                  <Alert variant="warning" className="py-2 px-3 small">
                    <strong>Revisa antes de cotizar:</strong>
                    <ul className="mb-0 ps-3 mt-1">
                      {warnings.slice(0, 5).map((warning, index) => <li key={index}>{warning}</li>)}
                      {warnings.length > 5 && <li>y {warnings.length - 5} aviso(s) más…</li>}
                    </ul>
                  </Alert>
                )}

                <Alert variant={result.direct ? 'success' : 'warning'} className="calc-summary-result">
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
                  <LineItemRow key={line.id} line={line} />
                )) : (
                  <div className="small text-muted py-3">No hay conceptos calculados.</div>
                )}

                <div className="mt-3 pt-2">
                  <Row2 className="small mb-2" l={<span className="text-muted">Subtotal</span>} r={money(result.subtotal)} />
                  {discountPct > 0 && (
                    <Row2 className="small mb-2" l={<span className="text-muted">Descuento ({discountPct}%)</span>} r={`-${money(result.subtotal - discountedSubtotal)}`} />
                  )}
                  <Row2 className="small mb-2"
                    l={<span className="text-muted">{applyTax ? `IVA estimado (${taxRate}%)` : 'IVA: no aplica'}</span>}
                    r={money(estimatedTax)} />
                  <div className="calc-total-box d-flex justify-content-between align-items-end mt-3">
                    <div>
                      <div className="small text-uppercase text-muted fw-bold">{applyTax ? 'Total estimado con IVA' : 'Total estimado (sin IVA)'}</div>
                      <div className="small text-muted">COP · sujeto a validación</div>
                    </div>
                    <div className="calc-total-amount text-end">{money(estimatedTotal)}</div>
                  </div>
                </div>

                <div className="calc-script-box mt-4">
                  <div className="small text-uppercase text-muted fw-bold">Guion sugerido para el vendedor</div>
                  <p className="small mt-2 mb-0">{result.script}</p>
                </div>

                <div className="calc-summary-footer mt-auto pt-3">
                  <Button variant="primary" className="calc-cta w-100 py-2 fw-semibold" onClick={handleAddToQuote}>
                    <PlusCircle size={17} className="me-2" />Agregar conceptos a cotización
                  </Button>
                  <Button variant="outline-primary" className="calc-cta w-100 mt-2" onClick={previewPdf}>
                    <Eye size={16} className="me-2" />Vista previa del PDF
                  </Button>
                  <Row className="g-2 mt-2">
                    <Col xs={6}>
                      <Button variant="outline-success" className="calc-cta w-100" onClick={shareWhatsApp}>
                        <Send size={15} className="me-1" />WhatsApp
                      </Button>
                    </Col>
                    <Col xs={6}>
                      <Button variant="outline-secondary" className="calc-cta w-100" onClick={copyQuote}>
                        <Copy size={15} className="me-1" />Copiar
                      </Button>
                    </Col>
                  </Row>
                  <div className="calc-footnote mt-3">
                    {applyTax
                      ? 'El IVA mostrado es una estimación. Confirme la configuración tributaria de cada concepto en el ERP antes de emitir la cotización definitiva.'
                      : 'El IVA está apagado: los conceptos se agregarán con 0% de IVA.'}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
    </Modal>

      <SavedCalculationsModal
        show={showSaved}
        onHide={() => setShowSaved(false)}
        items={savedList}
        onSaveCurrent={handleSaveCurrent}
        onLoad={handleLoadSaved}
        onDelete={handleDeleteSaved}
      />

      {copyTarget && (
        <CopyCameraModal
          show
          source={copyTarget.cam}
          cameras={copyTarget.dvr.cameras}
          onHide={() => setCopySource(null)}
          onConfirm={targetIds => {
            actions.applyCameraToSelected(copyTarget.dvr.id, copyTarget.cam.id, targetIds);
            setCopySource(null);
          }}
        />
      )}
    </>
  );
}
