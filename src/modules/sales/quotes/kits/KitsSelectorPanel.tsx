import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row } from 'react-bootstrap';
import {
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Filter,
  HardDrive,
  Home,
  Layers,
  Package,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Video,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { ApplyKitOptions, KitCommercialGroup, KitTarget, MaintenanceKit } from './types';
import {
  getCameraTaskLabel,
  getCommercialGroupBadgeVariant,
  getCommercialGroupLabel,
  getDvrTaskLabel,
  getKitCommercialGroup,
  getKitDynamicTitle,
  getKitTotalPrice,
  getKitTargetBadgeVariant,
  getKitTargetLabel,
  getMaterialLabel,
} from './types';
import type { DvrGroup, SystemType } from '../calcular-servicios/types';
import { money } from '../calcular-servicios/calc';
import { ApplyKitModal } from './ApplyKitModal';
import { ManageKitsModal } from './ManageKitsModal';

export interface KitsSelectorPanelProps {
  system: SystemType;
  kits: MaintenanceKit[];
  activeKitId: string | null;
  dvrGroups: DvrGroup[];
  /** Precios del catálogo para calcular el total del kit (por cantidad de cámaras). */
  prices?: import('../calcular-servicios/catalog').Prices;
  onSetActiveKitId: (id: string | null) => void;
  onApplyKitConfirm: (kit: MaintenanceKit, options: ApplyKitOptions) => void;
  onSaveKits: (nextKits: MaintenanceKit[]) => void;
  collapsible?: boolean;
}

interface KitDetailModalProps {
  show: boolean;
  kit: MaintenanceKit | null;
  system: SystemType;
  onHide: () => void;
  onSelectForApply: (kit: MaintenanceKit) => void;
}

function getGroupIcon(group: KitCommercialGroup) {
  switch (group) {
    case 'installation':
      return <Home size={15} className="text-info flex-shrink-0" />;
    case 'specialized':
      return <Wrench size={15} className="text-warning flex-shrink-0" />;
    case 'coproperty':
      return <Building2 size={15} className="text-success flex-shrink-0" />;
    case 'base':
    default:
      return <ShieldCheck size={15} className="text-primary flex-shrink-0" />;
  }
}

function KitDetailModal({ show, kit, system, onHide, onSelectForApply }: KitDetailModalProps) {
  if (!kit) return null;

  const group = getKitCommercialGroup(kit);
  const targetLabel = getKitTargetLabel(kit.target);
  const targetVariant = getKitTargetBadgeVariant(kit.target);
  const groupLabel = getCommercialGroupLabel(group);
  const groupVariant = getCommercialGroupBadgeVariant(group);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-light border-bottom py-3">
        <Modal.Title className="d-flex align-items-center gap-2 fs-6">
          <div className="p-2 rounded bg-white shadow-sm border">{getGroupIcon(group)}</div>
          <div>
            <div className="fw-bold text-dark">{kit.name}</div>
            <div className="d-flex align-items-center gap-1 mt-1">
              <Badge bg={groupVariant} style={{ fontSize: '0.7rem' }}>
                {groupLabel}
              </Badge>
              <Badge bg={targetVariant} style={{ fontSize: '0.7rem' }}>
                {targetLabel}
              </Badge>
              {kit.suggestedChannels && (
                <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                  {kit.suggestedChannels} Canales
                </Badge>
              )}
            </div>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3">
        {/* Ficha técnica comercial */}
        <div className="p-3 mb-3 bg-light rounded border">
          <div className="fw-bold small text-uppercase text-secondary mb-2 d-flex align-items-center gap-1">
            <Layers size={14} /> Ficha Técnica & Alcance Comercial
          </div>
          <Row className="g-2 small">
            <Col md={6}>
              <div>
                <strong>Perfil de Cliente Recomendado:</strong>
              </div>
              <div className="text-muted">{kit.clientProfile || 'General (Hogares, Comercios, Oficinas)'}</div>
            </Col>
            <Col md={6}>
              <div>
                <strong>Canalización / Ductería Sugerida:</strong>
              </div>
              <div className="text-muted">{kit.suggestedDuct || 'Estándar según dimensiones del sitio'}</div>
            </Col>
          </Row>
        </div>

        {/* Descripción */}
        <div className="mb-3">
          <h6 className="fw-bold small text-uppercase text-secondary mb-1">Descripción del Servicio</h6>
          <p className="small text-muted mb-0">{kit.description}</p>
        </div>

        {/* Actividades de Cámaras */}
        {kit.cameraTasks.length > 0 && (
          <div className="mb-3">
            <h6 className="fw-bold small text-uppercase text-secondary mb-2 d-flex align-items-center gap-1">
              <Video size={14} className="text-success" /> Actividades en Cámaras ({kit.cameraTasks.length})
            </h6>
            <div className="d-flex flex-wrap gap-1">
              {kit.cameraTasks.map(taskKey => (
                <Badge
                  key={taskKey}
                  bg="light"
                  text="dark"
                  className="border py-1 px-2 d-inline-flex align-items-center gap-1"
                  style={{ fontSize: '0.75rem', fontWeight: 500 }}
                >
                  <Check size={12} className="text-success" />
                  {getCameraTaskLabel(taskKey, system)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actividades de Grabador (DVR/NVR) */}
        {kit.dvrTasks.length > 0 && (
          <div className="mb-3">
            <h6 className="fw-bold small text-uppercase text-secondary mb-2 d-flex align-items-center gap-1">
              <HardDrive size={14} className="text-info" /> Actividades en Grabador DVR/NVR ({kit.dvrTasks.length})
            </h6>
            <div className="d-flex flex-wrap gap-1">
              {kit.dvrTasks.map(taskKey => (
                <Badge
                  key={taskKey}
                  bg="light"
                  text="dark"
                  className="border py-1 px-2 d-inline-flex align-items-center gap-1"
                  style={{ fontSize: '0.75rem', fontWeight: 500 }}
                >
                  <Check size={12} className="text-info" />
                  {getDvrTaskLabel(taskKey, system)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Materiales Recomendados */}
        {kit.suggestedMaterials.length > 0 && (
          <div className="p-3 bg-warning bg-opacity-10 rounded border border-warning border-opacity-25">
            <h6 className="fw-bold small text-uppercase text-warning-emphasis mb-2 d-flex align-items-center gap-1">
              <Package size={14} className="text-warning" /> Materiales Sugeridos para la Cotización
            </h6>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {kit.suggestedMaterials.map(matKey => (
                <Badge
                  key={matKey}
                  bg="white"
                  text="dark"
                  className="border py-1 px-2 shadow-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  {getMaterialLabel(matKey)}
                </Badge>
              ))}
            </div>
            <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
              ℹ️ Nota: Estos materiales se sugieren para garantizar la calidad del servicio, pero pueden ser ajustados o
              desmarcados antes de aplicar a la cotización.
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="bg-light border-top py-2 d-flex justify-content-between">
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Cerrar
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="fw-semibold px-3"
          onClick={() => {
            onHide();
            onSelectForApply(kit);
          }}
        >
          <Zap size={14} className="me-1" /> Configurar y Aplicar Kit
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export function KitsSelectorPanel({
  system,
  kits,
  activeKitId,
  dvrGroups,
  prices,
  onSetActiveKitId,
  onApplyKitConfirm,
  onSaveKits,
  collapsible = false,
}: KitsSelectorPanelProps) {
  const [selectedGroup, setSelectedGroup] = useState<'all' | KitCommercialGroup>('all');
  const [targetFilter, setTargetFilter] = useState<'all' | KitTarget>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitForApply, setSelectedKitForApply] = useState<MaintenanceKit | null>(null);
  const [detailKit, setDetailKit] = useState<MaintenanceKit | null>(null);
  const [showManageKits, setShowManageKits] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const activeKit = useMemo(() => kits.find(k => k.id === activeKitId) || null, [kits, activeKitId]);

  // Cantidad de cámaras activas en la cotización (para el título y precio dinámicos).
  const cameraCount = useMemo(
    () => dvrGroups.reduce((sum, d) => sum + (d.active ? d.cameras.length : 0), 0),
    [dvrGroups],
  );

  // Conteos dinámicos por grupo comercial
  const groupCounts = useMemo(() => {
    const activeList = kits.filter(k => k.active);
    const counts = {
      all: activeList.length,
      base: 0,
      installation: 0,
      specialized: 0,
      coproperty: 0,
    };
    for (const k of activeList) {
      const g = getKitCommercialGroup(k);
      if (g in counts) counts[g]++;
    }
    return counts;
  }, [kits]);

  // Filtrado reactivo en vivo por grupo, target y texto
  const filteredKits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return kits
      .filter(k => k.active)
      .filter(k => {
        // Filtro por grupo comercial
        if (selectedGroup !== 'all' && getKitCommercialGroup(k) !== selectedGroup) {
          return false;
        }
        // Filtro por target (cámara / dvr / ambos)
        if (targetFilter !== 'all' && k.target !== targetFilter) {
          return false;
        }
        // Búsqueda textual inteligente
        if (query) {
          const matchName =
            k.name.toLowerCase().includes(query) || (k.shortName && k.shortName.toLowerCase().includes(query));
          const matchDesc = k.description.toLowerCase().includes(query);
          const matchProfile = k.clientProfile && k.clientProfile.toLowerCase().includes(query);
          const matchId = k.id.toLowerCase().includes(query);
          const matchTasks =
            k.cameraTasks.some(t => getCameraTaskLabel(t, system).toLowerCase().includes(query)) ||
            k.dvrTasks.some(t => getDvrTaskLabel(t, system).toLowerCase().includes(query));
          const matchMaterials = k.suggestedMaterials.some(m => getMaterialLabel(m).toLowerCase().includes(query));
          return matchName || matchDesc || matchProfile || matchId || matchTasks || matchMaterials;
        }
        return true;
      });
  }, [kits, selectedGroup, targetFilter, searchQuery, system]);

  const handleApplyConfirm = (kit: MaintenanceKit, options: ApplyKitOptions) => {
    onApplyKitConfirm(kit, options);
    setSelectedKitForApply(null);
  };

  const handleClearFilters = () => {
    setSelectedGroup('all');
    setTargetFilter('all');
    setSearchQuery('');
  };

  return (
    <>
      <Card className="border-0 shadow-sm mb-3">
        {/* Cabecera del Panel */}
        <Card.Header
          className="py-3 d-flex justify-content-between align-items-center flex-wrap gap-2"
          style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}
        >
          <div className="d-flex align-items-center gap-2">
            <div
              className="p-2 rounded text-white shadow-sm"
              style={{ backgroundColor: '#0a2540' }}
            >
              <Package size={20} />
            </div>
            <div>
              <div className="fw-bold small text-uppercase" style={{ color: '#0a2540', letterSpacing: '0.5px' }}>
                Catálogo de Kits Comerciales CCTV
              </div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                18 kits estructurados en 3 grupos comerciales para cotizaciones rápidas y precisas
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {activeKit && (
              <Badge bg="success" className="py-1 px-2 d-flex align-items-center gap-1 shadow-sm">
                <CheckCircle2 size={12} /> Kit Activo: {activeKit.shortName || activeKit.name}
              </Badge>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowManageKits(true)}
              title="Administrar o personalizar catálogo de kits"
            >
              <Settings size={14} className="me-1" /> Administrar Kits
            </Button>
            {collapsible && (
              <Button
                variant="outline-light"
                size="sm"
                className="text-secondary border py-0 px-2"
                onClick={() => setIsExpanded(v => !v)}
              >
                {isExpanded ? 'Ocultar' : 'Ver kits'}
              </Button>
            )}
          </div>
        </Card.Header>

        {(!collapsible || isExpanded) && (
          <Card.Body className="p-3" style={{ backgroundColor: '#f8fafc' }}>
            {/* Banner de Kit Activo */}
            {activeKit && (
              <div className="p-2 mb-3 bg-white border border-primary border-opacity-25 rounded shadow-sm d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2 small">
                  <div className="p-1 rounded bg-primary bg-opacity-10 text-primary">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <strong style={{ color: '#0a2540' }}>{activeKit.name}</strong> activo. Las nuevas cámaras agregadas
                    heredarán sus tareas predeterminadas.
                  </div>
                </div>
                <div className="d-flex gap-1">
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setSelectedKitForApply(activeKit)}
                  >
                    <RotateCcw size={12} className="me-1" /> Re-aplicar a equipos
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => onSetActiveKitId(null)}
                  >
                    Desactivar
                  </Button>
                </div>
              </div>
            )}

            {/* BARRA SUPERIOR: Buscador y Filtros Rápidos */}
            <Row className="g-2 mb-3 align-items-center">
              <Col xs={12} md={5} lg={4}>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-white text-muted">
                    <Search size={14} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Buscar kit por nombre, perfil, tarea o material..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button variant="outline-secondary" onClick={() => setSearchQuery('')} title="Limpiar búsqueda">
                      <X size={14} />
                    </Button>
                  )}
                </InputGroup>
              </Col>

              {/* Filtro secundario de Target (Cámaras / DVR / Ambos) */}
              <Col xs={12} md={7} lg={8} className="d-flex align-items-center justify-content-md-end gap-1 flex-wrap">
                <span className="small text-muted me-1 d-none d-lg-inline" style={{ fontSize: '0.72rem' }}>
                  <Filter size={12} className="me-0.5" /> Tipo:
                </span>
                <Button
                  variant={targetFilter === 'all' ? 'primary' : 'outline-secondary'}
                  size="sm"
                  className="py-0 px-2"
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setTargetFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={targetFilter === 'camera' ? 'info' : 'outline-secondary'}
                  size="sm"
                  className="py-0 px-2"
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setTargetFilter('camera')}
                >
                  <Video size={11} className="me-1" /> Cámaras
                </Button>
                <Button
                  variant={targetFilter === 'dvr' ? 'secondary' : 'outline-secondary'}
                  size="sm"
                  className="py-0 px-2"
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setTargetFilter('dvr')}
                >
                  <HardDrive size={11} className="me-1" /> Grabadores
                </Button>
                <Button
                  variant={targetFilter === 'both' ? 'success' : 'outline-secondary'}
                  size="sm"
                  className="py-0 px-2"
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => setTargetFilter('both')}
                >
                  <Zap size={11} className="me-1" /> Integrales
                </Button>
              </Col>
            </Row>

            {/* GRUPOS COMERCIALES (PILLS CON CONTADORES DINÁMICOS) */}
            <div className="d-flex gap-1 overflow-x-auto pb-2 mb-3 align-items-center">
              <Button
                variant={selectedGroup === 'all' ? 'dark' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm"
                style={{ fontSize: '0.76rem', fontWeight: 600 }}
                onClick={() => setSelectedGroup('all')}
              >
                <span>Todos los Kits</span>
                <Badge bg={selectedGroup === 'all' ? 'light' : 'secondary'} text={selectedGroup === 'all' ? 'dark' : 'white'} className="ms-1">
                  {groupCounts.all}
                </Badge>
              </Button>

              <Button
                variant={selectedGroup === 'base' ? 'primary' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm"
                style={{ fontSize: '0.76rem', fontWeight: 600 }}
                onClick={() => setSelectedGroup('base')}
              >
                <ShieldCheck size={14} className="me-1" />
                <span>Mantenimiento Base (1–10)</span>
                <Badge bg={selectedGroup === 'base' ? 'light' : 'primary'} text={selectedGroup === 'base' ? 'dark' : 'white'} className="ms-1">
                  {groupCounts.base}
                </Badge>
              </Button>

              <Button
                variant={selectedGroup === 'installation' ? 'info' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm text-dark"
                style={{ fontSize: '0.76rem', fontWeight: 600 }}
                onClick={() => setSelectedGroup('installation')}
              >
                <Home size={14} className="me-1" />
                <span>Grupo A: Instalación (11–14)</span>
                <Badge bg={selectedGroup === 'installation' ? 'dark' : 'info'} text="white" className="ms-1">
                  {groupCounts.installation}
                </Badge>
              </Button>

              <Button
                variant={selectedGroup === 'specialized' ? 'warning' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm text-dark"
                style={{ fontSize: '0.76rem', fontWeight: 600 }}
                onClick={() => setSelectedGroup('specialized')}
              >
                <Wrench size={14} className="me-1" />
                <span>Grupo B: Especializados (15–17)</span>
                <Badge bg={selectedGroup === 'specialized' ? 'dark' : 'warning'} text={selectedGroup === 'specialized' ? 'white' : 'dark'} className="ms-1">
                  {groupCounts.specialized}
                </Badge>
              </Button>

              <Button
                variant={selectedGroup === 'coproperty' ? 'success' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm"
                style={{ fontSize: '0.76rem', fontWeight: 600 }}
                onClick={() => setSelectedGroup('coproperty')}
              >
                <Building2 size={14} className="me-1" />
                <span>Grupo C: Copropiedades (18)</span>
                <Badge bg={selectedGroup === 'coproperty' ? 'light' : 'success'} text={selectedGroup === 'coproperty' ? 'dark' : 'white'} className="ms-1">
                  {groupCounts.coproperty}
                </Badge>
              </Button>
            </div>

            {/* RESULTADOS / VACÍO */}
            {filteredKits.length === 0 ? (
              <div className="text-center py-4 bg-white rounded border">
                <Package size={32} className="text-muted mb-2" />
                <h6 className="fw-bold text-dark">No se encontraron kits con los filtros seleccionados</h6>
                <p className="text-muted small mb-3">Prueba ajustando el texto de búsqueda o limpiando los filtros actuales.</p>
                <Button variant="outline-primary" size="sm" onClick={handleClearFilters}>
                  Limpiar filtros de búsqueda
                </Button>
              </div>
            ) : (
              /* GRID COMPACTA DE TARJETAS CON IDENTIDAD S24 */
              <Row className="g-2">
                {filteredKits.map(kit => {
                  const isActive = activeKitId === kit.id;
                  const group = getKitCommercialGroup(kit);
                  const targetVariant = getKitTargetBadgeVariant(kit.target);
                  const groupVariant = getCommercialGroupBadgeVariant(group);
                  const dynamicTitle = getKitDynamicTitle(kit, cameraCount);
                  const kitTotal = prices ? getKitTotalPrice(kit, cameraCount, system) : null;

                  // Extracción de número de kit para badge conciso (ej: KIT 01, KIT 12)
                  const idMatch = kit.id.match(/kit-(\d+)/i);
                  const kitNumBadge = idMatch ? `KIT ${idMatch[1].padStart(2, '0')}` : 'KIT';

                  return (
                    <Col sm={6} lg={4} key={kit.id}>
                      <Card
                        className={`h-100 border shadow-sm transition-all ${
                          isActive ? 'border-primary border-2' : 'border-light-subtle'
                        }`}
                        style={{
                          backgroundColor: isActive ? '#f0f7ff' : '#ffffff',
                          borderRadius: '8px',
                        }}
                      >
                        <Card.Body className="d-flex flex-column p-3">
                          {/* Top row: Badges */}
                          <div className="d-flex justify-content-between align-items-center gap-1 mb-2">
                            <Badge
                              bg="dark"
                              style={{
                                fontSize: '0.65rem',
                                letterSpacing: '0.5px',
                                backgroundColor: '#0a2540',
                              }}
                            >
                              {kitNumBadge}
                            </Badge>
                            <div className="d-flex gap-1 align-items-center">
                              <Badge bg={groupVariant} style={{ fontSize: '0.65rem' }}>
                                {getCommercialGroupLabel(group).split(':')[0]}
                              </Badge>
                              <Badge bg={targetVariant} style={{ fontSize: '0.65rem' }}>
                                {getKitTargetLabel(kit.target)}
                              </Badge>
                            </div>
                          </div>

                          {/* Kit Title */}
                          <div className="d-flex align-items-start gap-1 mb-1">
                            {getGroupIcon(group)}
                            <span
                              className="fw-bold small text-dark flex-grow-1"
                              style={{ lineHeight: 1.25, fontSize: '0.86rem' }}
                            >
                              {dynamicTitle}
                            </span>
                          </div>

                          {/* Precio total del kit según la cantidad de cámaras */}
                          {kitTotal !== null && (
                            <div className="mb-2">
                              <div className="text-muted fw-semibold" style={{ fontSize: '0.65rem', letterSpacing: '0.3px' }}>
                                PRECIO TOTAL
                              </div>
                              <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                                {money(kitTotal)}
                              </div>
                            </div>
                          )}

                          {/* Client Profile / Channels pill */}
                          {kit.clientProfile && (
                            <div
                              className="text-truncate mb-2 text-secondary d-flex align-items-center gap-1"
                              style={{ fontSize: '0.72rem' }}
                              title={kit.clientProfile}
                            >
                              <span className="badge bg-light text-secondary border py-0.5 px-1.5 text-truncate">
                                👥 {kit.clientProfile}
                              </span>
                            </div>
                          )}

                          {/* Description */}
                          <p
                            className="small text-muted mb-2"
                            style={{
                              fontSize: '0.75rem',
                              lineHeight: '1.25',
                              minHeight: '32px',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                            title={kit.description}
                          >
                            {kit.description}
                          </p>

                          {/* Tasks summary */}
                          <div className="mb-2 flex-grow-1">
                            <div className="text-muted fw-semibold mb-1" style={{ fontSize: '0.68rem', letterSpacing: '0.3px' }}>
                              ACTIVIDADES PRINCIPALES:
                            </div>
                            <ul className="list-unstyled mb-0 ps-0" style={{ fontSize: '0.73rem' }}>
                              {kit.cameraTasks.slice(0, 2).map(key => (
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
                              {kit.cameraTasks.length + kit.dvrTasks.length > 3 && (
                                <li className="text-muted fst-italic" style={{ fontSize: '0.68rem' }}>
                                  + {kit.cameraTasks.length + kit.dvrTasks.length - 3} actividades adicionales...
                                </li>
                              )}
                            </ul>

                            {kit.suggestedMaterials.length > 0 && (
                              <div
                                className="mt-2 pt-1 border-top small text-warning-emphasis d-flex align-items-center gap-1"
                                style={{ fontSize: '0.7rem' }}
                              >
                                <Package size={12} className="text-warning flex-shrink-0" />
                                <span className="text-truncate" title={kit.suggestedMaterials.map(m => getMaterialLabel(m)).join(', ')}>
                                  Materiales: {kit.suggestedMaterials.map(m => getMaterialLabel(m).split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="mt-auto pt-2 border-top d-flex gap-1">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="px-2"
                              style={{ fontSize: '0.72rem' }}
                              onClick={() => setDetailKit(kit)}
                              title="Ver ficha técnica comercial completa"
                            >
                              <FileText size={13} className="me-1" /> Ficha
                            </Button>

                            <Button
                              variant={isActive ? 'success' : 'primary'}
                              size="sm"
                              className="w-100 fw-semibold"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => setSelectedKitForApply(kit)}
                            >
                              {isActive ? (
                                <>
                                  <Check size={13} className="me-1" /> Activo (Configurar)
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
            )}
          </Card.Body>
        )}
      </Card>

      {/* MODAL DE DETALLE / FICHA TÉCNICA */}
      <KitDetailModal
        show={Boolean(detailKit)}
        kit={detailKit}
        system={system}
        onHide={() => setDetailKit(null)}
        onSelectForApply={kit => setSelectedKitForApply(kit)}
      />

      {/* MODAL DE APLICACIÓN DE ACTIVIDADES Y MATERIALES A EQUIPOS */}
      <ApplyKitModal
        show={Boolean(selectedKitForApply)}
        kit={selectedKitForApply}
        dvrGroups={dvrGroups}
        system={system}
        onHide={() => setSelectedKitForApply(null)}
        onConfirm={handleApplyConfirm}
      />

      {/* MODAL DE GESTIÓN Y ADMINISTRACIÓN DE KITS */}
      <ManageKitsModal
        show={showManageKits}
        kits={kits}
        onHide={() => setShowManageKits(false)}
        onSaveKits={onSaveKits}
      />
    </>
  );
}
