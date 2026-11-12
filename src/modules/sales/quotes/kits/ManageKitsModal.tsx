import { useState } from 'react';
import { Badge, Button, Card, Col, Form, ListGroup, Modal, Row } from 'react-bootstrap';
import { ArrowLeft, Check, Copy, Edit, Plus, RotateCcw, Sliders, Trash2 } from 'lucide-react';
import type { KitTarget, MaintenanceKit } from './types';
import {
  getAllAvailableCameraTasks,
  getAllAvailableDvrTasks,
  getKitTargetBadgeVariant,
  getKitTargetLabel,
  INITIAL_KITS,
} from './types';
import { MAINTENANCE_MATERIALS } from '../calcular-servicios/catalog';
import { money, uid } from '../calcular-servicios/calc';

interface ManageKitsModalProps {
  show: boolean;
  kits: MaintenanceKit[];
  onHide: () => void;
  onSaveKits: (kits: MaintenanceKit[]) => void;
}

export function ManageKitsModal({
  show,
  kits,
  onHide,
  onSaveKits,
}: ManageKitsModalProps) {
  const [editingKit, setEditingKit] = useState<MaintenanceKit | null>(null);
  const [isNew, setIsNew] = useState(false);

  const availableCameraTasks = getAllAvailableCameraTasks();
  const availableDvrTasks = getAllAvailableDvrTasks();

  const handleStartCreate = () => {
    setIsNew(true);
    setEditingKit({
      id: `kit-${uid()}`,
      name: '',
      shortName: '',
      description: '',
      target: 'camera',
      cameraTasks: [],
      dvrTasks: [],
      suggestedMaterials: [],
      active: true,
      isBuiltIn: false,
      color: 'primary',
    });
  };

  const handleStartEdit = (kit: MaintenanceKit) => {
    setIsNew(false);
    setEditingKit({ ...kit });
  };

  const handleToggleActive = (id: string, active: boolean) => {
    const next = kits.map(k => (k.id === id ? { ...k, active } : k));
    onSaveKits(next);
  };

  const handleDuplicate = (kit: MaintenanceKit) => {
    const copy: MaintenanceKit = {
      ...kit,
      id: `kit-${uid()}`,
      name: `${kit.name} (copia)`,
      shortName: kit.shortName ? `${kit.shortName} (copia)` : undefined,
      isBuiltIn: false,
      active: true,
    };
    onSaveKits([...kits, copy]);
  };

  const handleDelete = (kit: MaintenanceKit) => {
    if (window.confirm(`¿Estás seguro de eliminar el kit "${kit.name}"?`)) {
      onSaveKits(kits.filter(k => k.id !== kit.id));
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Deseas restaurar los kits iniciales predeterminados de S24 ERP? Se recuperarán los 5 kits base.')) {
      onSaveKits([...INITIAL_KITS]);
    }
  };

  const handleSaveEdit = () => {
    if (!editingKit) return;
    if (!editingKit.name.trim()) {
      window.alert('Por favor ingresa un nombre para el kit.');
      return;
    }
    if (editingKit.target !== 'dvr' && editingKit.cameraTasks.length === 0) {
      window.alert('Debes seleccionar al menos una actividad de cámaras para este kit.');
      return;
    }
    if (editingKit.target === 'dvr' && editingKit.dvrTasks.length === 0) {
      window.alert('Debes seleccionar al menos una actividad de grabador para este kit.');
      return;
    }

    let next: MaintenanceKit[];
    if (isNew) {
      next = [...kits, editingKit];
    } else {
      next = kits.map(k => (k.id === editingKit.id ? editingKit : k));
    }

    onSaveKits(next);
    setEditingKit(null);
  };

  const toggleCameraTask = (key: string) => {
    if (!editingKit) return;
    const exists = editingKit.cameraTasks.includes(key);
    setEditingKit({
      ...editingKit,
      cameraTasks: exists
        ? editingKit.cameraTasks.filter(k => k !== key)
        : [...editingKit.cameraTasks, key],
    });
  };

  const toggleDvrTask = (key: string) => {
    if (!editingKit) return;
    const exists = editingKit.dvrTasks.includes(key);
    setEditingKit({
      ...editingKit,
      dvrTasks: exists
        ? editingKit.dvrTasks.filter(k => k !== key)
        : [...editingKit.dvrTasks, key],
    });
  };

  const toggleSuggestedMaterial = (key: string) => {
    if (!editingKit) return;
    const exists = editingKit.suggestedMaterials.includes(key);
    setEditingKit({
      ...editingKit,
      suggestedMaterials: exists
        ? editingKit.suggestedMaterials.filter(k => k !== key)
        : [...editingKit.suggestedMaterials, key],
    });
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="border-bottom-0 pb-1">
        <div className="d-flex align-items-center gap-2">
          <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
            <Sliders size={20} />
          </div>
          <div>
            <Modal.Title className="fs-5 fw-bold mb-0">
              {editingKit ? (isNew ? 'Crear Nuevo Kit' : 'Editar Kit') : 'Administración de Kits de Mantenimiento'}
            </Modal.Title>
            <div className="small text-muted">
              {editingKit
                ? 'Asigna actividades, componentes y materiales sugeridos'
                : 'Configura plantillas inteligentes para cotizaciones de CCTV'}
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-2">
        {editingKit ? (
          <div>
            <Button
              variant="link"
              size="sm"
              className="px-0 mb-3 text-decoration-none"
              onClick={() => setEditingKit(null)}
            >
              <ArrowLeft size={16} className="me-1" /> Volver a la lista de kits
            </Button>

            <Row className="g-3">
              <Col md={8}>
                <Form.Group controlId="kit-name">
                  <Form.Label className="small fw-semibold">Nombre del Kit</Form.Label>
                  <Form.Control
                    size="sm"
                    value={editingKit.name}
                    placeholder="Ej: KIT 3. Mantenimiento Preventivo Especial"
                    onChange={e => setEditingKit({ ...editingKit, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="kit-target">
                  <Form.Label className="small fw-semibold">Aplica a:</Form.Label>
                  <Form.Select
                    size="sm"
                    value={editingKit.target}
                    onChange={e => setEditingKit({ ...editingKit, target: e.target.value as KitTarget })}
                  >
                    <option value="camera">Solo Cámaras</option>
                    <option value="dvr">Solo DVR / NVR</option>
                    <option value="both">Integral (Cámaras + Grabadores)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="kit-desc">
                  <Form.Label className="small fw-semibold">Descripción del alcance</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    size="sm"
                    value={editingKit.description}
                    placeholder="Describe qué trabajos y verificaciones realiza este kit..."
                    onChange={e => setEditingKit({ ...editingKit, description: e.target.value })}
                  />
                </Form.Group>
              </Col>

              {/* Tareas de Cámara */}
              {(editingKit.target === 'camera' || editingKit.target === 'both') && (
                <Col xs={12}>
                  <Card className="border">
                    <Card.Header className="bg-light py-2 d-flex justify-content-between align-items-center">
                      <span className="small fw-bold text-primary">
                        Actividades para Cámaras ({editingKit.cameraTasks.length} seleccionadas)
                      </span>
                    </Card.Header>
                    <Card.Body className="py-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {availableCameraTasks.map(task => {
                        const checked = editingKit.cameraTasks.includes(task.key);
                        return (
                          <Form.Check
                            key={task.key}
                            type="checkbox"
                            id={`edit-cam-task-${task.key}`}
                            className="py-1 border-bottom"
                            checked={checked}
                            onChange={() => toggleCameraTask(task.key)}
                            label={
                              <div className="d-flex justify-content-between align-items-center small w-100">
                                <span className={checked ? 'fw-semibold text-primary' : ''}>{task.label}</span>
                                <span className="text-muted ms-2">{money(task.defaultPrice)}</span>
                              </div>
                            }
                          />
                        );
                      })}
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {/* Tareas de DVR */}
              {(editingKit.target === 'dvr' || editingKit.target === 'both') && (
                <Col xs={12}>
                  <Card className="border">
                    <Card.Header className="bg-light py-2 d-flex justify-content-between align-items-center">
                      <span className="small fw-bold text-secondary">
                        Actividades para Grabadores DVR/NVR ({editingKit.dvrTasks.length} seleccionadas)
                      </span>
                    </Card.Header>
                    <Card.Body className="py-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {availableDvrTasks.map(task => {
                        const checked = editingKit.dvrTasks.includes(task.key);
                        return (
                          <Form.Check
                            key={task.key}
                            type="checkbox"
                            id={`edit-dvr-task-${task.key}`}
                            className="py-1 border-bottom"
                            checked={checked}
                            onChange={() => toggleDvrTask(task.key)}
                            label={
                              <div className="d-flex justify-content-between align-items-center small w-100">
                                <span className={checked ? 'fw-semibold text-secondary' : ''}>{task.label}</span>
                                <span className="text-muted ms-2">{money(task.defaultPrice)}</span>
                              </div>
                            }
                          />
                        );
                      })}
                    </Card.Body>
                  </Card>
                </Col>
              )}

              {/* Materiales sugeridos */}
              <Col xs={12}>
                <Card className="border">
                  <Card.Header className="bg-light py-2">
                    <span className="small fw-bold text-dark">
                      Materiales sugeridos para cotizar (opcionales al aplicar)
                    </span>
                  </Card.Header>
                  <Card.Body className="py-2">
                    <Row className="g-2">
                      {MAINTENANCE_MATERIALS.map(mat => {
                        const checked = editingKit.suggestedMaterials.includes(mat.key);
                        return (
                          <Col md={6} key={mat.key}>
                            <Form.Check
                              type="checkbox"
                              id={`edit-mat-${mat.key}`}
                              checked={checked}
                              onChange={() => toggleSuggestedMaterial(mat.key)}
                              label={
                                <div className="small">
                                  <span className={checked ? 'fw-semibold' : ''}>{mat.label}</span>
                                  <span className="text-muted ms-1">({money(mat.defaultPrice)})</span>
                                </div>
                              }
                            />
                          </Col>
                        );
                      })}
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
              <Button variant="outline-secondary" size="sm" onClick={() => setEditingKit(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                <Check size={16} className="me-1" /> Guardar Kit
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="small text-muted">
                {kits.length} kit(s) configurados en el sistema
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" size="sm" onClick={handleResetDefaults} title="Restaurar los 5 kits base">
                  <RotateCcw size={14} className="me-1" /> Restaurar predeterminados
                </Button>
                <Button variant="primary" size="sm" onClick={handleStartCreate}>
                  <Plus size={14} className="me-1" /> Nuevo Kit
                </Button>
              </div>
            </div>

            <ListGroup variant="flush">
              {kits.map(kit => (
                <ListGroup.Item
                  key={kit.id}
                  className="px-0 py-3 d-flex justify-content-between align-items-start gap-3 border-bottom"
                >
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <span className="fw-bold small">{kit.name}</span>
                      <Badge bg={getKitTargetBadgeVariant(kit.target)}>
                        {getKitTargetLabel(kit.target)}
                      </Badge>
                      {kit.isBuiltIn && (
                        <Badge bg="light" text="dark" className="border">
                          Predeterminado
                        </Badge>
                      )}
                      {!kit.active && (
                        <Badge bg="secondary">Inactivo</Badge>
                      )}
                    </div>
                    <div className="small text-muted mb-2">{kit.description}</div>
                    <div className="small text-secondary d-flex gap-3 flex-wrap">
                      <span>• Cámaras: <strong>{kit.cameraTasks.length} tareas</strong></span>
                      <span>• Grabador: <strong>{kit.dvrTasks.length} tareas</strong></span>
                      {kit.suggestedMaterials.length > 0 && (
                        <span>• Repuestos: <strong>{kit.suggestedMaterials.length} sugeridos</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <Form.Check
                      type="switch"
                      id={`toggle-active-${kit.id}`}
                      checked={kit.active}
                      onChange={e => handleToggleActive(kit.id, e.target.checked)}
                      title={kit.active ? 'Kit visible para vendedores' : 'Kit oculto'}
                    />
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleStartEdit(kit)}
                      title="Editar kit"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleDuplicate(kit)}
                      title="Duplicar kit"
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(kit)}
                      title="Eliminar kit"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}
      </Modal.Body>

      {!editingKit && (
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={onHide}>
            Cerrar
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}
