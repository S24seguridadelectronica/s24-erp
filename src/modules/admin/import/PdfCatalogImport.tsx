/**
 * IMPORTAR CATÁLOGO DESDE PDF — modalidad B del módulo de Importación Masiva.
 *
 * Integra el motor pdfCatalogExtractor con Supabase (PostgreSQL + Storage)
 * a través de catalogImport.ts. Flujo: carga → análisis → vista previa
 * editable → resultados → Excel.
 */
import { useCallback, useRef, useState } from 'react';
import { Card, Button, Alert, Row, Col, Badge, Form, Table, ProgressBar, Spinner, Modal } from 'react-bootstrap';
import {
  FileText, CheckCircle, AlertTriangle, Loader, ArrowRight, ArrowLeft,
  Download, RefreshCw, History, Trash2, Search,
} from 'lucide-react';
import {
  analyzePdf, type ExtractedProduct, type PdfAnalysis,
} from '@/services/api/pdfCatalogExtractor';
import {
  checkDuplicates, confirmImport, publishProducts, getImportHistory, getBatchItems,
  downloadExcelWithImages, downloadExcelWithLinks,
  type ConfirmConfig, type ConfirmResult, type DuplicateCheck,
} from '@/services/api/catalogImport';

type Stage = 'upload' | 'analyzing' | 'preview' | 'importing' | 'results' | 'history';

interface Props {
  onError?: (msg: string) => void;
}

export function PdfCatalogImport({ onError }: Props) {
  const [stage, setStage] = useState<Stage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PdfAnalysis | null>(null);
  const [products, setProducts] = useState<ExtractedProduct[]>([]);
  const [imageUrlOverrides, setImageUrlOverrides] = useState<(string | null)[]>([]);
  const [progressLabel, setProgressLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[] | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<ConfirmConfig>({
    supplierName: '',
    defaultBrand: '',
    defaultCategory: '',
    priceListType: 'proveedor',
    duplicateStrategy: 'skip',
  });
  const [duplicates, setDuplicates] = useState<DuplicateCheck[]>([]);

  // ---------------- Carga y análisis ----------------
  const handleFile = useCallback(async (selected: File) => {
    setError(null);
    if (selected.type !== 'application/pdf') {
      setError('El archivo debe ser un PDF.');
      return;
    }
    if (selected.size > 50 * 1024 * 1024) {
      setError('El PDF supera el límite de 50 MB.');
      return;
    }
    setFile(selected);
    setStage('analyzing');
    setProgress(0);

    try {
      const res = await analyzePdf(selected, {
        defaultBrand: config.defaultBrand || undefined,
        defaultCategory: config.defaultCategory || undefined,
        onProgress: (label, cur, total) => {
          setProgressLabel(label);
          setProgress(total ? Math.round((cur / total) * 90) : 5);
        },
      });
      setAnalysis(res);
      setProducts(res.products);
      setImageUrlOverrides(res.products.map(() => null));
      if (!res.products.length && res.doc_type === 'scanned') {
        setError('El PDF parece escaneado (sin texto seleccionable). Se requiere OCR del lado servidor, aún no configurado. Ningún producto fue detectado.');
      } else if (!res.products.length) {
        setError('No se detectaron productos en el PDF. Verifica que sea un catálogo con texto.');
      }
      setProgress(100);
      setStage('preview');
    } catch (err: any) {
      setError(err?.message || 'Error al analizar el PDF (puede estar dañado o protegido).');
      setStage('upload');
    }
  }, [config.defaultBrand, config.defaultCategory]);

  const runDuplicateCheck = async () => {
    try {
      setProgressLabel('Buscando duplicados en el catálogo');
      setProgress(30);
      const dups = await checkDuplicates(products);
      setDuplicates(dups);
      setProducts(prev => prev.map((p, i) => {
        const dup = dups.find(d => d.index === i);
        return dup ? { ...p, match_status: 'existing' } : p;
      }));
      setProgress(100);
    } catch (err: any) {
      setError(err?.message || 'Error buscando duplicados');
    }
  };

  // ---------------- Confirmación ----------------
  const handleConfirm = async () => {
    if (!file || !analysis) return;
    setConfirming(true);
    setError(null);
    setStage('importing');
    setProgress(0);

    try {
      const dupChecks = duplicates.length ? duplicates : [];
      const res = await confirmImport(file, analysis, products, config, dupChecks, (label, cur, total) => {
        setProgressLabel(label);
        setProgress(total ? Math.round((cur / total) * 100) : 10);
      });
      setResult(res);
      setStage('results');
      // Refrescar URLs públicas para el Excel con enlaces
      setImageUrlOverrides(prev => prev.map((u, i) => u ?? (res.batchId ? null : null)));
      const items = await getBatchItems(res.batchId);
      setImageUrlOverrides(products.map((_, i) => items[i]?.image_url ?? null));
    } catch (err: any) {
      setError(err?.message || 'Error durante la importación');
      setStage('preview');
    } finally {
      setConfirming(false);
    }
  };

  const handleApproveSelected = async () => {
    const ids = products.map((p, i) => ({ p, i }))
      .filter(({ p }) => p.match_status !== 'existing')
      .map(({ i }) => i);
    if (!ids.length) return;
    try {
      // Los productos ya fueron creados con is_active=false; publicarlos requiere
      // los IDs reales: los obtenemos del lote.
      if (!result) return;
      const items = await getBatchItems(result.batchId);
      const productIds = items
        .filter((it: any) => it.product_id && it.match_status === 'new')
        .map((it: any) => it.product_id);
      const count = await publishProducts(productIds);
      setError(null);
      alert(`${count} productos publicados en el catálogo central.`);
      setProducts(prev => prev.map(p => (p.match_status === 'new' ? { ...p, match_status: 'new' } : p)));
    } catch (err: any) {
      setError(err?.message || 'Error publicando productos');
    }
  };

  const handleEditField = (index: number, field: keyof ExtractedProduct, value: any) => {
    setProducts(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleRemove = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
    setImageUrlOverrides(prev => prev.filter((_, i) => i !== index));
  };

  const openHistory = async () => {
    setStage('history');
    try {
      setHistory(await getImportHistory());
    } catch (err: any) {
      setError(err?.message || 'Error cargando historial');
    }
  };

  const viewBatch = async (batchId: number) => {
    try {
      setHistoryItems(await getBatchItems(batchId));
      setShowHistoryModal(true);
    } catch (err: any) {
      setError(err?.message || 'Error cargando detalles');
    }
  };

  const reset = () => {
    setStage('upload'); setFile(null); setAnalysis(null); setProducts([]);
    setResult(null); setError(null); setProgress(0); setDuplicates([]);
  };

  // ---------------- Render ----------------
  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      {/* Etapas */}
      <div className="d-flex justify-content-between mb-4 px-3">
        {(['upload', 'preview', 'results'] as Stage[]).map((s, idx) => {
          const order: Stage[] = ['upload', 'analyzing', 'preview', 'importing', 'results', 'history'];
          const label = ['Cargar PDF', 'Vista Previa', 'Resultados'][idx];
          const active = order.indexOf(stage) >= order.indexOf(s) && stage !== 'history';
          return (
            <div key={s} className="text-center flex-fill">
              <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-1 ${active ? 'bg-primary text-white' : 'bg-light text-muted'}`} style={{ width: 32, height: 32 }}>{idx + 1}</div>
              <div className={`small ${active ? 'text-primary fw-bold' : 'text-muted'}`}>{label}</div>
            </div>
          );
        })}
      </div>

      {stage === 'upload' && (
        <>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Body>
              <h5 className="mb-3"><FileText size={20} className="me-2" />Configuración de importación</h5>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Proveedor *</Form.Label>
                    <Form.Control value={config.supplierName} onChange={e => setConfig({ ...config, supplierName: e.target.value })} placeholder="Nombre del proveedor o fabricante" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Marca predeterminada</Form.Label>
                    <Form.Control value={config.defaultBrand} onChange={e => setConfig({ ...config, defaultBrand: e.target.value })} placeholder="Se asigna solo si el PDF no la indica" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Categoría predeterminada</Form.Label>
                    <Form.Control value={config.defaultCategory} onChange={e => setConfig({ ...config, defaultCategory: e.target.value })} placeholder="Ej: Cámaras, Alarmas" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Tipo de lista de precios</Form.Label>
                    <Form.Select value={config.priceListType} onChange={e => setConfig({ ...config, priceListType: e.target.value })}>
                      <option value="proveedor">Lista de precios del proveedor</option>
                      <option value="referencia">Lista de referencia</option>
                      <option value="promocion">Promoción</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Tratamiento de productos existentes</Form.Label>
                    <Form.Select value={config.duplicateStrategy} onChange={e => setConfig({ ...config, duplicateStrategy: e.target.value as any })}>
                      <option value="skip">Omitir duplicados (recomendado)</option>
                      <option value="update">Actualizar datos comerciales</option>
                      <option value="pending">Enviar todos a revisión</option>
                    </Form.Select>
                    <Form.Text className="text-muted">Nunca se sobrescribe el precio de venta de S24.</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center p-5">
              <div
                ref={dragRef}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="border rounded p-5 mb-3"
                style={{ borderStyle: 'dashed', cursor: 'pointer' }}
                onClick={() => document.getElementById('pdf-input')?.click()}
              >
                <FileText size={64} className="text-primary mb-3" />
                <h4>Selecciona o arrastra el catálogo PDF</h4>
                <p className="text-muted mb-0">Solo archivos .pdf hasta 50 MB. El documento debe tener texto seleccionable.</p>
              </div>
              <Form.Control id="pdf-input" type="file" accept="application/pdf" className="d-none" onChange={e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); }} />
              {file && <p className="text-muted"><strong>{file.name}</strong> — {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
              <div className="d-flex justify-content-center gap-2 mt-3">
                <Button variant="outline-secondary" onClick={reset} disabled={!file}>Cancelar</Button>
                <Button variant="outline-primary" onClick={openHistory}><History size={18} className="me-2" />Historial de importaciones</Button>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {(stage === 'analyzing' || stage === 'importing') && (
        <Card className="border-0 shadow-sm text-center p-5">
          <Loader size={56} className="text-primary mb-3" />
          <h4>{stage === 'analyzing' ? 'Analizando el PDF...' : 'Registrando en Supabase...'}</h4>
          <p className="text-muted">{progressLabel}</p>
          <ProgressBar now={progress} label={`${progress}%`} animated className="mt-3" />
        </Card>
      )}

      {stage === 'preview' && analysis && (
        <>
          <Row className="g-3 mb-3">
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-primary">{products.length}</div><div className="small text-muted">Productos detectados</div></Card.Body></Card></Col>
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-info">{analysis.images_found}</div><div className="small text-muted">Fotografías encontradas</div></Card.Body></Card></Col>
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-warning">{products.filter(p => !p.sku || p.price === null).length}</div><div className="small text-muted">Pendientes de datos</div></Card.Body></Card></Col>
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><Badge bg={analysis.doc_type === 'digital' ? 'success' : analysis.doc_type === 'scanned' ? 'danger' : 'warning'} className="fs-6">{analysis.doc_type.toUpperCase()}</Badge><div className="small text-muted mt-1">Tipo de PDF · {analysis.total_pages} págs.</div></Card.Body></Card></Col>
          </Row>

          {analysis.doc_type === 'scanned' && (
            <Alert variant="warning"><AlertTriangle size={18} className="me-2" />Este PDF parece escaneado. La extracción de texto será limitada; considere un proveedor de OCR (fase servidor).</Alert>
          )}

          <div className="d-flex gap-2 mb-3">
            <Button variant="outline-primary" onClick={runDuplicateCheck}><Search size={18} className="me-2" />Verificar duplicados contra el catálogo</Button>
            <Button variant="outline-secondary" onClick={() => generateExcel(true)} disabled={!products.length}><Download size={18} className="me-2" />Excel con fotografías</Button>
            <Button variant="outline-secondary" onClick={() => generateExcel(false)} disabled={!products.length}><Download size={18} className="me-2" />Excel con enlaces</Button>
          </div>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white"><h5 className="mb-0">Vista previa editable ({products.length})</h5></Card.Header>
            <Card.Body className="p-0">
              <div style={{ overflow: 'auto', maxHeight: 500 }}>
                <Table size="sm" hover className="mb-0">
                  <thead className="bg-light sticky-top">
                    <tr>
                      <th>Foto</th><th>SKU</th><th>Nombre</th><th>Precio</th><th>Moneda</th><th>Página</th><th>Estado</th><th>Validación</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} className={p.match_status === 'existing' ? 'table-warning' : ''}>
                        <td style={{ width: 70 }}>
                          {p.image_data_url
                            ? <img src={p.image_data_url} alt="" style={{ maxWidth: 60, maxHeight: 45, objectFit: 'contain' }} />
                            : <span className="text-muted small">—</span>}
                        </td>
                        <td style={{ minWidth: 120 }}>
                          <Form.Control size="sm" value={p.sku ?? ''} placeholder="Sin SKU" onChange={e => handleEditField(i, 'sku', e.target.value || null)} />
                        </td>
                        <td style={{ minWidth: 220 }}>
                          <Form.Control size="sm" value={p.name ?? ''} onChange={e => handleEditField(i, 'name', e.target.value || null)} />
                        </td>
                        <td style={{ minWidth: 110 }}>
                          <Form.Control size="sm" type="number" value={p.price ?? ''} onChange={e => handleEditField(i, 'price', e.target.value ? Number(e.target.value) : null)} />
                        </td>
                        <td>{p.currency ?? '—'}</td>
                        <td>{p.source_page}</td>
                        <td>
                          {p.match_status === 'existing'
                            ? <Badge bg="warning"><AlertTriangle size={12} /> Duplicado</Badge>
                            : <Badge bg="secondary">Nuevo</Badge>}
                        </td>
                        <td>
                          {p.validation_notes.length === 0
                            ? <Badge bg="success"><CheckCircle size={12} /></Badge>
                            : <span className="small text-muted">{p.validation_notes.join(' · ')}</span>}
                        </td>
                        <td><Button variant="link" size="sm" className="text-danger p-0" onClick={() => handleRemove(i)} title="Descartar"><Trash2 size={16} /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-between">
            <Button variant="secondary" onClick={reset}><ArrowLeft size={18} className="me-2" />Cambiar PDF</Button>
            <Button variant="success" onClick={handleConfirm} disabled={confirming || !products.length}>
              {confirming ? <Spinner size="sm" className="me-2" /> : <ArrowRight size={18} className="me-2" />}
              Guardar {products.length} productos en Supabase (pendientes de revisión)
            </Button>
          </div>
        </>
      )}

      {stage === 'results' && result && analysis && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center p-5">
            <CheckCircle size={64} className="text-success mb-3" />
            <h3 className="text-success">Importación registrada</h3>
            <p className="text-muted">Lote #{result.batchId}</p>
            <Row className="g-3 mt-3">
              <Col md={2}><div className="p-3 bg-primary bg-opacity-10 rounded"><div className="fs-3 fw-bold text-primary">{products.length}</div><div className="small">Detectados</div></div></Col>
              <Col md={2}><div className="p-3 bg-success bg-opacity-10 rounded"><div className="fs-3 fw-bold text-success">{result.created}</div><div className="small">Nuevos</div></div></Col>
              <Col md={2}><div className="p-3 bg-info bg-opacity-10 rounded"><div className="fs-3 fw-bold text-info">{result.updated}</div><div className="small">Actualizados</div></div></Col>
              <Col md={2}><div className="p-3 bg-warning bg-opacity-10 rounded"><div className="fs-3 fw-bold text-warning">{result.skipped}</div><div className="small">Duplicados omitidos</div></div></Col>
              <Col md={2}><div className="p-3 bg-danger bg-opacity-10 rounded"><div className="fs-3 fw-bold text-danger">{result.errors.length}</div><div className="small">Errores</div></div></Col>
              <Col md={2}><div className="p-3 bg-secondary bg-opacity-10 rounded"><div className="fs-3 fw-bold">{result.imagesUploaded}</div><div className="small">Fotos subidas</div></div></Col>
            </Row>

            {result.errors.length > 0 && (
              <Alert variant="warning" className="text-start mt-4">
                <strong>Errores (no detuvieron el lote):</strong>
                <ul className="mb-0 small">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </Alert>
            )}

            <div className="mt-4 d-flex justify-content-center gap-2 flex-wrap">
              <Button variant="success" onClick={handleApproveSelected}><CheckCircle size={18} className="me-2" />Publicar nuevos en catálogo</Button>
              <Button variant="primary" onClick={() => generateExcel(true)}><Download size={18} className="me-2" />Excel con fotografías</Button>
              <Button variant="outline-primary" onClick={() => generateExcel(false)}><Download size={18} className="me-2" />Excel con enlaces</Button>
              <Button variant="outline-secondary" onClick={reset}><RefreshCw size={18} className="me-2" />Nueva importación</Button>
              <Button variant="outline-secondary" onClick={openHistory}><History size={18} className="me-2" />Ver historial</Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {stage === 'history' && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Historial de importaciones PDF</h5>
            <Button variant="outline-secondary" size="sm" onClick={() => setStage(file ? 'preview' : 'upload')}><ArrowLeft size={16} className="me-1" />Volver</Button>
          </Card.Header>
          <Card.Body className="p-0">
            <Table size="sm" hover className="mb-0">
              <thead className="bg-light"><tr><th>#</th><th>Archivo</th><th>Proveedor</th><th>Páginas</th><th>Totales</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td>{h.id}</td>
                    <td>{h.file_name}</td>
                    <td>{h.supplier_name || '—'}</td>
                    <td>{h.total_pages ?? '—'}</td>
                    <td className="small">{h.totals ? `${h.totals.created || 0} nuevos / ${h.totals.updated || 0} act.` : '—'}</td>
                    <td><Badge bg={h.status === 'completed' ? 'success' : h.status === 'failed' ? 'danger' : 'warning'}>{h.status}</Badge></td>
                    <td className="small">{new Date(h.created_at).toLocaleString('es-CO')}</td>
                    <td><Button variant="link" size="sm" className="p-0" onClick={() => viewBatch(h.id)}>Detalles</Button></td>
                  </tr>
                ))}
                {!history.length && <tr><td colSpan={8} className="text-center text-muted py-4">Sin importaciones registradas todavía.</td></tr>}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="xl">
        <Modal.Header closeButton><Modal.Title>Detalle del lote</Modal.Title></Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <Table size="sm" hover>
              <thead className="bg-light"><tr><th>SKU</th><th>Nombre</th><th>Precio</th><th>Página</th><th>Resultado</th></tr></thead>
              <tbody>
                {(historyItems || []).map(it => (
                  <tr key={it.id}>
                    <td>{it.sku || '—'}</td><td>{it.name || '—'}</td>
                    <td>{it.price ? `${it.currency || ''} ${it.price}` : '—'}</td>
                    <td>{it.source_page}</td>
                    <td><Badge bg={it.match_status === 'new' ? 'success' : it.match_status === 'updated' ? 'info' : it.match_status === 'existing' ? 'warning' : 'secondary'}>{it.match_status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );

  // ---------------- helpers de render tardío ----------------
  async function generateExcel(embedImages: boolean) {
    if (!analysis) return;
    try {
      if (embedImages) {
        await downloadExcelWithImages(products, {
          supplierName: config.supplierName || file?.name || 'proveedor',
          fileName: file?.name || 'catalogo.pdf',
          analysis,
        });
      } else {
        await downloadExcelWithLinks(products, imageUrlOverrides, {
          supplierName: config.supplierName || file?.name || 'proveedor',
          fileName: file?.name || 'catalogo.pdf',
          analysis,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Error generando el Excel');
      onError?.(String(err));
    }
  }
}
