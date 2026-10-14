import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProduct, updateProduct, getSuppliers } from '@/services/api/inventory';

const schema = z.object({
  sku: z.string().min(1, 'SKU es requerido'),
  name: z.string().min(1, 'Nombre es requerido'),
  category: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  cost: z.coerce.number().min(0, 'Costo debe ser mayor o igual a 0'),
  price: z.coerce.number().min(0, 'Precio debe ser mayor o igual a 0'),
  stock_quantity: z.coerce.number().min(0, 'Stock debe ser mayor o igual a 0'),
  min_stock: z.coerce.number().min(0, 'Stock mínimo debe ser mayor o igual a 0'),
  location: z.string().optional(),
  supplier_id: z.coerce.number().optional(),
  warranty_months: z.coerce.number().min(0).optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  'Cámaras CCTV',
  'DVR / NVR',
  'Alarmas',
  'Control de Acceso',
  'Cables y Conectores',
  'Fuentes de Poder',
  'Accesorios',
  'Herramientas',
  'Otros',
];

interface ProductFormProps {
  show: boolean;
  onHide: () => void;
  product?: any | null;
  onSuccess: () => void;
}

export function ProductForm({ show, onHide, product, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product || { cost: 0, price: 0, stock_quantity: 0, min_stock: 0, is_active: true }
  });

  useEffect(() => {
    if (show) {
      loadSuppliers();
      if (product) {
        reset(product);
      } else {
        reset({ cost: 0, price: 0, stock_quantity: 0, min_stock: 0, is_active: true });
      }
    }
  }, [product, show, reset]);

  async function loadSuppliers() {
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err) { console.error(err); }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      if (product?.id) {
        await updateProduct(product.id, data);
      } else {
        await createProduct(data);
      }
      onSuccess();
      onHide();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton><Modal.Title>{product ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Group><Form.Label>SKU *</Form.Label>
                <Form.Control isInvalid={!!errors.sku} {...register('sku')} placeholder="Ej: CAM-IP-4MP-001" />
                <Form.Control.Feedback type="invalid">{errors.sku?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Nombre del Producto *</Form.Label>
                <Form.Control isInvalid={!!errors.name} {...register('name')} placeholder="Ej: Cámara IP 4MP" />
                <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Categoría</Form.Label>
                <Form.Select {...register('category')}>
                  <option value="">Selecciona...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Marca</Form.Label>
                <Form.Control {...register('brand')} placeholder="Ej: Hikvision, Dahua" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Costo (COP) *</Form.Label>
                <Form.Control type="number" min="0" isInvalid={!!errors.cost} {...register('cost')} />
                <Form.Control.Feedback type="invalid">{errors.cost?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Precio de Venta (COP) *</Form.Label>
                <Form.Control type="number" min="0" isInvalid={!!errors.price} {...register('price')} />
                <Form.Control.Feedback type="invalid">{errors.price?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Stock Actual *</Form.Label>
                <Form.Control type="number" min="0" isInvalid={!!errors.stock_quantity} {...register('stock_quantity')} />
                <Form.Control.Feedback type="invalid">{errors.stock_quantity?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Stock Mínimo *</Form.Label>
                <Form.Control type="number" min="0" isInvalid={!!errors.min_stock} {...register('min_stock')} />
                <Form.Control.Feedback type="invalid">{errors.min_stock?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group><Form.Label>Ubicación</Form.Label>
                <Form.Control {...register('location')} placeholder="Ej: Bodega A1" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Proveedor</Form.Label>
                <Form.Select {...register('supplier_id')}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label>Garantía (meses)</Form.Label>
                <Form.Control type="number" min="0" {...register('warranty_months')} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group><Form.Label>Descripción</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('description')} />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Check type="switch" label="Producto activo" {...register('is_active')} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Producto'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
