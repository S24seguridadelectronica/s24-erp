import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Image } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProduct, updateProduct, getSuppliers } from '@/services/api/inventory';
import { supabase } from '@/services/supabase/client';
import { Image as ImageIcon, X } from 'lucide-react';

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
  image_url: z.string().optional(),
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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: product || { cost: 0, price: 0, stock_quantity: 0, min_stock: 0, is_active: true }
  });

  useEffect(() => {
    if (show) {
      loadSuppliers();
      if (product) {
        reset(product);
        setPreviewUrl(product.image_url || null);
        setTempImageUrl(null);
      } else {
        reset({ cost: 0, price: 0, stock_quantity: 0, min_stock: 0, is_active: true });
        setPreviewUrl(null);
        setTempImageUrl(null);
      }
    }
  }, [product, show, reset]);

  async function loadSuppliers() {
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err) { console.error(err); }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar los 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const tempFileName = `temp_${Date.now()}.${fileExt}`;
      const tempPath = `temp/${tempFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(tempPath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(tempPath);

      setTempImageUrl(tempPath);
      setPreviewUrl(publicUrl);
      console.log('✅ Imagen temporal subida:', tempPath);
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setError('Error al subir la imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const moveImageToProductFolder = async (productId: number) => {
    if (!tempImageUrl) return null;
    try {
      const fileExt = tempImageUrl.split('.').pop();
      const newPath = `products/${productId}/main.${fileExt}`;
      const { data: fileData } = await supabase.storage.from('product-images').download(tempImageUrl);
      if (!fileData) throw new Error('No se pudo descargar la imagen temporal');
      const { error: uploadError } = await supabase.storage.from('product-images').upload(newPath, fileData, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(newPath);
      await supabase.storage.from('product-images').remove([tempImageUrl]);
      console.log('✅ Imagen movida a:', newPath);
      return publicUrl;
    } catch (err) {
      console.error('Error al mover imagen:', err);
      return null;
    }
  };

  const removeImage = () => {
    setValue('image_url', '');
    setPreviewUrl(null);
    setTempImageUrl(null);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      let finalImageUrl = data.image_url;
      if (product?.id) {
        if (tempImageUrl) {
          const newUrl = await moveImageToProductFolder(product.id);
          if (newUrl) finalImageUrl = newUrl;
        }
        await updateProduct(product.id, { ...data, image_url: finalImageUrl });
      } else {
        const createdProduct = await createProduct({ ...data, image_url: finalImageUrl });
        if (tempImageUrl && createdProduct?.id) {
          const newUrl = await moveImageToProductFolder(createdProduct.id);
          if (newUrl) await updateProduct(createdProduct.id, { image_url: newUrl });
        }
      }
      onSuccess();
      onHide();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{product ? 'Editar Producto' : 'Nuevo Producto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            {/* SECCIÓN DE IMAGEN - NUEVA */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  <ImageIcon size={16} className="me-2" />
                  Imagen del Producto (Opcional)
                </Form.Label>
                <div className="p-3 border rounded bg-light">
                  <Row className="align-items-center">
                    <Col md={3}>
                      <div style={{
                        width: '100%', height: '120px',
                        border: '2px dashed #dee2e6', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', backgroundColor: '#fff'
                      }}>
                        {previewUrl ? (
                          <Image src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ImageIcon size={40} className="text-muted" />
                        )}
                      </div>
                    </Col>
                    <Col md={9}>
                      <Form.Control type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading || loading} />
                      <Form.Text className="text-muted d-block mt-2">
                        {uploading ? (<><Spinner animation="border" size="sm" className="me-2" />Subiendo imagen...</>) : (<>Formatos: JPG, PNG, WEBP. Tamaño máximo: 2MB</>)}
                      </Form.Text>
                      {previewUrl && (
                        <Button variant="outline-danger" size="sm" className="mt-2" onClick={removeImage} disabled={uploading}>
                          <X size={14} className="me-1" /> Quitar imagen
                        </Button>
                      )}
                    </Col>
                  </Row>
                </div>
                <input type="hidden" {...register('image_url')} />
              </Form.Group>
            </Col>

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
              <Form.Check type="switch" label="Producto activo" {...register('is_active')} defaultChecked />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading || uploading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading || uploading}>
            {(loading || uploading) ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Producto'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}