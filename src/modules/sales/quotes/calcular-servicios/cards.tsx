import { memo, useCallback, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, InputGroup, Row } from 'react-bootstrap';
import {
  AlertTriangle, ArrowUp, Camera, ChevronDown, ChevronUp, Copy, Files, HardDrive, MapPin, PlusCircle, Ruler, Trash2, Video, Wrench,
} from 'lucide-react';
import { CAMERA_DIFFICULTIES, DVR_DIFFICULTIES, SYSTEMS, getLaborCap } from './catalog';
import type { Prices, SystemType } from './catalog';
import type { CameraGroup, DifficultyState, DvrGroup, MaterialState } from './types';
import { calcularMontoCableado, cameraAccess, dvrAccess, lineTotal, money, nonNegative, sumSelected } from './calc';
import { Breakdown, DifficultyList, ItemRows, NumField, PhotoGallery, Row2 } from './ui';
import { MAX_PHOTOS_PER_EQUIPMENT } from '@/utils/quotePhotos';

/* =========================================================================
 * Tarjetas de Grabador y Cámara (memoizadas)
 * ========================================================================= */

export interface Actions {
  updateDvr: (id: string, patch: Partial<DvrGroup>) => void;
  removeDvr: (id: string) => void;
  patchDvrDifficulty: (id: string, key: string, patch: Partial<DifficultyState>) => void;
  patchDvrTask: (id: string, key: string, patch: Partial<MaterialState>) => void;
  addCamera: (dvrId: string, system: SystemType) => void;
  addCameras: (dvrId: string, count: number, system: SystemType) => void;
  openCopyCamera: (dvrId: string, camId: string) => void;
  duplicateCamera: (dvrId: string, camId: string) => void;
  applyCameraToSelected: (dvrId: string, camId: string, targetIds: string[]) => void;
  updateCamera: (dvrId: string, camId: string, patch: Partial<CameraGroup>) => void;
  removeCamera: (dvrId: string, camId: string) => void;
  patchCameraTask: (dvrId: string, camId: string, key: string, patch: Partial<MaterialState>) => void;
  patchCameraDifficulty: (dvrId: string, camId: string, key: string, patch: Partial<DifficultyState>) => void;
}

export interface CameraCardProps {
  dvrId: string; cam: CameraGroup; system: SystemType; prices: Prices; actions: Actions;
}

export const CameraCard = memo(function CameraCard({ dvrId, cam, system, prices, actions }: CameraCardProps) {
  const tasks = SYSTEMS[system].cameraTasks;
  const acc = useMemo(() => cameraAccess(cam, prices), [cam, prices]);
  const cable = useMemo(
    () => calcularMontoCableado(
      cam.tasks.cableChange,
      nonNegative(cam.cableDistance),
      nonNegative(cam.cableHeight),
      prices,
    ),
    [cam.tasks.cableChange, cam.cableDistance, cam.cableHeight, prices],
  );
  const set = useCallback((patch: Partial<CameraGroup>) => actions.updateCamera(dvrId, cam.id, patch), [actions, dvrId, cam.id]);
  const setDistance = useCallback((v: string) => set({ distance: v }), [set]);
  const setHeight = useCallback((v: string) => set({ height: v }), [set]);
  const setCableDistance = useCallback((v: string) => set({ cableDistance: v }), [set]);
  const setCableHeight = useCallback((v: string) => set({ cableHeight: v }), [set]);
  const patchTask = useCallback(
    (key: string, p: Partial<MaterialState>) => actions.patchCameraTask(dvrId, cam.id, key, p),
    [actions, dvrId, cam.id],
  );
  const patchDifficulty = useCallback(
    (key: string, p: Partial<DifficultyState>) => actions.patchCameraDifficulty(dvrId, cam.id, key, p),
    [actions, dvrId, cam.id],
  );
  const totalOf = useCallback(
    (key: string) => (key === 'cableChange' ? cable.total : lineTotal(cam.tasks[key])),
    [cable.total, cam.tasks],
  );

  const summary = !cam.active
    ? 'Excluida de la cuenta'
    : tasks.filter(d => cam.tasks[d.key]?.selected).map(d => d.label).join(', ') || 'Sin servicio marcado';

  return (
    <Card className={`mb-3 border shadow-sm ${!cam.active ? 'opacity-50' : ''}`}>
      <Card.Header className="bg-white d-flex justify-content-between align-items-center py-2" style={{ cursor: 'pointer' }}
        onClick={() => set({ expanded: !cam.expanded })}>
        <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
          <div onClick={e => e.stopPropagation()}>
            <Form.Check type="switch" id={`cam-active-${cam.id}`} checked={cam.active}
              onChange={e => set({ active: e.target.checked })}
              label={<span className="fw-bold small">Incluir</span>} />
          </div>
          <span className="text-secondary ms-2">{cam.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
          <Video size={16} className={cam.expanded ? 'text-primary' : 'text-secondary'} />
          <div onClick={e => e.stopPropagation()}>
            <Form.Control size="sm" style={{ maxWidth: 180 }} value={cam.label} disabled={!cam.active}
              onChange={e => set({ label: e.target.value })} placeholder="Ej: Cámara Entrada" />
          </div>
          {!cam.expanded && (
            <span className="small text-muted ms-2 text-truncate" style={{ maxWidth: 250 }}>{summary}</span>
          )}
        </div>
        <Button variant="outline-secondary" size="sm" className="me-1"
          title="Copiar configuración a otras cámaras"
          onClick={e => { e.stopPropagation(); actions.openCopyCamera(dvrId, cam.id); }}>
          <Copy size={14} />
        </Button>
        <Button variant="outline-secondary" size="sm" className="me-1"
          title="Duplicar esta cámara"
          onClick={e => { e.stopPropagation(); actions.duplicateCamera(dvrId, cam.id); }}>
          <Files size={14} />
        </Button>
        <Button variant="outline-danger" size="sm"
          onClick={e => {
            e.stopPropagation();
            const photos = cam.photos.length;
            const extra = photos > 0 ? `\n\nTambién se perderán ${photos} foto(s) de esta cámara.` : '';
            if (window.confirm(`¿Eliminar "${cam.label || 'Cámara'}"?${extra}\n\nEsta acción no se puede deshacer.`)) {
              actions.removeCamera(dvrId, cam.id);
            }
          }}>
          <Trash2 size={14} />
        </Button>
      </Card.Header>

      {cam.expanded && (
        <Card.Body className="bg-light" style={{ pointerEvents: cam.active ? 'auto' : 'none' }}>
          <Form.Group className="mb-3" controlId={`cam-note-${cam.id}`}>
            <Form.Label className="small fw-semibold">Observación del técnico (opcional)</Form.Label>
            <Form.Control
              as="textarea" rows={2} maxLength={200}
              value={cam.note ?? ''}
              disabled={!cam.active}
              onChange={e => set({ note: e.target.value })}
              placeholder="Ej: cámara 3 no enciende, cable cortado en el techo"
            />
          </Form.Group>

          <ItemRows
            defs={tasks} state={cam.tasks} disabled={!cam.active}
            patch={patchTask}
            totalOf={totalOf}
          />

          {cam.tasks.cableChange?.selected && (
            <div className="mt-2 ms-4 p-2 bg-white rounded border">
              <div className="small text-muted mb-2">
                Cableado — base incluida: 0–10 m de distancia y 0–3 m de altura <strong>por punto</strong>.
                Los metros extra se cobran por cada punto.
              </div>
              <Row className="g-2 mb-2">
                <Col sm={6}>
                  <NumField id={`cam-cable-dist-${cam.id}`} size="sm" compact icon={MapPin} unit="m"
                    label="Distancia del cableado (m por punto, 0–10 base)" value={cam.cableDistance} onChange={setCableDistance} />
                </Col>
                <Col sm={6}>
                  <NumField id={`cam-cable-height-${cam.id}`} size="sm" compact icon={ArrowUp} unit="m"
                    label="Altura del cableado (m por punto, 0–3 base)" value={cam.cableHeight} onChange={setCableHeight} />
                </Col>
              </Row>
              <div className="small text-muted" style={{ lineHeight: 1.4 }}>
                <Row2 l={`Base: ${money(cam.tasks.cableChange.unitPrice)} × ${cam.tasks.cableChange.quantity} punto(s)`} r={money(cable.baseAmount)} />
                {cable.extraDistance > 0 && (
                  <Row2 l={`${cable.extraDistance} m dist extra × ${money(prices.pCableDistanceRate)}/m`} r={money(cable.distanceExcess)} />
                )}
                {cable.extraHeight > 0 && (
                  <Row2 l={`${cable.extraHeight} m alt extra × ${money(prices.pCableHeightRate)}/m`} r={money(cable.heightExcess)} />
                )}
                <Row2 className="border-top pt-1 mt-1" l={<strong>Subtotal cableado (fuera del tope)</strong>} r={<strong>{money(cable.total)}</strong>} />
              </div>
            </div>
          )}

          <div className="border-top pt-3 mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-semibold small text-secondary"><Ruler size={14} className="me-1" /> Accesibilidad y Dificultad</div>
              {acc.total > 0 && <Badge bg="warning" text="dark">{money(acc.total)} extra</Badge>}
            </div>

            <div className="small text-muted mb-2 fst-italic bg-white p-2 rounded border">
              * Precios base para 0-3m altura y 0-10m distancia sin obstáculos.
            </div>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <NumField id={`cam-dist-${cam.id}`} size="sm" icon={MapPin} unit="m" label="Distancia al grabador (0–10 m base)"
                  value={cam.distance} onChange={setDistance} />
              </Col>
              <Col sm={6}>
                <NumField id={`cam-height-${cam.id}`} size="sm" icon={ArrowUp} unit="m" label="Altura (0–3 m base)"
                  value={cam.height} onChange={setHeight} />
              </Col>
            </Row>

            {acc.total > 0 && (
              <div className="mb-3">
                <Breakdown rows={[
                  [acc.extraDistance > 0 ? `${acc.extraDistance} m dist extra × ${money(acc.distanceRate)}/m` : 'Sin excedente de distancia', acc.distanceCost],
                  [acc.extraHeight > 0 ? `${acc.extraHeight} m alt extra × ${money(prices.pAccessHeight)}/m` : 'Sin excedente de altura', acc.heightCost],
                  ['Dificultades adicionales', acc.difficultyCost],
                ]} />
              </div>
            )}

            <DifficultyList idPrefix={`cam-diff-${cam.id}`} defs={CAMERA_DIFFICULTIES} state={cam.difficulties} colSm={12}
              onPatch={patchDifficulty} />

            <PhotoGallery
              photos={cam.difficultyPhoto ? [cam.difficultyPhoto] : []}
              label="Foto del obstáculo o dificultad"
              size={70}
              max={1}
              icon={Camera}
              onChange={photos => set({ difficultyPhoto: photos[0] ?? null })}
            />
            <Form.Group className="mt-2" controlId={`cam-diff-note-${cam.id}`}>
              <Form.Label className="small fw-semibold">Descripción de la dificultad (opcional)</Form.Label>
              <Form.Control
                as="textarea" rows={2} maxLength={200}
                value={cam.difficultyNote ?? ''}
                disabled={!cam.active}
                onChange={e => set({ difficultyNote: e.target.value })}
                placeholder="Ej: cámara sobre el techo, se necesita andamio"
              />
            </Form.Group>
          </div>

          <PhotoGallery photos={cam.photos} label="Fotos de la Cámara" size={60} max={MAX_PHOTOS_PER_EQUIPMENT}
            icon={Camera} onChange={photos => set({ photos })} />
        </Card.Body>
      )}
    </Card>
  );
});

export interface DvrCardProps {
  dvr: DvrGroup; system: SystemType; prices: Prices;
  canRemove: boolean; actions: Actions;
  /** El vendedor autorizó no aplicar el tope de mano de obra. */
  noCap?: boolean;
}

export const DvrCard = memo(function DvrCard({ dvr, system, prices, canRemove, actions, noCap = false }: DvrCardProps) {
  const { deviceName, dvrTasks } = SYSTEMS[system];
  const acc = useMemo(() => dvrAccess(dvr, prices), [dvr, prices]);
  const maintenanceTotal = useMemo(() => sumSelected(dvr.maintenance), [dvr.maintenance]);

  /* Mismo tope por volumen que la cámara: a más servicios, menor el tope. */
  const maintenanceServices = useMemo(
    () => Object.values(dvr.maintenance).filter(task => task.selected && lineTotal(task) > 0).length,
    [dvr.maintenance],
  );
  const maintenanceTier = getLaborCap(maintenanceServices);
  const maintenanceCharged = noCap ? maintenanceTotal : Math.min(maintenanceTotal, maintenanceTier.cap);
  const capApplied = !noCap && maintenanceTotal > maintenanceCharged;

  /* Excesos que se suman siempre, aunque no se cobre la base de accesibilidad. */
  const accessExtras = acc.distanceCost + acc.heightCost + acc.channelCost + acc.difficultyCost;
  const accessRows: [string, number][] = [
    ...(dvr.included ? [['Base (0–10 m / 0–3 m / 0–4 canales)', acc.base] as [string, number]] : []),
    [acc.extraDistance > 0 ? `${acc.extraDistance} m dist × ${money(prices.pDvrAccessDistance)}/m` : 'Sin metros adicionales', acc.distanceCost],
    [acc.extraHeight > 0 ? `${acc.extraHeight} m alt × ${money(prices.pDvrAccessHeight)}/m` : 'Sin metros de altura', acc.heightCost],
    [acc.extraChannels > 0 ? `${acc.extraChannels} canal(es) extra × ${money(prices.pDvrExtraChannel)}` : 'Sin canales adicionales', acc.channelCost],
  ];
  const set = useCallback((patch: Partial<DvrGroup>) => actions.updateDvr(dvr.id, patch), [actions, dvr.id]);
  const patchMaintenance = useCallback(
    (key: string, p: Partial<MaterialState>) => actions.patchDvrTask(dvr.id, key, p),
    [actions, dvr.id],
  );
  const patchDifficulty = useCallback(
    (key: string, p: Partial<DifficultyState>) => actions.patchDvrDifficulty(dvr.id, key, p),
    [actions, dvr.id],
  );
  const addCamera = useCallback(() => actions.addCamera(dvr.id, system), [actions, dvr.id, system]);
  const [newCameraCount, setNewCameraCount] = useState('1');

  const addCameras = useCallback(() => {
    const count = Math.max(1, Math.min(20, Number(newCameraCount) || 1));
    actions.addCameras(dvr.id, count, system);
    setNewCameraCount('1');
  }, [actions, dvr.id, system, newCameraCount]);

  return (
    <Card className={`mb-4 border-0 shadow-sm ${!dvr.active ? 'opacity-50' : ''}`}>
      <Card.Header className="bg-primary bg-opacity-10 border-bottom d-flex justify-content-between align-items-center py-2 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <Form.Check type="switch" id={`dvr-active-${dvr.id}`} checked={dvr.active}
            onChange={e => set({ active: e.target.checked })}
            label={<span className="fw-bold small">Incluir</span>} />
          <HardDrive size={18} className="text-primary ms-2" />
          <Form.Control size="sm" style={{ maxWidth: 200 }} value={dvr.label} disabled={!dvr.active}
            onChange={e => set({ label: e.target.value })} placeholder={`Ej: ${deviceName} Principal`} />
        </div>
        <div className="d-flex align-items-center gap-2">
          <InputGroup size="sm" style={{ maxWidth: 180 }}>
            <Form.Control
              type="number" min={1} max={20} value={newCameraCount}
              onChange={e => setNewCameraCount(e.target.value)}
              aria-label="Cantidad de cámaras a agregar"
            />
            <Button variant="outline-secondary" onClick={addCameras} title="Agregar varias cámaras">
              <PlusCircle size={14} className="me-1" /> Cámaras
            </Button>
          </InputGroup>
          {canRemove && (
            <Button variant="outline-danger" size="sm"
              onClick={() => {
                const cameras = dvr.cameras.length;
                const extra = cameras > 0 ? ` con ${cameras} cámara(s) y sus fotos` : '';
                if (window.confirm(`¿Eliminar el grabador "${dvr.label || deviceName}"${extra}?\n\nEsta acción no se puede deshacer.`)) {
                  actions.removeDvr(dvr.id);
                }
              }}>
              <Trash2 size={14} className="me-1" /> Eliminar
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Body className="bg-white" style={{ pointerEvents: dvr.active ? 'auto' : 'none' }}>
        <Form.Group className="mb-3" controlId={`dvr-note-${dvr.id}`}>
          <Form.Label className="small fw-semibold">Observación del técnico (opcional)</Form.Label>
          <Form.Control
            as="textarea" rows={2} maxLength={200}
            value={dvr.note ?? ''}
            disabled={!dvr.active}
            onChange={e => set({ note: e.target.value })}
            placeholder="Ej: grabador en rack, sin espacio lateral"
          />
        </Form.Group>

        <div className="mb-4 p-3 border rounded bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Form.Check type="checkbox" checked={dvr.included} disabled={!dvr.active}
              onChange={e => set({ included: e.target.checked })}
              label={<span className="fw-semibold small text-primary">Cobrar accesibilidad de este Grabador</span>} />
            <Badge bg="info" text="dark">{money(dvr.included ? acc.total : accessExtras)}</Badge>
          </div>

          <div className="text-muted small mt-1 mb-2">
            {dvr.included
              ? 'Base: 0–10 m al tomacorriente, 0–3 m de altura y hasta 4 canales.'
              : 'Sin base: los metros extra, canales y dificultades se cobran aparte.'}
          </div>

          <Row className="g-2 mt-1">
                <Col md={4}>
                  <NumField id={`dvr-dist-${dvr.id}`} size="sm" icon={MapPin} unit="m" label="Dist. al tomacorriente (0–10 m base)"
                    value={dvr.distance} onChange={v => set({ distance: v })} />
                </Col>
                <Col md={4}>
                  <NumField id={`dvr-height-${dvr.id}`} size="sm" icon={ArrowUp} unit="m" label="Altura (0–3 m base)"
                    value={dvr.height} onChange={v => set({ height: v })} />
                </Col>
                <Col md={4}>
                  <NumField id={`dvr-channels-${dvr.id}`} size="sm" icon={Video} unit="canales" label="Canales ocupados"
                    value={dvr.channels} onChange={v => set({ channels: v })} />
                </Col>
              </Row>

              <div className="mb-3">
                <Breakdown rows={accessRows} />
              </div>

              <PhotoGallery photos={dvr.photos} label="Fotos del Grabador" size={80} max={MAX_PHOTOS_PER_EQUIPMENT}
                icon={HardDrive} onChange={photos => set({ photos })} />

              <div className="border-top pt-3 mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold small text-danger"><AlertTriangle size={14} className="me-1" /> Dificultades de Acceso al Grabador</div>
                  <Badge bg="danger" text="white">{money(acc.difficultyCost)}</Badge>
                </div>
                <DifficultyList idPrefix={`diff-${dvr.id}`} defs={DVR_DIFFICULTIES} state={dvr.difficulties} colSm={6}
                  onPatch={patchDifficulty} />

                <PhotoGallery
                  photos={dvr.difficultyPhoto ? [dvr.difficultyPhoto] : []}
                  label="Foto del obstáculo o dificultad"
                  size={70}
                  max={1}
                  icon={Camera}
                  onChange={photos => set({ difficultyPhoto: photos[0] ?? null })}
                />
                <Form.Group className="mt-2" controlId={`dvr-diff-note-${dvr.id}`}>
                  <Form.Label className="small fw-semibold">Descripción de la dificultad (opcional)</Form.Label>
                  <Form.Control
                    as="textarea" rows={2} maxLength={200}
                    value={dvr.difficultyNote ?? ''}
                    disabled={!dvr.active}
                    onChange={e => set({ difficultyNote: e.target.value })}
                    placeholder="Ej: grabador en rack de espaldas, sin espacio para maniobrar"
                  />
                </Form.Group>
              </div>
        </div>

        <div className="mb-4 p-3 border rounded bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0 text-secondary"><Wrench size={16} className="me-1" /> Mantenimiento al {deviceName}</h6>
            <div className="text-end">
              <Badge bg={capApplied ? 'warning' : 'success'} text="dark">{money(maintenanceCharged)}</Badge>
              {capApplied && (
                <div className="small text-muted"><s>{money(maintenanceTotal)}</s></div>
              )}
            </div>
          </div>

          {maintenanceServices > 0 && (
            <div className="small text-muted mb-2">
              Tope de mano de obra: <strong>{money(maintenanceTier.cap)}</strong> para {maintenanceServices} servicio(s) ({maintenanceTier.note}).
              {capApplied && <> Se aplicó un descuento de <strong>{money(maintenanceTotal - maintenanceCharged)}</strong>.</>}
              {noCap && maintenanceTotal > maintenanceTier.cap && <> Tope no aplicado (autorizado).</>}
            </div>
          )}

          <ItemRows defs={dvrTasks} state={dvr.maintenance} disabled={!dvr.active}
            patch={patchMaintenance} />
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3 mt-4">
          <h6 className="fw-bold mb-0 text-secondary"><Video size={16} className="me-1" /> Cámaras conectadas</h6>
          <Button variant="outline-secondary" size="sm" onClick={addCamera}>
            <PlusCircle size={14} className="me-1" /> Añadir Cámara
          </Button>
        </div>

        {dvr.cameras.length === 0 ? (
          <div className="text-muted small fst-italic text-center py-3 border rounded bg-light">
            No hay cámaras agregadas a este grabador.
          </div>
        ) : dvr.cameras.map(cam => (
          <CameraCard key={cam.id} dvrId={dvr.id} cam={cam} system={system} prices={prices} actions={actions} />
        ))}
      </Card.Body>
    </Card>
  );
});
