import { useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import type { CameraGroup } from './types';

interface CopyCameraModalProps {
  show: boolean;
  onHide: () => void;
  source: CameraGroup;
  /** Todas las cámaras del grabador (incluye la de origen). */
  cameras: CameraGroup[];
  onConfirm: (targetIds: string[]) => void;
}

const taskSummary = (camera: CameraGroup): string => {
  const count = Object.values(camera.tasks).filter(task => task.selected).length;
  return count === 0 ? 'sin tareas marcadas' : `${count} tarea(s) marcada(s)`;
};

/**
 * Selector de cámaras destino para copiar la configuración de una cámara.
 * Permite elegir solo las que comparten el mismo servicio.
 */
export function CopyCameraModal({ show, onHide, source, cameras, onConfirm }: CopyCameraModalProps) {
  const targets = cameras.filter(camera => camera.id !== source.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const allSelected = targets.length > 0 && targets.every(camera => selected.has(camera.id));

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Copiar configuración</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="light" className="small border">
          Se copian <strong>tareas, cantidades, precios, distancias, alturas y dificultades</strong> de
          <strong> {source.label || 'la cámara'} </strong> a las cámaras que marques. La nota y las fotos de cada cámara se conservan tal como están.
        </Alert>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="small fw-semibold">Cámaras de este grabador</span>
          <Form.Check
            type="checkbox"
            id="copy-camera-all"
            label={<span className="small">Seleccionar todas</span>}
            checked={allSelected}
            onChange={event => setSelected(event.target.checked ? new Set(targets.map(camera => camera.id)) : new Set())}
          />
        </div>

        <div className="d-flex flex-column gap-2">
          {targets.length === 0 && (
            <div className="small text-muted">
              Este grabador no tiene otras cámaras todavía. Agrega cámaras al grabador o usa el botón duplicar.
            </div>
          )}

          {targets.map(camera => (
            <Form.Check
              key={camera.id}
              type="checkbox"
              id={`copy-target-${camera.id}`}
              checked={selected.has(camera.id)}
              onChange={() => toggle(camera.id)}
              label={(
                <span className="small">
                  <strong>{camera.label || 'Cámara'}</strong>
                  {' · '}
                  <span className="text-muted">{taskSummary(camera)}</span>
                  {!camera.active && <span className="text-danger"> · excluida</span>}
                </span>
              )}
            />
          ))}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="primary" disabled={selected.size === 0} onClick={() => onConfirm([...selected])}>
          Copiar a {selected.size} cámara(s)
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
