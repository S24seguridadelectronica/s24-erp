import { useEffect, useState, type ChangeEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Camera, Trash2 } from 'lucide-react';
import {
  addWorkOrderPhoto, deleteWorkOrderPhoto, getWorkOrderPhotos, updateWorkOrderPhoto, type WorkOrderPhoto,
} from '@/services/api/work-order-photos';
import { compressImage } from '@/utils/image';

/** Máximo de evidencias por orden de trabajo. */
export const MAX_WORK_ORDER_PHOTOS = 6;

interface WorkOrderPhotosProps {
  workOrderId: number;
  /** Aviso que se muestra cuando la orden todavía no está finalizada. */
  isFinished?: boolean;
}

/**
 * Galería de evidencias del trabajo. Cada foto se guarda en `work_order_photos`
 * con su propia descripción, apenas se toma (no espera a guardar la orden).
 */
export function WorkOrderPhotos({ workOrderId, isFinished = false }: WorkOrderPhotosProps) {
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getWorkOrderPhotos(workOrderId)
      .then(data => {
        if (cancelled) return;
        setPhotos(data);
        setCaptions(Object.fromEntries(data.map(p => [p.id, p.caption || ''])));
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las evidencias.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [workOrderId]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setSaving(true);
      setError(null);
      const compressed = await compressImage(file);
      const created = await addWorkOrderPhoto(workOrderId, compressed, '');
      setPhotos(prev => [...prev, created]);
      setCaptions(prev => ({ ...prev, [created.id]: '' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la foto.');
    } finally {
      setSaving(false);
    }
  };

  const saveCaption = async (id: number) => {
    const current = photos.find(p => p.id === id);
    const caption = captions[id] ?? '';
    if (!current || (current.caption || '') === caption) return;

    try {
      await updateWorkOrderPhoto(id, { caption: caption.trim() || null });
      setPhotos(prev => prev.map(p => (p.id === id ? { ...p, caption: caption.trim() || null } : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la descripción.');
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('¿Eliminar esta foto del historial?')) return;

    try {
      await deleteWorkOrderPhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la foto.');
    }
  };

  const limitReached = photos.length >= MAX_WORK_ORDER_PHOTOS;

  return (
    <Card className="mb-4 border-0 bg-light">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h6 className="fw-bold mb-1">
              <Camera size={16} className="me-2" />
              Evidencias del trabajo
            </h6>
            <div className="small text-muted">
              Fotos de cómo quedó el trabajo. Se guardan al instante en el historial del cliente.
            </div>
          </div>
          <Badge bg={limitReached ? 'success' : 'secondary'}>
            {photos.length}/{MAX_WORK_ORDER_PHOTOS}
          </Badge>
        </div>

        {!isFinished && (
          <Alert variant="info" className="py-2 px-3 small mt-2">
            Se recomienda tomarlas al finalizar el trabajo (estado <strong>Finalizada</strong>).
          </Alert>
        )}

        {error && <Alert variant="danger" className="py-2 px-3 small">{error}</Alert>}

        {loading ? (
          <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
        ) : (
          <div className="d-flex flex-wrap gap-3 mt-2">
            {photos.map(photo => (
              <div key={photo.id} style={{ width: 190 }}>
                <div className="position-relative">
                  <img src={photo.photo} alt={photo.caption || 'Evidencia'} className="border rounded w-100"
                    style={{ height: 130, objectFit: 'cover' }} />
                  <Button variant="danger" size="sm" className="position-absolute top-0 end-0 m-1 rounded-circle p-1"
                    onClick={() => remove(photo.id)} title="Eliminar foto">
                    <Trash2 size={12} />
                  </Button>
                </div>
                <Form.Control
                  size="sm"
                  className="mt-1"
                  placeholder="Descripción (ej: cámara entrada)"
                  value={captions[photo.id] ?? ''}
                  onChange={e => setCaptions(prev => ({ ...prev, [photo.id]: e.target.value }))}
                  onBlur={() => saveCaption(photo.id)}
                  maxLength={120}
                />
              </div>
            ))}

            {!limitReached && (
              <label className="btn btn-outline-primary d-flex flex-column align-items-center justify-content-center"
                style={{ width: 190, height: 130 }}>
                {saving ? <Spinner animation="border" size="sm" /> : (
                  <>
                    <Camera size={26} className="mb-1" />
                    <span className="small">Añadir foto</span>
                  </>
                )}
                <input type="file" accept="image/*" capture="environment" className="d-none"
                  onChange={handleFile} disabled={saving} />
              </label>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
