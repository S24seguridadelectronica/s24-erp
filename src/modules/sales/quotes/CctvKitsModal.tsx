import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import {
  AlertTriangle, ArrowUp, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, Eye,
  HardDrive, Info, Layers, MapPin, Package, PlusCircle, RotateCcw, Send, Settings, Sparkles, Trash2, Video, Wrench, Zap,
} from 'lucide-react';
import {
  BASE, DEFAULT_CAMERA_TASKS, DEFAULT_DVR_TASKS, DEFAULT_PRICES,
  MAINTENANCE_MATERIALS, SURCHARGES, SYSTEMS, getLaborCap,
} from './calcular-servicios/catalog';
import type { SystemType } from './calcular-servicios/catalog';
import type { CameraGroup, DvrGroup, Items, MaterialState, QuoteItem } from './calcular-servicios/types';
import {
  buildQuote, countCamerasWithWork, createCamera, createDvr, initItems, money, nonNegative, remapItems, sumSelected, uid,
} from './calcular-servicios/calc';
import { readStoredPrices } from './calcular-servicios/priceStorage';
import {
  ApplyKitOptions,
  applyKitMaterials,
  applyKitToGroups,
  getCameraTaskLabel,
  getDvrTaskLabel,
  getKitTargetBadgeVariant,
  getKitTargetLabel,
  getMaterialLabel,
  MaintenanceKit,
} from './kits/types';
import {
  loadRemoteKits,
  readStoredKits,
  saveRemoteKits,
  writeStoredKits,
} from './kits/kitsStore';
import { ApplyKitModal } from './kits/ApplyKitModal';
import { ManageKitsModal } from './kits/ManageKitsModal';
import { buildQuotePdf } from '@/services/api/quotePdf';

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
  const [system, setSystem] = useState<SystemType>('analog');
  const [kits, setKits] = useState<MaintenanceKit[]>(() => readStoredKits());
  const [activeKitId, setActiveKitId] = useState<string | null>('kit-2-mantenimiento-camaras');
  const [selectedKitForApply, setSelectedKitForApply] = useState<MaintenanceKit | null>(null);
  const [showManageKits, setShowManageKits] = useState(false);
  const [filter, setFilter] = useState<'all' | 'camera' | 'dvr' | 'both'>('all');
  // Control de expansión individual de tarjetas de cámara (accordion)
  const [expandedCameras, setExpandedCameras] = useState<Set<string>>(new Set());

  const [dvrGroups, setDvrGroups] = useState<DvrGroup[]>(() => [
    createDvr('DVR / NVR 1', 'analog', false, 4),
  ]);
  const [maintenanceMaterials, setMaintenanceMaterials] = useState<Items>(() =>
    initItems(MAINTENANCE_MATERIALS),
  );

  // Parámetros comerciales
  const [discount, setDiscount] = useState('0');
  const [travel, setTravel] = useState('20000');
  const [applyTax, setApplyTax] = useState(true);
  const [taxRate] = useState(19);
  const [urgency, setUrgency] = useState('0');
  const [night, setNight] = useState('0');
  const [sunday, setSunday] = useState('0');

  const priceData = useMemo(() => readStoredPrices(), []);
  const prices = priceData.prices;

  // Carga remota de kits al montar
  useEffect(() => {
    let cancelled = false;
    loadRemoteKits().then(remote => {
      if (cancelled || !remote || remote.length === 0) return;
      setKits(remote);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setDvrGroups(prev => applyKitToGroups(prev, kit, options));
    if (options.materials && Object.keys(options.materials).length > 0) {
      setMaintenanceMaterials(prev => applyKitMaterials(prev, options.materials!));
    }
    setActiveKitId(kit.id);
  };

  // Helper para crear cámara con el kit activo
  const activeKit = kits.find(k => k.id === activeKitId);

  const addCameraToDvr = (dvrId: string) => {
    setDvrGroups(prev =>
      prev.map(d => {
        if (d.id !== dvrId) return d;
        const defaultTasks =
          activeKit &&
          (activeKit.target === 'camera' || activeKit.target === 'both') &&
          activeKit.cameraTasks.length > 0
            ? activeKit.cameraTasks
            : DEFAULT_CAMERA_TASKS;

        return {
          ...d,
          cameras: [
            ...d.cameras,
            createCamera(`Cámara ${d.cameras.length + 1}`, system, true, defaultTasks),
          ],
        };
      }),
    );
  };

  const addCamerasToDvr = (dvrId: string, count: number) => {
    setDvrGroups(prev =>
      prev.map(d => {
        if (d.id !== dvrId) return d;
        const defaultTasks =
          activeKit &&
          (activeKit.target === 'camera' || activeKit.target === 'both') &&
          activeKit.cameraTasks.length > 0
            ? activeKit.cameraTasks
            : DEFAULT_CAMERA_TASKS;

        const newCams = Array.from({ length: Math.max(1, count) }, (_, i) =>
          createCamera(`Cámara ${d.cameras.length + i + 1}`, system, false, defaultTasks),
        );

        return {
          ...d,
          cameras: [...d.cameras, ...newCams],
        };
      }),
    );
  };

  const removeCamera = (dvrId: string, camId: string) => {
    setDvrGroups(prev =>
      prev.map(d => (d.id === dvrId ? { ...d, cameras: d.cameras.filter(c => c.id !== camId) } : d)),
    );
  };

  const patchCameraTask = (dvrId: string, camId: string, taskKey: string, selected: boolean) => {
    setDvrGroups(prev =>
      prev.map(d => {
        if (d.id !== dvrId) return d;
        return {
          ...d,
          cameras: d.cameras.map(c => {
            if (c.id !== camId) return c;
            return {
              ...c,
              tasks: {
                ...c.tasks,
                [taskKey]: { ...c.tasks[taskKey], selected },
              },
            };
          }),
        };
      }),
    );
  };

  const patchDvrTask = (dvrId: string, taskKey: string, selected: boolean) => {
    setDvrGroups(prev =>
      prev.map(d => {
        if (d.id !== dvrId) return d;
        return {
          ...d,
          maintenance: {
            ...d.maintenance,
            [taskKey]: { ...d.maintenance[taskKey], selected },
          },
        };
      }),
    );
  };

  const patchMaterial = (key: string, p: Partial<MaterialState>) => {
    setMaintenanceMaterials(prev => ({
      ...prev,
      [key]: { ...prev[key], ...p },
    }));
  };

  // Re-aplicar el kit activo a todos los equipos existentes
  const reapplyActiveKit = () => {
    if (!activeKit) return;
    setSelectedKitForApply(activeKit);
  };

  const resetAll = () => {
    if (!window.confirm('¿Deseas reiniciar la configuración? Se volverá a 4 cámaras y Kit 2.')) return;
    setSystem('analog');
    setDvrGroups([createDvr('DVR / NVR 1', 'analog', false, 4)]);
    setMaintenanceMaterials(initItems(MAINTENANCE_MATERIALS));
    setActiveKitId('kit-2-mantenimiento-camaras');
    setDiscount('0');
    setTravel('20000');
    setUrgency('0');
    setNight('0');
    setSunday('0');
  };

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
          materials: '0',
          extraLabor: '0',
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
        noCap: false,
      }),
    [system, prices, travel, discount, urgency, night, sunday, maintenanceMaterials, dvrGroups, laborCap, camerasWithWork],
  );

  const discountPct = Math.min(100, nonNegative(discount));
  const subtotalWithDiscount = quoteResult.subtotal * (1 - discountPct / 100);
  const estimatedTax = applyTax ? Math.round(subtotalWithDiscount * (taxRate / 100)) : 0;
  const estimatedTotal = subtotalWithDiscount + estimatedTax;

  // Acciones finales
  const handleAddToQuote = () => {
    if (!quoteResult.lines.some(l => l.amount > 0)) {
      window.alert('No hay conceptos calculados para agregar a la cotización.');
      return;
    }

    const items: QuoteItem[] = quoteResult.lines
      .map(line => ({
        item_type: line.itemType,
        description: `${line.description}${line.detail ? ` — ${line.detail}` : ''}`,
        quantity: 1,
        unit_price: Math.round(line.amount),
        discount: discountPct,
        tax_rate: applyTax ? taxRate : 0,
        detail: line.meta ?? null,
      }))
      .filter(it => it.unit_price > 0);

    onAddItems(items);
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
        tax_rate: applyTax ? taxRate : 0,
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

  const summaryText = useMemo(
    () =>
      [
        'COTIZACIÓN KITS DE MANTENIMIENTO CCTV S24',
        `Sistema: ${SYSTEMS[system].label}`,
        `Kit aplicado: ${activeKit?.name || 'Personalizado'}`,
        ...(customerName ? [`Cliente: ${customerName}`] : []),
        '',
        ...quoteResult.lines.map(l => `${l.description}: ${money(l.amount)}`),
        '',
        `Subtotal: ${money(quoteResult.subtotal)}`,
        ...(discountPct > 0 ? [`Descuento (${discountPct}%): -${money(quoteResult.subtotal - subtotalWithDiscount)}`] : []),
        applyTax ? `IVA (${taxRate}%): ${money(estimatedTax)}` : 'IVA: No aplica',
        `TOTAL: ${money(estimatedTotal)}`,
      ].join('\n'),
    [system, activeKit, customerName, quoteResult, discountPct, subtotalWithDiscount, applyTax, taxRate, estimatedTax, estimatedTotal],
  );

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

  const visibleKits = kits
    .filter(k => k.active)
    .filter(k => (filter === 'all' ? true : k.target === filter));

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered scrollable dialogClassName="s24-kits-modal">
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
                onClick={() => setShowManageKits(true)}
                title="Administrar los kits de mantenimiento"
              >
                <Settings size={14} className="me-1" /> Administrar Kits
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

        <Modal.Body className="pt-2" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <Alert variant="light" className="border d-flex align-items-start gap-2 small mb-4">
            <Info size={18} className="text-primary flex-shrink-0 mt-1" />
            <span>
              <strong>Sistema Inteligente de Kits:</strong> Selecciona un kit para configurar automáticamente todas las actividades de las cámaras y grabadores. Podrás personalizar cámaras individuales si alguna no requiere cierta tarea.
            </span>
          </Alert>

          <Row className="g-4">
            {/* COLUMNA IZQUIERDA: CONFIGURADOR DE KITS */}
            <Col lg={7}>
              {/* PASO 1: EQUIPOS Y SISTEMA */}
              <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <div className="fw-bold small text-uppercase text-secondary">
                    <span className="badge bg-primary me-2">1</span> Sistema y Equipos
                  </div>
                  <Badge bg="light" text="dark" className="border">
                    {dvrGroups.reduce((acc, d) => acc + d.cameras.length, 0)} cámaras conectadas
                  </Badge>
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
                      <Form.Label className="small fw-semibold">Cantidad rápida de cámaras</Form.Label>
                      <div className="d-flex gap-1">
                        {[4, 8, 16].map(num => (
                          <Button
                            key={num}
                            variant="outline-secondary"
                            size="sm"
                            className="flex-fill"
                            onClick={() => {
                              const diff = num - dvrGroups[0].cameras.length;
                              if (diff > 0) addCamerasToDvr(dvrGroups[0].id, diff);
                              else if (diff < 0) {
                                setDvrGroups(prev =>
                                  prev.map(d => ({
                                    ...d,
                                    cameras: d.cameras.slice(0, num),
                                  })),
                                );
                              }
                            }}
                          >
                            {num} Cams
                          </Button>
                        ))}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* PASO 2: KITS DE MANTENIMIENTO PRECONFIGURADOS */}
              <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-white border-bottom py-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="fw-bold small text-uppercase text-secondary">
                      <span className="badge bg-primary me-2">2</span> Kits de Mantenimiento
                    </div>
                    {activeKit && (
                      <Badge bg="success" className="py-1 px-2">
                        Kit Activo: {activeKit.shortName || activeKit.name}
                      </Badge>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  {/* Banner de Kit Activo */}
                  {activeKit && (
                    <div className="p-2 mb-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2 small">
                        <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                        <div>
                          <strong>{activeKit.name}</strong> activo. Las nuevas cámaras que agregues recibirán automáticamente sus tareas.
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <Button variant="primary" size="sm" style={{ fontSize: '0.75rem' }} onClick={reapplyActiveKit}>
                          <RotateCcw size={12} className="me-1" /> Re-aplicar a todos
                        </Button>
                        <Button variant="outline-secondary" size="sm" style={{ fontSize: '0.75rem' }} onClick={() => setActiveKitId(null)}>
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Filtros */}
                  <div className="d-flex gap-1 mb-3 pb-1 overflow-auto">
                    <Button variant={filter === 'all' ? 'secondary' : 'light'} size="sm" className="border py-1 px-2 small" onClick={() => setFilter('all')}>
                      Todos ({kits.filter(k => k.active).length})
                    </Button>
                    <Button variant={filter === 'camera' ? 'secondary' : 'light'} size="sm" className="border py-1 px-2 small" onClick={() => setFilter('camera')}>
                      <Video size={13} className="me-1" /> Solo Cámaras
                    </Button>
                    <Button variant={filter === 'dvr' ? 'secondary' : 'light'} size="sm" className="border py-1 px-2 small" onClick={() => setFilter('dvr')}>
                      <Wrench size={13} className="me-1" /> Solo Grabadores
                    </Button>
                    <Button variant={filter === 'both' ? 'secondary' : 'light'} size="sm" className="border py-1 px-2 small" onClick={() => setFilter('both')}>
                      <Zap size={13} className="me-1" /> Integrales (Cámaras + DVR)
                    </Button>
                  </div>

                  {/* Tarjetas Visuales de Kits */}
                  <Row className="g-2">
                    {visibleKits.map(kit => {
                      const isActive = activeKitId === kit.id;
                      const targetVariant = getKitTargetBadgeVariant(kit.target);

                      return (
                        <Col sm={6} key={kit.id}>
                          <Card
                            className={`h-100 border transition-all ${
                              isActive ? 'border-primary border-2 shadow-sm' : 'border-light-subtle'
                            }`}
                            style={{ backgroundColor: isActive ? '#f8fbff' : '#ffffff' }}
                          >
                            <Card.Body className="d-flex flex-column p-3">
                              <div className="d-flex justify-content-between align-items-start gap-1 mb-1">
                                <span className="fw-bold small text-dark" style={{ lineHeight: 1.25 }}>
                                  {kit.name}
                                </span>
                                <Badge bg={targetVariant} style={{ fontSize: '0.65rem' }}>
                                  {getKitTargetLabel(kit.target)}
                                </Badge>
                              </div>
                              <p className="small text-muted mb-2" style={{ fontSize: '0.78rem', minHeight: '34px' }}>
                                {kit.description}
                              </p>

                              <div className="mb-2 flex-grow-1">
                                <div className="text-muted fw-semibold" style={{ fontSize: '0.7rem' }}>
                                  ACTIVIDADES:
                                </div>
                                <ul className="list-unstyled mb-0 ps-0" style={{ fontSize: '0.75rem' }}>
                                  {kit.cameraTasks.slice(0, 3).map(key => (
                                    <li key={key} className="text-truncate mb-0.5 d-flex align-items-center gap-1">
                                      <Check size={12} className="text-success flex-shrink-0" />
                                      <span title={getCameraTaskLabel(key, system)}>{getCameraTaskLabel(key, system)}</span>
                                    </li>
                                  ))}
                                  {kit.dvrTasks.slice(0, 2).map(key => (
                                    <li key={key} className="text-truncate mb-0.5 d-flex align-items-center gap-1">
                                      <Check size={12} className="text-info flex-shrink-0" />
                                      <span title={getDvrTaskLabel(key, system)}>{getDvrTaskLabel(key, system)}</span>
                                    </li>
                                  ))}
                                </ul>

                                {kit.suggestedMaterials.length > 0 && (
                                  <div className="mt-2 pt-1 border-top small text-warning-emphasis d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                                    <Package size={12} className="text-warning flex-shrink-0" />
                                    <span>Sugeridos: {kit.suggestedMaterials.map(m => getMaterialLabel(m).split(' ')[0]).join(', ')}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-auto pt-2 border-top">
                                <Button
                                  variant={isActive ? 'success' : 'primary'}
                                  size="sm"
                                  className="w-100 fw-semibold"
                                  onClick={() => setSelectedKitForApply(kit)}
                                >
                                  {isActive ? (
                                    <>
                                      <Check size={14} className="me-1" /> Kit Activo (Configurar)
                                    </>
                                  ) : (
                                    <>
                                      <Zap size={13} className="me-1" /> Aplicar Kit
                                    </>
                                  )}
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </Card.Body>
              </Card>

              {/* PASO 3: REVISIÓN Y PERSONALIZACIÓN DE EQUIPOS */}
              <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                  <div className="fw-bold small text-uppercase text-secondary">
                    <span className="badge bg-primary me-2">3</span> Personalización de Equipos y Cámaras
                  </div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => addCameraToDvr(dvrGroups[0].id)}
                  >
                    <PlusCircle size={14} className="me-1" /> Añadir Cámara
                  </Button>
                </Card.Header>
                <Card.Body>
                  {dvrGroups.map(dvr => (
                    <div key={dvr.id} className="mb-3">
                      {/* Grabador */}
                      <div className="p-3 bg-light rounded border mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold small d-flex align-items-center gap-1">
                            <HardDrive size={16} className="text-primary" /> Mantenimiento al {dvr.label || 'Grabador DVR/NVR'}
                          </span>
                        </div>
                        <Row className="g-2">
                          {SYSTEMS[system].dvrTasks.map(task => {
                            const isChecked = Boolean(dvr.maintenance[task.key]?.selected);
                            return (
                              <Col sm={6} key={task.key}>
                                <Form.Check
                                  type="checkbox"
                                  id={`dvr-${dvr.id}-${task.key}`}
                                  checked={isChecked}
                                  onChange={e => patchDvrTask(dvr.id, task.key, e.target.checked)}
                                  label={
                                    <span className="small">
                                      {task.label} <span className="text-muted">({money(task.defaultPrice)})</span>
                                    </span>
                                  }
                                />
                              </Col>
                            );
                          })}
                        </Row>
                      </div>

                      {/* Lista de Cámaras */}
                      <div className="small fw-bold text-secondary mb-2 d-flex align-items-center gap-1">
                        <Video size={15} /> Cámaras configuradas ({dvr.cameras.length}):
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {dvr.cameras.map((cam, idx) => (
                          <Card key={cam.id} className="border">
                            <Card.Header className="bg-white py-2 d-flex justify-content-between align-items-center">
                              <span className="fw-semibold small">
                                {cam.label || `Cámara ${idx + 1}`}
                              </span>
                              <div className="d-flex align-items-center gap-2">
                                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                  {SYSTEMS[system].cameraTasks.filter(t => cam.tasks[t.key]?.selected).length} tareas activas
                                </span>
                                {dvr.cameras.length > 1 && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="p-1"
                                    onClick={() => removeCamera(dvr.id, cam.id)}
                                    title="Eliminar cámara"
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                )}
                              </div>
                            </Card.Header>
                            <Card.Body className="py-2 bg-light">
                              <Row className="g-1">
                                {SYSTEMS[system].cameraTasks.map(task => {
                                  const isChecked = Boolean(cam.tasks[task.key]?.selected);
                                  return (
                                    <Col sm={6} key={task.key}>
                                      <Form.Check
                                        type="checkbox"
                                        id={`cam-${cam.id}-${task.key}`}
                                        checked={isChecked}
                                        onChange={e => patchCameraTask(dvr.id, cam.id, task.key, e.target.checked)}
                                        label={
                                          <span className="small" style={{ fontSize: '0.8rem' }}>
                                            {task.label}
                                          </span>
                                        }
                                      />
                                    </Col>
                                  );
                                })}
                              </Row>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Materiales y Repuestos */}
                  <div className="mt-4 pt-3 border-top">
                    <h6 className="fw-bold small text-dark d-flex align-items-center gap-1 mb-2">
                      <Package size={16} className="text-warning" /> Materiales y repuestos confirmados
                    </h6>
                    <div className="small text-muted mb-2">
                      Marque los materiales que realmente se utilizarán y confirme su cantidad:
                    </div>
                    <Row className="g-2">
                      {MAINTENANCE_MATERIALS.map(mat => {
                        const isChecked = Boolean(maintenanceMaterials[mat.key]?.selected);
                        const qty = maintenanceMaterials[mat.key]?.quantity || 1;
                        return (
                          <Col sm={6} key={mat.key}>
                            <div className="p-2 border rounded bg-light d-flex justify-content-between align-items-center gap-2">
                              <Form.Check
                                type="checkbox"
                                id={`mat-row-${mat.key}`}
                                checked={isChecked}
                                onChange={e => patchMaterial(mat.key, { selected: e.target.checked })}
                                label={
                                  <div className="small">
                                    <span className={isChecked ? 'fw-semibold' : ''}>{mat.label}</span>
                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{money(mat.defaultPrice)}/{mat.unit}</div>
                                  </div>
                                }
                              />
                              {isChecked && (
                                <div className="d-flex align-items-center gap-1">
                                  <span className="small text-muted">Cant:</span>
                                  <Form.Control
                                    type="number"
                                    size="sm"
                                    style={{ width: 60 }}
                                    min={1}
                                    value={qty}
                                    onChange={e => patchMaterial(mat.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                  />
                                </div>
                              )}
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>

                  {/* Parámetros de Recargos y Descuento */}
                  <div className="mt-4 pt-3 border-top">
                    <Row className="g-2">
                      <Col sm={4}>
                        <Form.Label className="small fw-semibold">Descuento (%)</Form.Label>
                        <Form.Control
                          type="number"
                          size="sm"
                          min={0}
                          max={100}
                          value={discount}
                          onChange={e => setDiscount(e.target.value)}
                        />
                      </Col>
                      <Col sm={4}>
                        <Form.Label className="small fw-semibold">Desplazamiento ($)</Form.Label>
                        <Form.Control
                          type="number"
                          size="sm"
                          min={0}
                          value={travel}
                          onChange={e => setTravel(e.target.value)}
                        />
                      </Col>
                      <Col sm={4}>
                        <Form.Label className="small fw-semibold">IVA (19%)</Form.Label>
                        <Form.Check
                          type="switch"
                          id="tax-toggle"
                          className="mt-1"
                          checked={applyTax}
                          onChange={e => setApplyTax(e.target.checked)}
                          label={<span className="small">{applyTax ? 'Aplicar IVA' : 'Sin IVA'}</span>}
                        />
                      </Col>
                    </Row>
                  </div>
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
                  <Alert variant="info" className="py-2 px-3 small mb-3 border-info bg-info bg-opacity-10">
                    <div>
                      <strong>Tope de mano de obra por cámara:</strong> {money(laborCap)}
                      <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                        Calculado para {camerasWithWork} cámara(s) intervenida(s) ({laborTier.note}).
                      </div>
                    </div>
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
                        </div>
                        <span className="fw-bold text-primary small text-nowrap">
                          {money(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto border-top pt-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Subtotal Bruto:</span>
                      <span>{money(quoteResult.subtotal)}</span>
                    </div>
                    {discountPct > 0 && (
                      <div className="d-flex justify-content-between small mb-1 text-danger">
                        <span>Descuento ({discountPct}%):</span>
                        <span>-{money(quoteResult.subtotal - subtotalWithDiscount)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between small mb-2">
                      <span className="text-muted">{applyTax ? `IVA (${taxRate}%):` : 'IVA:'}</span>
                      <span>{applyTax ? money(estimatedTax) : 'No aplica'}</span>
                    </div>

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

      <ApplyKitModal
        show={Boolean(selectedKitForApply)}
        kit={selectedKitForApply}
        dvrGroups={dvrGroups}
        system={system}
        onHide={() => setSelectedKitForApply(null)}
        onConfirm={handleApplyKitConfirm}
      />

      <ManageKitsModal
        show={showManageKits}
        kits={kits}
        onHide={() => setShowManageKits(false)}
        onSaveKits={handleSaveKits}
      />
    </>
  );
}
