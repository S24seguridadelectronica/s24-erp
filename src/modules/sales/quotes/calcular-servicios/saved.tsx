import { useState } from 'react';
import { Badge, Button, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap';
import { Save, Trash2, Upload } from 'lucide-react';
import type { SavedCalculation } from './savedStore';
import { SERVICES } from './catalog';

interface SavedCalculationsModalProps {
  show: boolean;
  onHide: () => void;
  items: SavedCalculation[];
  onSaveCurrent: (name: string) => void;
  onLoad: (item: SavedCalculation) => void;
  onDelete: (id: string) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Lista de cálculos guardados: plantillas con nombre e historial de los
 * últimos trabajos agregados a una cotización.
 */
export function SavedCalculationsModal({ show, onHide, items, onSaveCurrent, onLoad, onDelete }: SavedCalculationsModalProps) {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    onSaveCurrent(name.trim());
    setName('');
  };

  return (
    <Modal show={show} onHide={onHide} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Cálculos guardados</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="small text-muted mb-2">
          Guarda el cálculo actual con un nombre para reutilizarlo (por ejemplo “Torre 4 apartamentos”).
        </div>
        <InputGroup className="mb-4">
          <Form.Control
            placeholder="Nombre de la plantilla"
            value={name}
            maxLength={60}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleSave(); } }}
            aria-label="Nombre de la plantilla"
          />
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
            <Save size={15} className="me-1" /> Guardar actual
          </Button>
        </InputGroup>

        {items.length === 0 ? (
          <div className="text-center text-muted small py-4">
            Todavía no hay cálculos guardados.
          </div>
        ) : (
          <ListGroup variant="flush">
            {items.map(item => (
              <ListGroup.Item key={item.id} className="px-0 d-flex justify-content-between align-items-center gap-2">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-semibold small text-truncate">{item.name}</div>
                  <div className="small text-muted">
                    <Badge bg={item.kind === 'template' ? 'primary' : 'secondary'} className="me-2" style={{ fontSize: '0.6rem' }}>
                      {item.kind === 'template' ? 'Plantilla' : 'Reciente'}
                    </Badge>
                    {SERVICES[item.payload.service]?.label || item.payload.service} · {formatDate(item.savedAt)}
                  </div>
                </div>
                <div className="d-flex gap-1 flex-shrink-0">
                  <Button variant="outline-primary" size="sm" onClick={() => onLoad(item)} title="Cargar cálculo">
                    <Upload size={14} />
                  </Button>
                  <Button variant="outline-danger" size="sm" title="Eliminar"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${item.name}" de los cálculos guardados?`)) onDelete(item.id);
                    }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
