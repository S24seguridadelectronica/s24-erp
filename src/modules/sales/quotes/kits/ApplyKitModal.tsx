import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import { Check, CheckCircle2, Layers, Package, Sparkles } from 'lucide-react';
import type { ApplyKitOptions, KitApplyMode, MaintenanceKit, MaterialSelection } from './types';
import {
  getCameraTaskLabel,
  getDvrTaskLabel,
  getKitTargetBadgeVariant,
  getKitTargetLabel,
  getMaterialLabel,
} from './types';
import type { DvrGroup, SystemType } from '../calcular-servicios/types';
import { money } from '../calcular-servicios/calc';
import { MAINTENANCE_MATERIALS } from '../calcular-servicios/catalog';

interface ApplyKitModalProps {
  show: boolean;
  kit: MaintenanceKit | null;
  dvrGroups: DvrGroup[];
  system: SystemType;
  onHide: () => void;
  onConfirm: (kit: MaintenanceKit, options: ApplyKitOptions) => void;
}

export function ApplyKitModal({
  show,
  kit,
  dvrGroups,
  system,
  onHide,
  onConfirm,
}: ApplyKitModalProps) {
  const [mode, setMode] = useState<KitApplyMode>('replace');
  const [targetDvrId, setTargetDvrId] = useState<string>('all');
  const [materials, setMaterials] = useState<Record<string, MaterialSelection>>(() => {
    if (!kit || !kit.suggestedMaterials.length) return {};
    return Object.fromEntries(
      kit.suggestedMaterials.map(key => [
        key,
        { selected: false, quantity: 1 },
      ]),
    );
  });

  if (!kit) return null;

  const totalCameras = dvrGroups.reduce((acc, d) => acc + (d.active ? d.cameras.length : 0), 0);
  const totalDvrs = dvrGroups.filter(d => d.active).length;

  const handleApply = () => {
    onConfirm(kit, {
      mode,
      targetDvrId: targetDvrId === 'all' ? 'all' : targetDvrId,
      targetCameraIds: 'all',
      materials,
    });
    onHide();
  };

  const handleToggleMaterial = (key: string, checked: boolean) => {
    setMaterials(prev => ({
      ...prev,
      [key]: {
        selected: checked,
        quantity: prev[key]?.quantity || 1,
      },
    }));
  };

  const handleMaterialQtyChange = (key: string, qty: number) => {
    setMaterials(prev => ({
      ...prev,
      [key]: {
        selected: prev[key]?.selected ?? true,
        quantity: Math.max(1, qty),
      },
    }));
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="border-bottom-0 pb-1">
        <div className="d-flex align-items-center gap-2">
          <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
            <Sparkles size={20} />
          </div>
          <div>
            <Modal.Title className="fs-5 fw-bold mb-0">Aplicar {kit.name}</Modal.Title>
            <div className="small text-muted">Configuración automática de actividades de mantenimiento</div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-2">
        <Alert variant="light" className="border py-2 px-3 mb-3 small">
          <div className="d-flex justify-content-between align-items-center">
            <span><strong>Aplica a:</strong> <Badge bg={getKitTargetBadgeVariant(kit.target)}>{getKitTargetLabel(kit.target)}</Badge></span>
            <span className="text-muted">Afectará {kit.target === 'dvr' ? `${totalDvrs} grabador(es)` : `${totalCameras} cámara(s)${kit.target === 'both' ? ` y ${totalDvrs} grabador(es)` : ''}`}</span>
          </div>
          <div className="text-secondary mt-1">{kit.description}</div>
        </Alert>

        {/* Tareas que se activarán */}
        <Card className="mb-3 border-0 bg-light">
          <Card.Body className="p-3">
            <h6 className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1">
              <CheckCircle2 size={16} className="text-success" /> Actividades que activará este kit:
            </h6>
            <div className="d-flex flex-column gap-1">
              {kit.cameraTasks.length > 0 && (
                <div>
                  <div className="small fw-semibold text-primary mb-1">Cámaras:</div>
                  <ul className="mb-1 ps-3 small">
                    {kit.cameraTasks.map(taskKey => (
                      <li key={taskKey}>
                        <strong>{getCameraTaskLabel(taskKey, system)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {kit.dvrTasks.length > 0 && (
                <div className="mt-2">
                  <div className="small fw-semibold text-secondary mb-1">Grabador (DVR/NVR):</div>
                  <ul className="mb-0 ps-3 small">
                    {kit.dvrTasks.map(taskKey => (
                      <li key={taskKey}>
                        <strong>{getDvrTaskLabel(taskKey, system)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Grabador destino (si hay más de 1) */}
        {dvrGroups.length > 1 && (
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Grabador de destino</Form.Label>
            <Form.Select
              size="sm"
              value={targetDvrId}
              onChange={e => setTargetDvrId(e.target.value)}
            >
              <option value="all">Todos los grabadores ({dvrGroups.length})</option>
              {dvrGroups.map(dvr => (
                <option key={dvr.id} value={dvr.id}>
                  {dvr.label || 'Grabador'} ({dvr.cameras.length} cámaras)
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}

        {/* Modo de aplicación */}
        <Card className="mb-3 border">
          <Card.Header className="bg-white py-2">
            <span className="small fw-bold d-flex align-items-center gap-1">
              <Layers size={15} /> Modo de aplicación de tareas
            </span>
          </Card.Header>
          <Card.Body className="py-2">
            <Form.Check
              type="radio"
              id="mode-replace"
              name="kit-apply-mode"
              label={
                <div>
                  <span className="fw-semibold small">Reemplazar tareas anteriores (Recomendado)</span>
                  <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                    Deja seleccionadas únicamente las tareas incluidas en este kit para cada componente.
                  </div>
                </div>
              }
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
              className="mb-2"
            />
            <Form.Check
              type="radio"
              id="mode-combine"
              name="kit-apply-mode"
              label={
                <div>
                  <span className="fw-semibold small">Combinar con tareas actuales</span>
                  <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                    Conserva las tareas que ya tenías marcadas y añade las de este kit sin duplicarlas.
                  </div>
                </div>
              }
              checked={mode === 'combine'}
              onChange={() => setMode('combine')}
            />
          </Card.Body>
        </Card>

        {/* Materiales sugeridos (opcionales) */}
        {kit.suggestedMaterials.length > 0 && (
          <Card className="border-warning border-opacity-50 bg-warning bg-opacity-10 mb-2">
            <Card.Header className="bg-transparent py-2 border-warning border-opacity-25">
              <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                <Package size={15} className="text-warning text-dark" /> Repuestos y materiales sugeridos
              </span>
            </Card.Header>
            <Card.Body className="py-2">
              <div className="small text-muted mb-2" style={{ fontSize: '0.82rem' }}>
                ⚠️ <strong>Confirmación requerida:</strong> Seleccionar este kit no cobra repuestos automáticamente.
                Marca únicamente los materiales que realmente se utilizarán y confirma su cantidad:
              </div>
              <Row className="g-2">
                {kit.suggestedMaterials.map(matKey => {
                  const catalogMat = MAINTENANCE_MATERIALS.find(m => m.key === matKey);
                  const isChecked = Boolean(materials[matKey]?.selected);
                  const qty = materials[matKey]?.quantity || 1;
                  const unitPrice = catalogMat?.defaultPrice || 0;

                  return (
                    <Col xs={12} key={matKey}>
                      <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border gap-2">
                        <Form.Check
                          type="checkbox"
                          id={`mat-${matKey}`}
                          checked={isChecked}
                          onChange={e => handleToggleMaterial(matKey, e.target.checked)}
                          label={
                            <div>
                              <span className="small fw-semibold">{getMaterialLabel(matKey)}</span>
                              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                Precio unitario: {money(unitPrice)}
                              </div>
                            </div>
                          }
                        />
                        {isChecked && (
                          <div className="d-flex align-items-center gap-2">
                            <span className="small text-muted">Cant:</span>
                            <Form.Control
                              type="number"
                              size="sm"
                              style={{ width: 70 }}
                              min={1}
                              max={999}
                              value={qty}
                              onChange={e => handleMaterialQtyChange(matKey, parseInt(e.target.value) || 1)}
                            />
                            <span className="small fw-bold text-primary">
                              {money(qty * unitPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" size="sm" onClick={handleApply}>
          <Check size={16} className="me-1" /> Confirmar y Aplicar Kit
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
