import { useState } from 'react';
import { Modal, Button, Alert, Table, Badge, Spinner, Form } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import { createProduct } from '@/services/api/inventory';
import { Download, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ImportProductsModalProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
}

interface ProductRow {
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  cost: number;
  price: number;
  stock_quantity: number;
  min_stock: number;
  description?: string;
  location?: string;
  is_active: boolean;
}

interface ImportResult {
  success: boolean;
  row: number;
  sku: string;
  name: string;
  message: string;
}

export function ImportProductsModal({ show, onHide, onSuccess }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setResults([]);
    setStep('upload');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        if (jsonData.length === 0) {
          setError('El archivo está vacío');
          return;
        }

        // Validar columnas requeridas
        const requiredColumns = ['sku', 'name', 'cost', 'price', 'stock_quantity'];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          setError(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
          return;
        }

        // Convertir datos
        const products: ProductRow[] = jsonData.map((row: any) => ({
          sku: String(row.sku || '').trim(),
          name: String(row.name || '').trim(),
          category: row.category ? String(row.category).trim() : undefined,
          brand: row.brand ? String(row.brand).trim() : undefined,
          cost: Number(row.cost) || 0,
          price: Number(row.price) || 0,
          stock_quantity: Number(row.stock_quantity) || 0,
          min_stock: Number(row.min_stock) || 0,
          description: row.description ? String(row.description).trim() : undefined,
          location: row.location ? String(row.location).trim() : undefined,
          is_active: row.is_active !== false
        }));

        setFile(selectedFile);
        setPreview(products);
        setStep('preview');
      } catch (err: any) {
        setError('Error al leer el archivo: ' + err.message);
      }
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResults([]);

    const importResults: ImportResult[] = [];

    for (let i = 0; i < preview.length; i++) {
      const product = preview[i];
      try {
        // Validar datos
        if (!product.sku) {
          importResults.push({
            success: false,
            row: i + 2,
            sku: 'N/A',
            name: product.name,
            message: 'SKU vacío'
          });
          continue;
        }

        if (!product.name) {
          importResults.push({
            success: false,
            row: i + 2,
            sku: product.sku,
            name: 'N/A',
            message: 'Nombre vacío'
          });
          continue;
        }

        if (product.price <= 0) {
          importResults.push({
            success: false,
            row: i + 2,
            sku: product.sku,
            name: product.name,
            message: 'Precio debe ser mayor a 0'
          });
          continue;
        }

        await createProduct(product);
        importResults.push({
          success: true,
          row: i + 2,
          sku: product.sku,
          name: product.name,
          message: 'Importado exitosamente'
        });
      } catch (err: any) {
        importResults.push({
          success: false,
          row: i + 2,
          sku: product.sku,
          name: product.name,
          message: err.message || 'Error desconocido'
        });
      }
    }

    setResults(importResults);
    setStep('results');
    setImporting(false);

    const successCount = importResults.filter(r => r.success).length;
    if (successCount > 0) {
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        sku: 'CAM-001',
        name: 'Cámara IP 4MP',
        category: 'Cámaras CCTV',
        brand: 'Hikvision',
        cost: 120000,
        price: 180000,
        stock_quantity: 10,
        min_stock: 3,
        description: 'Cámara domo IP 4MP con visión nocturna',
        location: 'Bodega A1',
        is_active: true
      },
      {
        sku: 'DVR-008',
        name: 'DVR 8 canales',
        category: 'DVR / NVR',
        brand: 'Dahua',
        cost: 250000,
        price: 380000,
        stock_quantity: 5,
        min_stock: 2,
        description: 'DVR 8 canales H.265',
        location: 'Bodega A2',
        is_active: true
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'plantilla_productos.xlsx');
  };

  const resetModal = () => {
    setFile(null);
    setPreview([]);
    setResults([]);
    setError(null);
    setStep('upload');
  };

  const handleClose = () => {
    resetModal();
    onHide();
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <Upload size={20} className="me-2" />
          Importar Productos desde Excel
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {step === 'upload' && (
          <div>
            <Alert variant="info">
              <strong>Instrucciones:</strong>
              <ol className="mb-0 mt-2">
                <li>Descarga la plantilla Excel haciendo clic en el botón de abajo</li>
                <li>Llena los datos de tus productos (no borres las columnas)</li>
                <li>Guarda el archivo y súbelo aquí</li>
              </ol>
            </Alert>

            <div className="text-center mb-4">
              <Button variant="outline-primary" onClick={downloadTemplate} className="me-3">
                <Download size={18} className="me-2" />
                Descargar Plantilla
              </Button>
            </div>

            <div className="border rounded p-4 text-center bg-light">
              <Upload size={48} className="text-muted mb-3" />
              <h5>Selecciona tu archivo Excel</h5>
              <p className="text-muted">Formatos: .xlsx, .xls</p>
              <Form.Control
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="mt-3"
                style={{ maxWidth: '400px', margin: '0 auto' }}
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <Alert variant="warning">
              <strong>Archivo:</strong> {file?.name}
              <br />
              <strong>Total de productos:</strong> {preview.length}
            </Alert>

            <h6 className="mb-3">Vista previa de los productos a importar:</h6>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table responsive bordered size="sm">
                <thead className="bg-light">
                  <tr>
                    <th>Fila</th>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((product, index) => (
                    <tr key={index}>
                      <td>{index + 2}</td>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.category || '-'}</td>
                      <td>${product.price.toLocaleString('es-CO')}</td>
                      <td>{product.stock_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <Alert variant="info">
              ¿Deseas importar estos {preview.length} productos?
            </Alert>
          </div>
        )}

        {step === 'results' && (
          <div>
            <Alert variant={errorCount === 0 ? 'success' : 'warning'}>
              <h5 className="mb-2">
                {errorCount === 0 ? (
                  <><CheckCircle className="me-2" />¡Importación completada!</>
                ) : (
                  <><AlertTriangle className="me-2" />Importación completada con errores</>
                )}
              </h5>
              <div className="d-flex gap-3 mt-3">
                <Badge bg="success" className="px-3 py-2">
                  ✅ Exitosos: {successCount}
                </Badge>
                <Badge bg="danger" className="px-3 py-2">
                  ❌ Errores: {errorCount}
                </Badge>
              </div>
            </Alert>

            <h6 className="mb-3">Detalle de la importación:</h6>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table responsive bordered size="sm">
                <thead className="bg-light">
                  <tr>
                    <th>Fila</th>
                    <th>SKU</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className={result.success ? 'table-success' : 'table-danger'}>
                      <td>{result.row}</td>
                      <td>{result.sku}</td>
                      <td>{result.name}</td>
                      <td>
                        {result.success ? (
                          <CheckCircle size={16} className="text-success" />
                        ) : (
                          <XCircle size={16} className="text-danger" />
                        )}
                      </td>
                      <td>{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {step === 'upload' && (
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          </>
        )}
        {step === 'preview' && (
          <>
            <Button variant="secondary" onClick={resetModal}>Volver</Button>
            <Button variant="primary" onClick={handleImport} disabled={importing}>
              {importing ? (
                <><Spinner animation="border" size="sm" className="me-2" />Importando...</>
              ) : (
                <><Upload size={16} className="me-2" />Importar {preview.length} productos</>
              )}
            </Button>
          </>
        )}
        {step === 'results' && (
          <Button variant="primary" onClick={handleClose}>Cerrar</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}