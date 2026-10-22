import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Row, Col, Image } from 'react-bootstrap';
import { getProducts, deleteProduct, uploadProductImage, updateProduct } from '@/services/api/inventory';
import { Package, Search, Edit2, Trash2, Plus, AlertTriangle, ImageIcon, Upload } from 'lucide-react';
import { ProductForm } from './ProductForm';
import { ImportProductsModal } from './ImportProductsModal';

export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (err: any) {
      setError('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteProduct(id);
        loadProducts();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleImageClick = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setUploadingId(productId);
        setUploadError(null);
        
        const imageUrl = await uploadProductImage(productId, file);
        await updateProduct(productId, { image_url: imageUrl });
        
        await loadProducts();
      } catch (err: any) {
        setUploadError('Error al subir imagen: ' + err.message);
      } finally {
        setUploadingId(null);
      }
    };
    input.click();
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock);

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Productos</h2>
          <p className="text-muted mb-0">Catálogo de productos y control de inventario</p>
        </div>
        <div>
          <Button variant="success" className="me-2" onClick={() => setShowImportModal(true)}>
            <Upload size={18} className="me-2" /> Importar Excel
          </Button>
          <Button variant="primary" onClick={() => { setEditingProduct(null); setShowForm(true); }}>
            <Plus size={18} className="me-2" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle size={18} className="me-2" />
          <strong>{lowStockProducts.length} producto(s)</strong> con stock bajo o agotado.
        </Alert>
      )}

      {uploadError && <Alert variant="danger" className="mb-3">{uploadError}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text><Search size={18} /></InputGroup.Text>
                <Form.Control placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4" style={{width: '80px'}}>Imagen</th>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Estado</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-5 text-muted">No hay productos registrados.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.stock_quantity <= product.min_stock;
                  return (
                    <tr key={product.id}>
                      <td className="ps-4">
                        {product.image_url ? (
                          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={(e) => handleImageClick(product.id, e)}>
                            <Image 
                              src={product.image_url} 
                              rounded 
                              style={{ 
                                width: '50px', 
                                height: '50px', 
                                objectFit: 'cover',
                                border: '1px solid #dee2e6'
                              }} 
                            />
                            {uploadingId === product.id && (
                              <div style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: 'rgba(255,255,255,0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px'
                              }}>
                                <Spinner animation="border" size="sm" variant="primary" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div 
                            onClick={(e) => handleImageClick(product.id, e)}
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              border: '2px dashed #0d6efd', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f8f9fa',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e7f1ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                          >
                            {uploadingId === product.id ? (
                              <Spinner animation="border" size="sm" variant="primary" />
                            ) : (
                              <Upload size={20} className="text-primary" />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="fw-semibold">{product.sku}</td>
                      <td>
                        <div className="fw-semibold">{product.name}</div>
                        {product.brand && <small className="text-muted">{product.brand}</small>}
                      </td>
                      <td><Badge bg="secondary">{product.category || '-'}</Badge></td>
                      <td>
                        <span className={isLowStock ? 'text-danger fw-bold' : ''}>
                          {product.stock_quantity}
                        </span>
                        {isLowStock && <AlertTriangle size={14} className="text-danger ms-1" />}
                      </td>
                      <td>${(product.cost || 0).toLocaleString('es-CO')}</td>
                      <td className="fw-bold">${(product.price || 0).toLocaleString('es-CO')}</td>
                      <td>
                        <Badge bg={product.is_active ? 'success' : 'secondary'}>
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="text-end pe-4">
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingProduct(product); setShowForm(true); }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(product.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <ProductForm show={showForm} onHide={() => setShowForm(false)} product={editingProduct} onSuccess={loadProducts} />
      <ImportProductsModal show={showImportModal} onHide={() => setShowImportModal(false)} onSuccess={loadProducts} />
    </div>
  );
}