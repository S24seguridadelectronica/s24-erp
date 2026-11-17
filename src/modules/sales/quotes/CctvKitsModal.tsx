import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import {
  Bookmark, Copy, Eye, Info, Minus, Package, Plus, PlusCircle,
  RotateCcw, Send, Zap,
} from 'lucide-react';
import {
  DEFAULT_CAMERA_TASKS, DEFAULT_DVR_TASKS,
  MAINTENANCE_MATERIALS, SURCHARGES, SYSTEMS, getLaborCap,
} from './calcular-servicios/catalog';
import type { SystemType } from './calcular-servicios/catalog';
import type { Items, MaterialState, QuoteItem } from './calcular-servicios/types';
import {
  buildQuote, countCamerasWithWork, initItems, money, nonNegative, remapItems,
} from './calcular-servicios/calc';
import {
  loadRemotePriceData, PRICE_DATA_UPDATED_EVENT, readStoredPrices, saveRemotePriceData, writeStoredPrices,
  type StoredPriceData,
} from './calcular-servicios/priceStorage';
import { clearDraft, readDraft, writeDraft, type DraftInput } from './calcular-servicios/draft';
import { addSaved, readSaved, removeSaved, type SavedCalculation } from './calcular-servicios/savedStore';
import { SavedCalculationsModal } from './calcular-servicios/saved';
import { CopyCameraModal } from './calcular-servicios/copyCamera';
import { DvrCard } from './calcular-servicios/cards';
import { useCctvGroups } from './calcular-servicios/useCctvGroups';
import { ItemRows, Panel, PanelHeader, Row2 } from './calcular-servicios/ui';
import { KitsSelectorPanel } from './kits/KitsSelectorPanel';
import { CableMeasurementPanel } from './kits/CableMeasurementPanel';
import {
  applyKitMaterials,
  applyKitToGroups,
  getCameraTaskLabel,
  getDvrTaskLabel,
  type ApplyKitOptions,
  type MaintenanceKit,
} from './kits/types';
import {
  loadRemoteKits,
  readStoredKits,
  saveRemoteKits,
  writeStoredKits,
} from './kits/kitsStore';
import { MAX_PHOTOS_PER_QUOTE, serializePhotos } from '@/utils/quotePhotos';
import { buildQuotePdf } from '@/services/api/quotePdf';
import './calcular-servicios/CalcularServicios.css';

export interface CctvKitsModalProps {
  show: boolean;
  onHide: () => void;
  onAddItems: (items: QuoteItem[]) => void;
  customerName?: string;
}

export function CctvKitsModal({
  show,
  onHide,
  onAddItems,
  customerName,
}: CctvKitsModalProps) {
  const [initialDraft] = useState(() => readDraft());
  const [system, setSystem] = useState<SystemType>(initialDraft?.system ?? 'analog');
  const [kits, setKits] = useState<MaintenanceKit[]>(() => readStoredKits());
  const [activeKitId, setActiveKitId] = useState<string | null>('kit-2-mantenimiento-camaras');

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
    initialGroups: initialDraft?.dvrGroups,
    system,
    getActiveCameraTasks,
  });

  const [maintenanceMaterials, setMaintenanceMaterials] = useState<Items>(
    () => initialDraft?.maintenanceMaterials ?? initItems(MAINTENANCE_MATERIALS),
  );

  // Parámetros comerciales
  const [discount, setDiscount] = useState(() => initialDraft?.data?.discount ?? '0');
  const [travel, setTravel] = useState(() => initialDraft?.data?.travel ?? '0');
  const [materials, setMaterials] = useState(() => initialDraft?.data?.materials ?? '0');
  const [extraLabor, setExtraLabor] = useState(() => initialDraft?.data?.extraLabor ?? '0');
  const [urgency, setUrgency] = useState(() => initialDraft?.data?.urgency ?? '0');
  const [night, setNight] = useState(() => initialDraft?.data?.night ?? '0');
  const [sunday, setSunday] = useState(() => initialDraft?.data?.sunday ?? '0');

  // Control de tope de mano de obra
  const [ignoreCap, setIgnoreCap] = useState(Boolean(initialDraft?.ignoreCap));
  const [capReason, setCapReason] = useState(initialDraft?.capReason ?? '');

  // Precios y configuración tributaria
  const [priceData, setPriceData] = useState<StoredPriceData>(readStoredPrices);
  const prices = priceData.prices;
  const applyTax = priceData.applyTax;
  const taxRate = applyTax ? priceData.taxRate : 0;
  const surchargeValues = { urgency, night, sunday };
  const surchargeSetters = { urgency: setUrgency, night: setNight, sunday: setSunday };

  // Historial y plantillas
  const [savedList, setSavedList] = useState<SavedCalculation[]>(() => readSaved());
  const [showSaved, setShowSaved] = useState(false);

  // Parámetros de sitio sincronizados con la medición inteligente de cableado (Modelo v2.0)
  const [siteMeasurement, setSiteMeasurement] = useState<{ avgDistance: number; avgHeight: number; isActive: boolean }>({
    avgDistance: 0,
    avgHeight: 3,
    isActive: false,
  });

  const skipDraftOnce = useRef(false);

  useEffect(() => {
    const refreshPrices = () => setPriceData(readStoredPrices());
    window.addEventListener(PRICE_DATA_UPDATED_EVENT, refreshPrices);
    return () => window.removeEventListener(PRICE_DATA_UPDATED_EVENT, refreshPrices);
  }, []);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    loadRemotePriceData().then(remote => {
      if (!cancelled && remote) {
        setPriceData(remote);
        writeStoredPrices(remote);
      }
    });
    loadRemoteKits().then(remote => {
      if (!cancelled && remote && remote.length > 0) {
        setKits(remote);
      }
    });
    return () => { cancelled = true; };
  }, [show]);

  // Borrador automático
  const draftPayload = useCallback((): DraftInput => ({
    service: 'maintenance',
    system,
    data: {
      device: SYSTEMS[system].deviceName,
      knownCause: 'yes',
      affected: '1',
      internet: 'yes',
      otherText: '',
      travel,
      materials,
      extraLabor,
      discount,
      urgency,
      night,
      sunday,
    },
    videoCause: 'unknown',
    videoMaterials: initItems([]),
    maintenanceMaterials,
    dvrGroups,
    ignoreCap,
    capReason,
  }), [system, travel, materials, extraLabor, discount, urgency, night, sunday, maintenanceMaterials, dvrGroups, ignoreCap, capReason]);

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

  // Al cambiar sistema (Analógico / IP)
  const handleSystemChange = (type: SystemType) => {
    setSystem(type);
    setDvrGroups(prev =>
      prev.map(dvr => ({
        ...dvr,
        maintenance: remapItems(dvr.maintenance, SYSTEMS[type].dvrTasks, DEFAULT_DVR_TASKS),
        cameras: dvr.cameras.map(cam => ({
          ...cam,
          tasks: remapItems(cam.tasks, SYSTEMS[type].cameraTasks, DEFAULT_CAMERA_TASKS),
        })),
      })),
    );
  };

  const handleSaveKits = (nextKits: MaintenanceKit[]) => {
    setKits(nextKits);
    writeStoredKits(nextKits);
    saveRemoteKits(nextKits);
  };

  const handleApplyKitConfirm = (kit: MaintenanceKit, options: ApplyKitOptions) => {
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
  };

  const patchMaterial = (key: string, p: Partial<MaterialState>) => {
    setMaintenanceMaterials(prev => ({
      ...prev,
      [key]: { ...prev[key], ...p },
    }));
  };

  const resetAll = () => {
    if (!window.confirm('¿Deseas reiniciar la configuración? Se volverá a 4 cámaras y Kit 2.')) return;
    skipDraftOnce.current = true;
    clearDraft();
    setSystem('analog');
    setDvrGroups([createDvr('DVR / NVR 1', 'analog', false, 4, ['deepCleaningNoDismount'])]);
    setMaintenanceMaterials(initItems(MAINTENANCE_MATERIALS));
    setActiveKitId('kit-2-mantenimiento-camaras');
    setDiscount('0');
    setTravel('0');
    setMaterials('0');
    setExtraLabor('0');
    setUrgency('0');
    setNight('0');
    setSunday('0');
    setIgnoreCap(false);
    setCapReason('');
  };

  const primaryDvrCameraCount = dvrGroups[0]?.cameras.length ?? 0;

  const handleSetPrimaryCameraCount = (target: number) => {
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
  };

  const handleApplyCableDistances = useCallback((distances: { camId: string; distance: number; height: number }[]) => {
    const map = new Map(distances.map(d => [d.camId, d]));
    setDvrGroups(prev =>
      prev.map(dvr => ({
        ...dvr,
        cameras: dvr.cameras.map(cam => {
          const match = map.get(cam.id);
          if (!match) return cam;

          // Habilitar la tarea de cableChange si no está activa
          const currentCableTask = cam.tasks.cableChange;
          const updatedCableTask = currentCableTask
            ? { ...currentCableTask, selected: true, quantity: currentCableTask.quantity || 1 }
            : { selected: true, quantity: 1, unitPrice: prices.pCableDistanceRate || 50000 };

          return {
            ...cam,
            distance: String(match.distance),
            height: String(match.height),
            cableDistance: String(match.distance),
            cableHeight: String(match.height),
            tasks: {
              ...cam.tasks,
              cableChange: updatedCableTask,
            },
          };
        }),
      }))
    );
  }, [prices]);

  // Cálculos derivados
  const camerasWithWork = useMemo(() => countCamerasWithWork(dvrGroups, system), [dvrGroups, system]);
  const laborTier = getLaborCap(camerasWithWork);
  const laborCap = laborTier.cap;

  const quoteResult = useMemo(
    () =>
      buildQuote({
        service: 'maintenance',
        system,
        prices,
        data: {
          device: SYSTEMS[system].deviceName,
          knownCause: 'yes',
          affected: '1',
          internet: 'yes',
          otherText: '',
          travel,
          materials,
          extraLabor,
          discount,
          urgency,
          night,
          sunday,
        },
        videoCause: 'unknown',
        videoMaterials: initItems([]),
        maintenanceMaterials,
        dvrGroups,
        laborCap,
        camerasWithWork,
        noCap: ignoreCap,
      }),
    [system, prices, travel, materials, extraLabor, discount, urgency, night, sunday, maintenanceMaterials, dvrGroups, laborCap, camerasWithWork, ignoreCap],
  );

  const discountPct = Math.min(100, nonNegative(discount));
  const subtotalWithDiscount = quoteResult.subtotal * (1 - discountPct / 100);
  const estimatedTax = applyTax ? Math.round(subtotalWithDiscount * (priceData.taxRate / 100)) : 0;
  const estimatedTotal = subtotalWithDiscount + estimatedTax;

  // Advertencias de validación técnica
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (discountPct > priceData.maxDiscount) {
      list.push(`Descuento de ${discountPct}%: supera el máximo autorizado (${priceData.maxDiscount}%).`);
    }
    for (const dvr of dvrGroups) {
      if (!dvr.active) continue;
      const dvrName = dvr.label || SYSTEMS[system].deviceName;
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
  }, [discountPct, priceData.maxDiscount, dvrGroups, system]);

  // Acciones finales
  const handleAddToQuote = () => {
    if (!quoteResult.lines.some(l => l.amount > 0)) {
      window.alert('No hay conceptos calculados para agregar a la cotización.');
      return;
    }

    if (discountPct > priceData.maxDiscount && !window.confirm(
      `El descuento de ${discountPct}% supera el máximo autorizado (${priceData.maxDiscount}%).\n\n` +
      'Si continúas, la cotización quedará con ese descuento. ¿Deseas continuar?',
    )) return;

    const uniquePhotos = new Set(quoteResult.lines.flatMap(line => line.photos));
    if (uniquePhotos.size > MAX_PHOTOS_PER_QUOTE) {
      const continuar = window.confirm(
        `La cotización lleva ${uniquePhotos.size} fotos (se recomiendan máximo ${MAX_PHOTOS_PER_QUOTE}).\n\n¿Deseas continuar de todas formas?`,
      );
      if (!continuar) return;
    }

    const items: QuoteItem[] = quoteResult.lines
      .map(line => ({
        item_type: line.itemType,
        description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}`,
        quantity: 1,
        unit_price: Math.round(line.amount),
        discount: discountPct,
        tax_rate: taxRate,
        photo: serializePhotos(line.photos),
        detail: line.meta ?? null,
      }))
      .filter(it => it.unit_price > 0);

    if (!items.length) return;

    const stamp = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    setSavedList(addSaved(`Kits ${stamp}`, draftPayload(), 'auto'));

    onAddItems(items);
    resetAll();
    onHide();
  };

  const previewPdf = () => {
    const previewQuote = {
      quote_number: 'PREVIA',
      created_at: new Date().toISOString(),
      status: 'draft',
      customers: { full_name: customerName || 'Cliente (vista previa)' },
      items: quoteResult.lines.map(line => ({
        item_type: line.itemType,
        description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}`,
        quantity: 1,
        unit_price: Math.round(line.amount),
        discount: discountPct,
        tax_rate: taxRate,
        photo: serializePhotos(line.photos),
      })),
      subtotal: quoteResult.subtotal,
      discount_amount: quoteResult.subtotal - subtotalWithDiscount,
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
  };

  const summaryText = [
    'COTIZACIÓN KITS DE MANTENIMIENTO CCTV S24',
    `Sistema: ${SYSTEMS[system].label}`,
    `Kit aplicado: ${activeKit?.name || 'Personalizado'}`,
    ...(customerName ? [`Cliente: ${customerName}`] : []),
    '',
    ...quoteResult.lines.map(l => `${l.description}: ${money(l.amount)}`),
    '',
    `Subtotal: ${money(quoteResult.subtotal)}`,
    ...(discountPct > 0 ? [`Descuento (${discountPct}%): -${money(quoteResult.subtotal - subtotalWithDiscount)}`] : []),
    applyTax ? `IVA (${priceData.taxRate}%): ${money(estimatedTax)}` : 'IVA: No aplica',
    `TOTAL: ${money(estimatedTotal)}`,
  ].join('\n');

  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      window.alert('Cotización copiada al portapapeles.');
    } catch {
      window.alert('No se pudo copiar automáticamente.');
    }
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, '_blank');
  };

  const applyPayload = (payload: DraftInput) => {
    if (payload.system && payload.system in SYSTEMS) setSystem(payload.system);
    if (payload.data?.discount !== undefined) setDiscount(payload.data.discount);
    if (payload.data?.travel !== undefined) setTravel(payload.data.travel);
    if (payload.data?.materials !== undefined) setMaterials(payload.data.materials);
    if (payload.data?.extraLabor !== undefined) setExtraLabor(payload.data.extraLabor);
    if (payload.data?.urgency !== undefined) setUrgency(payload.data.urgency);
    if (payload.data?.night !== undefined) setNight(payload.data.night);
    if (payload.data?.sunday !== undefined) setSunday(payload.data.sunday);
    if (payload.maintenanceMaterials) setMaintenanceMaterials(payload.maintenanceMaterials);
    if (payload.dvrGroups?.length) setDvrGroups(payload.dvrGroups);
    setIgnoreCap(Boolean(payload.ignoreCap));
    setCapReason(payload.capReason ?? '');
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered scrollable dialogClassName="s24-service-calculator-modal s24-kits-modal">
        <Modal.Header closeButton className="border-bottom-0 pb-2">
          <div className="d-flex align-items-center gap-3 flex-wrap w-100">
            <div className="p-2 rounded-3 bg-primary bg-opacity-10 text-primary">
              <Package size={24} />
            </div>
            <div>
              <Modal.Title className="fw-bold">Kits de Mantenimiento CCTV Preconfigurados</Modal.Title>
              <div className="small text-muted">
                S24 Seguridad Electrónica · Cotización inteligente y ágil por kits
              </div>
            </div>
            <div className="ms-auto me-4 d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowSaved(true)}
                title="Plantillas e historial de cálculos"
              >
                <Bookmark size={14} className="me-1" /> Cálculos
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={resetAll}
                title="Reiniciar a configuración inicial"
              >
                <RotateCcw size={14} className="me-1" /> Reiniciar
              </Button>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body className="pt-2" style={{ maxHeight: '82vh', overflowY: 'auto' }}>
          <Alert variant="light" className="border d-flex align-items-start gap-2 small mb-4">
            <Info size={18} className="text-primary flex-shrink-0 mt-1" />
            <span>
              <strong>Sistema Inteligente de Kits:</strong> Selecciona un kit para configurar automáticamente las actividades de las cámaras y grabadores. Podrás personalizar cámaras individuales con metrajes, dificultades de acceso, cableado y fotos de evidencia técnica.
            </span>
          </Alert>

          <Row className="g-4">
            {/* COLUMNA IZQUIERDA: CONFIGURADOR DE KITS */}
            <Col lg={7}>
              {/* MEDICIÓN INTELIGENTE DE CABLEADO (MODELO v2.0) */}
              <CableMeasurementPanel
                system={system}
                dvrGroups={dvrGroups}
                onApplyCableDistances={handleApplyCableDistances}
                onSiteParamsChange={setSiteMeasurement}
              />

              {/* PASO 1: EQUIPOS Y SISTEMA */}
              <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <div className="fw-bold small text-uppercase text-secondary">
                    <span className="badge bg-primary me-2">1</span> Sistema y Equipos
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="light" text="dark" className="border">
                      {dvrGroups.reduce((acc, d) => acc + d.cameras.length, 0)} cámaras conectadas
                    </Badge>
                    <Button variant="outline-primary" size="sm" onClick={addDvrGroup}>
                      <PlusCircle size={14} className="me-1" /> Añadir grabador
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={() => actions.fullMaintenance()}>
                      <Zap size={14} className="me-1" /> Mantenimiento completo
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col sm={6}>
                      <Form.Label className="small fw-semibold">Tipo de Sistema CCTV</Form.Label>
                      <div className="d-flex gap-2">
                        {(Object.keys(SYSTEMS) as SystemType[]).map(type => (
                          <Button
                            key={type}
                            className="w-50"
                            variant={system === type ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => handleSystemChange(type)}
                          >
                            {SYSTEMS[type].label}
                          </Button>
                        ))}
                      </div>
                    </Col>
                    <Col sm={6}>
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
                  </Row>
                </Card.Body>
              </Card>

              {/* PASO 2: KITS DE MANTENIMIENTO PRECONFIGURADOS */}
              <KitsSelectorPanel
                system={system}
                kits={kits}
                activeKitId={activeKitId}
                dvrGroups={dvrGroups}
                prices={prices}
                siteParams={siteMeasurement.isActive ? { avgDistance: siteMeasurement.avgDistance, avgHeight: siteMeasurement.avgHeight } : undefined}
                onSetActiveKitId={setActiveKitId}
                onApplyKitConfirm={handleApplyKitConfirm}
                onSaveKits={handleSaveKits}
              />

              {/* PASO 3: REVISIÓN Y PERSONALIZACIÓN DE EQUIPOS (CON PARIDAD TOTAL) */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-bold small text-uppercase text-secondary">
                    <span className="badge bg-primary me-2">3</span> Personalización y Dificultades de Equipos
                  </div>
                </div>

                {dvrGroups.map(dvr => (
                  <DvrCard
                    key={dvr.id}
                    dvr={dvr}
                    system={system}
                    prices={prices}
                    canRemove={dvrGroups.length > 1}
                    actions={actions}
                    noCap={ignoreCap}
                  />
                ))}
              </div>

              {/* Materiales y Repuestos */}
              <Panel className="mb-3">
                <PanelHeader
                  title="Accesorios y repuestos del kit"
                  hint="Marque los repuestos o materiales que realmente se utilizarán y confirme su cantidad."
                />
                <ItemRows defs={MAINTENANCE_MATERIALS} state={maintenanceMaterials} patch={patchMaterial} />
              </Panel>

              {/* Parámetros de Recargos y Descuento */}
              <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-white border-bottom py-3">
                  <strong className="small text-secondary text-uppercase">Condiciones Comerciales y Recargos</strong>
                </Card.Header>
                <Card.Body>
                  <Row className="g-2">
                    <Col sm={6} lg={4}>
                      <Form.Label className="small fw-semibold">Descuento (%)</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min={0}
                        max={100}
                        value={discount}
                        onChange={e => setDiscount(e.target.value)}
                      />
                      <div className="small text-muted" style={{ fontSize: '0.72rem' }}>Máx: {priceData.maxDiscount}%</div>
                    </Col>
                    <Col sm={6} lg={4}>
                      <Form.Label className="small fw-semibold">Desplazamiento ($)</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min={0}
                        value={travel}
                        onChange={e => setTravel(e.target.value)}
                      />
                    </Col>
                    <Col sm={6} lg={4}>
                      <Form.Label className="small fw-semibold">Otros materiales ($)</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min={0}
                        value={materials}
                        onChange={e => setMaterials(e.target.value)}
                      />
                    </Col>
                    <Col sm={6} lg={4}>
                      <Form.Label className="small fw-semibold">Mano de obra extra ($)</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        min={0}
                        value={extraLabor}
                        onChange={e => setExtraLabor(e.target.value)}
                      />
                    </Col>
                    {SURCHARGES.map(({ key, label }) => (
                      <Col sm={6} lg={4} key={key}>
                        <Form.Label className="small fw-semibold">{label} (%)</Form.Label>
                        <Form.Control
                          type="number"
                          size="sm"
                          min={0}
                          value={surchargeValues[key]}
                          onChange={e => surchargeSetters[key](e.target.value)}
                        />
                      </Col>
                    ))}
                    <Col sm={6} lg={4}>
                      <Form.Label className="small fw-semibold">IVA ({priceData.taxRate}%)</Form.Label>
                      <Form.Check
                        type="switch"
                        id="kits-tax-toggle"
                        className="mt-1"
                        checked={applyTax}
                        onChange={e => {
                          const next = { ...priceData, applyTax: e.target.checked };
                          setPriceData(next);
                          writeStoredPrices(next);
                          void saveRemotePriceData(next);
                        }}
                        label={<span className="small">{applyTax ? 'Aplicar IVA' : 'Sin IVA'}</span>}
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* COLUMNA DERECHA: RESUMEN ECONÓMICO */}
            <Col lg={5}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-bottom py-3">
                  <span className="badge bg-success me-2">4</span>
                  <strong>Resumen de Cotización por Kits</strong>
                </Card.Header>
                <Card.Body className="d-flex flex-column">
                  {/* Alertas previas */}
                  {warnings.length > 0 && (
                    <Alert variant="warning" className="py-2 px-3 small mb-3">
                      <strong>Revisa antes de cotizar:</strong>
                      <ul className="mb-0 ps-3 mt-1">
                        {warnings.slice(0, 5).map((w, idx) => <li key={idx}>{w}</li>)}
                        {warnings.length > 5 && <li>y {warnings.length - 5} aviso(s) más…</li>}
                      </ul>
                    </Alert>
                  )}

                  {/* Tope de mano de obra con bypass */}
                  <Alert variant="info" className="py-2 px-3 small mb-3 border-info bg-info bg-opacity-10">
                    <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                      <div>
                        <strong>Tope de mano de obra por cámara:</strong> {ignoreCap ? 'no aplicado' : money(laborCap)}
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                          Calculado para {camerasWithWork} cámara(s) intervenida(s) ({laborTier.note}).
                        </div>
                      </div>
                      <Form.Check
                        type="switch"
                        id="kits-ignore-labor-cap"
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
                        placeholder="Motivo de la autorización comercial"
                        value={capReason}
                        maxLength={120}
                        onChange={event => setCapReason(event.target.value)}
                        aria-label="Motivo para no aplicar el tope"
                      />
                    )}
                  </Alert>

                  <div className="fw-semibold small mb-2">Detalle de conceptos:</div>
                  <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {quoteResult.lines.map(line => (
                      <div key={line.id} className="p-2 border rounded bg-light d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div className="fw-semibold small">{line.description}</div>
                          {line.detail && (
                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                              {line.detail}
                            </div>
                          )}
                          {line.photos && line.photos.length > 0 && (
                            <div className="text-primary small" style={{ fontSize: '0.72rem' }}>
                              📸 {line.photos.length} foto(s) de evidencia adjunta(s)
                            </div>
                          )}
                        </div>
                        <span className="fw-bold text-primary small text-nowrap">
                          {money(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto border-top pt-3">
                    <Row2 className="small mb-1" l={<span className="text-muted">Subtotal Bruto:</span>} r={money(quoteResult.subtotal)} />
                    {discountPct > 0 && (
                      <Row2 className="small mb-1 text-danger" l={<span>Descuento ({discountPct}%):</span>} r={`-${money(quoteResult.subtotal - subtotalWithDiscount)}`} />
                    )}
                    <Row2 className="small mb-2" l={<span className="text-muted">{applyTax ? `IVA (${priceData.taxRate}%):` : 'IVA:'}</span>} r={applyTax ? money(estimatedTax) : 'No aplica'} />

                    <div className="d-flex justify-content-between align-items-baseline border-top pt-2 mt-2">
                      <div className="fw-bold">TOTAL ESTIMADO:</div>
                      <div className="fs-3 fw-bold text-primary">{money(estimatedTotal)}</div>
                    </div>

                    <div className="d-flex flex-column gap-2 mt-4">
                      <Button variant="primary" className="py-2 fw-semibold" onClick={handleAddToQuote}>
                        <PlusCircle size={16} className="me-2" /> Agregar conceptos a cotización
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={previewPdf}>
                        <Eye size={15} className="me-2" /> Vista previa del PDF
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={shareWhatsApp}>
                        <Send size={15} className="me-2" /> Enviar por WhatsApp
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={copyQuote}>
                        <Copy size={15} className="me-2" /> Copiar resumen
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* Selector de copia de configuración de cámara */}
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

      {/* Historial y plantillas guardadas */}
      <SavedCalculationsModal
        show={showSaved}
        onHide={() => setShowSaved(false)}
        items={savedList}
        onSaveCurrent={name => setSavedList(addSaved(name, draftPayload(), 'template'))}
        onLoad={item => {
          applyPayload(item.payload);
          setShowSaved(false);
        }}
        onDelete={id => setSavedList(removeSaved(id))}
      />
    </>
  );
}
