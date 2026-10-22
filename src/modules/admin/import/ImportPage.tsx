import { useState } from 'react';
import { Card, Button, Alert, Row, Col, Badge, Form, Table, ProgressBar } from 'react-bootstrap';
import { Upload, Download, FileText, CheckCircle, AlertTriangle, XCircle, Loader, ArrowRight, ArrowLeft, Users } from 'lucide-react';
import {
  parseFile, detectColumnMapping, getUnrecognizedColumns, validateRecord, checkDuplicates,
  executeImport, createImportBatch, finalizeBatch, downloadTemplate, getBatchResults
} from '@/services/api/import';
import {
  getEligibleSellers, distributeEqually, distributeRoundRobin, distributeByWorkload, saveAssignments
} from '@/services/api/distribution';

type Step = 'upload' | 'preview' | 'configure' | 'processing' | 'results';

export function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [config, setConfig] = useState({
    duplicateStrategy: 'skip' as 'skip' | 'update' | 'import_all',
    autoAssign: true, // ✅ CAMBIADO: Ahora es true por defecto
    distributionStrategy: 'equal' as 'equal' | 'round_robin' | 'workload'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [eligibleSellers, setEligibleSellers] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null); setLoading(true); setProgress(10);

    try {
      const data = await parseFile(selectedFile);
      setRawData(data); setFile(selectedFile); setProgress(30);
      if (data.length === 0) throw new Error('El archivo está vacío o no tiene datos válidos');

      const headers = Object.keys(data[0]);
      const mapping = detectColumnMapping(headers);
      const unrecognized = getUnrecognizedColumns(headers, mapping);
      
      setColumnMapping(mapping); setUnrecognizedColumns(unrecognized); setProgress(50);

      const records = data.map((row, index) => {
        const { valid, errors, warnings } = validateRecord(row, mapping);
        return { rowNumber: index + 1, rawData: row, mappedData: row, valid, errors, warnings };
      });
      setProgress(70);

      const recordsWithDuplicates = await checkDuplicates(records, mapping);
      setParsedRecords(recordsWithDuplicates); setProgress(90);

      const validCount = recordsWithDuplicates.filter(r => r.valid && !r.isDuplicate).length;
      const errorCount = recordsWithDuplicates.filter(r => !r.valid).length;
      const duplicateCount = recordsWithDuplicates.filter(r => r.isDuplicate).length;

      setSummary({ totalRows: data.length, validRows: validCount, errorRows: errorCount, duplicateRows: duplicateCount, unrecognizedColumns: unrecognized, mappedColumns: mapping });
      setProgress(100); setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    console.log('🔍 DEBUG FINAL - config antes de importar:', config);
    console.log('🔍 DEBUG FINAL - autoAssign es:', config.autoAssign);

    setLoading(true); setError(null); setProgress(0); setStep('processing');

    try {
      const batch = await createImportBatch(file.name, rawData.length);
      setBatchId(batch.id); setProgress(10);

      const results = await executeImport(parsedRecords, columnMapping, config, batch.id);
      setProgress(50);

      const batchResults = await getBatchResults(batch.id);
      console.log('🔍 DEBUG batchResults:', batchResults);

      const importedCustomerIds = batchResults
        .filter((r: any) => r.status === 'imported' && r.customer_id)
        .map((r: any) => r.customer_id);

      console.log('🔍 DEBUG importedCustomerIds:', importedCustomerIds);

      let distributionSummary: any = null;
      if (config.autoAssign && importedCustomerIds.length > 0) {
        console.log('🚀 INICIANDO DISTRIBUCIÓN...');
        setProgress(60);
        
        const sellers = await getEligibleSellers();
        console.log('🔍 DEBUG Vendedores:', sellers);
        setEligibleSellers(sellers);
        
        if (sellers.length === 0) {
          setError('No hay vendedores elegibles. Los clientes quedaron sin asignar.');
        } else {
          let distributionResult;
          switch (config.distributionStrategy) {
            case 'round_robin': distributionResult = await distributeRoundRobin(importedCustomerIds, sellers); break;
            case 'workload': distributionResult = await distributeByWorkload(importedCustomerIds, sellers); break;
            case 'equal': default: distributionResult = await distributeEqually(importedCustomerIds, sellers); break;
          }

          console.log('🔍 DEBUG Distribución:', distributionResult);
          await saveAssignments(distributionResult.assignments, batch.id);
          distributionSummary = distributionResult.summary;
          console.log('✅ DISTRIBUCIÓN COMPLETADA');
        }
      } else {
        console.log('⚠️ DISTRIBUCIÓN SALTADA. autoAssign:', config.autoAssign, '| IDs:', importedCustomerIds.length);
      }

      setProgress(90);
      await finalizeBatch(batch.id, results);
      setProgress(100);

      setImportResults({ ...results, distributed: config.autoAssign ? importedCustomerIds.length : 0, distributionSummary });
      setStep('results');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep('upload'); setFile(null); setRawData([]); setColumnMapping({}); setUnrecognizedColumns([]);
    setParsedRecords([]); setSummary(null); setImportResults(null); setBatchId(null); setError(null);
    setProgress(0); setConfig({ duplicateStrategy: 'skip', autoAssign: true, distributionStrategy: 'equal' });
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Upload size={28} className="me-2" />Importación Masiva de Clientes</h2>
          <p className="text-muted mb-0">Carga bases de datos de clientes potenciales desde CSV, JSON o Excel</p>
        </div>
        <Button variant="outline-primary" onClick={downloadTemplate}><Download size={18} className="me-2" />Descargar Plantilla</Button>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      <div className="d-flex justify-content-between mb-4 px-3">
        {['Cargar', 'Vista Previa', 'Configurar', 'Procesar', 'Resultados'].map((label, idx) => {
          const steps: Step[] = ['upload', 'preview', 'configure', 'processing', 'results'];
          const isActive = steps.indexOf(step) >= idx;
          return (
            <div key={label} className="text-center flex-fill">
              <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-1 ${isActive ? 'bg-primary text-white' : 'bg-light text-muted'}`} style={{ width: 32, height: 32 }}>{idx + 1}</div>
              <div className={`small ${isActive ? 'text-primary fw-bold' : 'text-muted'}`}>{label}</div>
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center p-5">
            <Upload size={64} className="text-primary mb-3" />
            <h4>Selecciona o arrastra tu archivo</h4>
            <p className="text-muted mb-4">Formatos admitidos: CSV, JSON, XLSX. Máximo 10,000 registros.</p>
            <Form.Group>
              <Form.Label htmlFor="file-upload" className="visually-hidden">Seleccionar archivo</Form.Label>
              <Form.Control id="file-upload" type="file" accept=".csv,.json,.xlsx,.xls" onChange={handleFileUpload} disabled={loading} className="mb-3" />
            </Form.Group>
            {loading && <div className="mt-3"><ProgressBar now={progress} label={`${progress}%`} animated /><p className="text-muted mt-2">Procesando archivo...</p></div>}
          </Card.Body>
        </Card>
      )}

      {step === 'preview' && summary && (
        <>
          <Row className="g-3 mb-4">
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-primary">{summary.totalRows}</div><div className="small text-muted">Total Filas</div></Card.Body></Card></Col>
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-success">{summary.validRows}</div><div className="small text-muted">Válidos</div></Card.Body></Card></Col>
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-warning">{summary.duplicateRows}</div><div className="small text-muted">Duplicados</div></Card.Body></Card></Col>
            <Col md={3}><Card className="border-0 shadow-sm"><Card.Body className="text-center"><div className="fs-3 fw-bold text-danger">{summary.errorRows}</div><div className="small text-muted">Con Errores</div></Card.Body></Card></Col>
          </Row>
          {summary.unrecognizedColumns.length > 0 && <Alert variant="warning"><AlertTriangle size={18} className="me-2" /><strong>Columnas no reconocidas:</strong> {summary.unrecognizedColumns.join(', ')}</Alert>}
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white"><h5 className="mb-0">Mapeo de Columnas Detectado</h5></Card.Header>
            <Card.Body><Table size="sm" className="mb-0"><tbody>{Object.entries(summary.mappedColumns).map(([standard, original]) => (<tr key={standard}><td className="fw-bold">{standard}</td><td><Badge bg="success">{original}</Badge></td></tr>))}</tbody></Table></Card.Body>
          </Card>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white"><h5 className="mb-0">Vista Previa (primeros 10 registros)</h5></Card.Header>
            <Card.Body className="p-0">
              <div style={{ overflow: 'auto', maxHeight: 400 }}>
                <Table size="sm" hover className="mb-0">
                  <thead className="bg-light sticky-top"><tr><th>#</th><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Ciudad</th><th>Estado</th></tr></thead>
                  <tbody>
                    {parsedRecords.slice(0, 10).map(r => (
                      <tr key={r.rowNumber} className={!r.valid ? 'table-danger' : (r.isDuplicate ? 'table-warning' : '')}>
                        <td>{r.rowNumber}</td><td>{r.mappedData[columnMapping.nombre] || '-'}</td><td>{r.mappedData[columnMapping.telefono] || '-'}</td><td>{r.mappedData[columnMapping.correo] || '-'}</td><td>{r.mappedData[columnMapping.ciudad] || '-'}</td>
                        <td>{!r.valid ? <Badge bg="danger"><XCircle size={12} /> Error</Badge> : r.isDuplicate ? <Badge bg="warning"><AlertTriangle size={12} /> Duplicado</Badge> : <Badge bg="success"><CheckCircle size={12} /> Válido</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
          <div className="d-flex justify-content-between">
            <Button variant="secondary" onClick={resetImport}><ArrowLeft size={18} className="me-2" />Cambiar Archivo</Button>
            <Button variant="primary" onClick={() => setStep('configure')} disabled={summary.validRows === 0}>Continuar <ArrowRight size={18} className="ms-2" /></Button>
          </div>
        </>
      )}

      {step === 'configure' && (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <h4 className="mb-4">Configurar Importación y Distribución</h4>
            <Form.Group className="mb-4">
              <Form.Label htmlFor="duplicate-strategy" className="fw-bold">Estrategia para duplicados</Form.Label>
              <Form.Select id="duplicate-strategy" value={config.duplicateStrategy} onChange={(e) => setConfig({...config, duplicateStrategy: e.target.value as any})}>
                <option value="skip">Omitir duplicados (recomendado)</option>
                <option value="update">Actualizar clientes existentes</option>
                <option value="import_all">Importar todos (puede crear duplicados)</option>
              </Form.Select>
            </Form.Group>
            <hr />
            <Form.Group className="mb-4">
              <Form.Check 
                type="switch" 
                id="autoAssignSwitch" 
                label={<strong>Asignar automáticamente a vendedores después de importar</strong>} 
                checked={config.autoAssign} 
                onChange={(e) => {
                  console.log('🔍 SWITCH CLICKED - nuevo valor:', e.target.checked);
                  setConfig({...config, autoAssign: e.target.checked});
                }} 
                className="mb-3" 
              />
              {config.autoAssign && (
                <>
                  <Form.Label htmlFor="distribution-strategy" className="fw-bold mt-3">Estrategia de distribución</Form.Label>
                  <Form.Select id="distribution-strategy" value={config.distributionStrategy} onChange={(e) => setConfig({...config, distributionStrategy: e.target.value as any})}>
                    <option value="equal">Equitativa (dividir en partes iguales)</option>
                    <option value="round_robin">Rotativa (uno por uno en orden)</option>
                    <option value="workload">Por carga de trabajo (menos carga primero)</option>
                  </Form.Select>
                  <Form.Text className="text-muted d-block mt-2">
                    {config.distributionStrategy === 'equal' && 'Divide los clientes equitativamente entre todos los vendedores elegibles.'}
                    {config.distributionStrategy === 'round_robin' && 'Asigna un cliente a cada vendedor por turnos.'}
                    {config.distributionStrategy === 'workload' && 'Prioriza vendedores con menos clientes activos.'}
                  </Form.Text>
                </>
              )}
            </Form.Group>
            <Alert variant="info">
              <strong>Resumen:</strong> Se importarán {summary.validRows} registros válidos.
              {config.autoAssign && <span className="text-success fw-bold"> ✓ Se distribuirán automáticamente entre los vendedores.</span>}
            </Alert>
            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={() => setStep('preview')}><ArrowLeft size={18} className="me-2" />Atrás</Button>
              <Button variant="success" size="lg" onClick={handleConfirmImport}><CheckCircle size={20} className="me-2" />Confirmar e Importar {summary.validRows} Clientes</Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {step === 'processing' && (
        <Card className="border-0 shadow-sm text-center p-5">
          <Loader size={64} className="text-primary mb-3 animate-spin" />
          <h4>Importando y distribuyendo clientes...</h4>
          <p className="text-muted">Esto puede tomar unos momentos</p>
          <ProgressBar now={progress} label={`${progress}%`} animated className="mt-3" />
          {config.autoAssign && progress >= 60 && <p className="text-info mt-2">Distribuyendo entre {eligibleSellers.length} vendedores...</p>}
        </Card>
      )}

      {step === 'results' && importResults && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center p-5">
            <CheckCircle size={64} className="text-success mb-3" />
            <h3 className="text-success">¡Importación Completada!</h3>
            <p className="text-muted">Lote #{batchId}</p>
            <Row className="g-3 mt-4">
              <Col md={3}><div className="p-3 bg-success bg-opacity-10 rounded"><div className="fs-3 fw-bold text-success">{importResults.imported}</div><div className="small">Clientes Creados</div></div></Col>
              <Col md={3}><div className="p-3 bg-info bg-opacity-10 rounded"><div className="fs-3 fw-bold text-info">{importResults.updated}</div><div className="small">Actualizados</div></div></Col>
              <Col md={3}><div className="p-3 bg-warning bg-opacity-10 rounded"><div className="fs-3 fw-bold text-warning">{importResults.skipped}</div><div className="small">Omitidos</div></div></Col>
              <Col md={3}><div className="p-3 bg-danger bg-opacity-10 rounded"><div className="fs-3 fw-bold text-danger">{importResults.errors}</div><div className="small">Errores</div></div></Col>
            </Row>
            {config.autoAssign && importResults.distributed > 0 && (
              <>
                <hr className="my-4" />
                <h5 className="mb-3">Distribución Completada</h5>
                <Row className="g-3">
                  {Object.entries(importResults.distributionSummary || {}).map(([sellerId, count]) => {
                    const seller = eligibleSellers.find(s => s.seller_id === sellerId);
                    return (<Col md={3} key={sellerId}><div className="p-3 bg-primary bg-opacity-10 rounded"><div className="fs-5 fw-bold text-primary">{seller?.seller_name || 'Vendedor'}</div><div className="fs-3 fw-bold">{count as number}</div><div className="small">Clientes Asignados</div></div></Col>);
                  })}
                </Row>
              </>
            )}
            <div className="mt-4">
              <Button variant="primary" className="me-2" onClick={() => window.location.href = '/admin/assignments'}><Users size={18} className="me-2" />Ver Asignaciones</Button>
              <Button variant="outline-secondary" onClick={resetImport}>Nueva Importación</Button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
