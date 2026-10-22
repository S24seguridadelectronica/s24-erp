import { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Form, Modal, Badge, Table, Row, Col } from 'react-bootstrap';
import { 
  getSpreadsheets, 
  createSpreadsheet, 
  deleteSpreadsheet,
  getSpreadsheetRows,
  saveSpreadsheetRows 
} from '@/services/api/spreadsheets';
import { createCustomer, getCustomers } from '@/services/api/customers';
import { 
  getEligibleSellers, 
  distributeEqually, 
  saveAssignments 
} from '@/services/api/distribution';
import { Plus, Save, FileSpreadsheet, X, Users, CheckCircle } from 'lucide-react';

interface SpreadsheetData {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
}

const COLUMNS = [
  'nombre', 'apellido', 'empresa', 'telefono', 'telefono_secundario',
  'correo', 'ciudad', 'departamento', 'direccion', 'tipo_cliente', 'origen', 'observaciones'
];

const COLUMN_LABELS: Record<string, string> = {
  nombre: 'Nombre *', apellido: 'Apellido', empresa: 'Empresa',
  telefono: 'Teléfono', telefono_secundario: 'Tel. Secundario', correo: 'Correo',
  ciudad: 'Ciudad', departamento: 'Departamento', direccion: 'Dirección',
  tipo_cliente: 'Tipo Cliente', origen: 'Origen', observaciones: 'Observaciones'
};

export function SpreadsheetPage() {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetData[]>([]);
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<number | null>(null);
  const [rowData, setRowData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSpreadsheetName, setNewSpreadsheetName] = useState('');
  const [modified, setModified] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [distributionSummary, setDistributionSummary] = useState<Record<string, number> | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => { 
    loadSpreadsheets();
    loadExistingCustomers();
  }, []);

  useEffect(() => {
    if (activeSpreadsheetId) {
      loadSpreadsheetData(activeSpreadsheetId);
    }
  }, [activeSpreadsheetId]);

  async function loadExistingCustomers() {
    try {
      const customers = await getCustomers();
      setExistingCustomers(customers || []);
    } catch (err) {
      console.error('Error cargando clientes existentes:', err);
    }
  }

  async function loadSpreadsheets() {
    try {
      setLoading(true);
      const data = await getSpreadsheets();
      const sheets: SpreadsheetData[] = (data || []) as SpreadsheetData[];
      setSpreadsheets(sheets);
      if (sheets.length > 0 && !activeSpreadsheetId) {
        setActiveSpreadsheetId(sheets[0].id);
      }
    } catch (err: any) {
      setError('Error al cargar hojas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSpreadsheetData(spreadsheetId: number) {
    try {
      setLoading(true);
      const rows = await getSpreadsheetRows(spreadsheetId);
      const data: Record<string, any>[] = rows.length > 0 
        ? rows.map((row: any) => row.data) 
        : [createEmptyRow()];
      setRowData(data);
      setModified(false);
    } catch (err: any) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function createEmptyRow(): Record<string, any> {
    const row: Record<string, any> = { id: Date.now().toString() + Math.random() };
    COLUMNS.forEach(col => row[col] = '');
    return row;
  }

  const handleCreateSpreadsheet = async () => {
    if (!newSpreadsheetName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      setLoading(true);
      const newSheet = await createSpreadsheet({ name: newSpreadsheetName, is_active: true });
      if (newSheet) {
        setSpreadsheets([newSheet as SpreadsheetData, ...spreadsheets]);
        setActiveSpreadsheetId((newSheet as SpreadsheetData).id);
        setShowCreateModal(false);
        setNewSpreadsheetName('');
        setSuccess('Hoja creada exitosamente');
      }
    } catch (err: any) {
      setError('Error al crear hoja: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpreadsheet = async (id: number) => {
    if (window.confirm('¿Eliminar esta hoja de cálculo?')) {
      try {
        await deleteSpreadsheet(id);
        const newSheets: SpreadsheetData[] = spreadsheets.filter((s: SpreadsheetData) => s.id !== id);
        setSpreadsheets(newSheets);
        if (activeSpreadsheetId === id) {
          setActiveSpreadsheetId(newSheets.length > 0 ? newSheets[0].id : null);
        }
        setSuccess('Hoja eliminada');
      } catch (err: any) {
        setError('Error al eliminar: ' + err.message);
      }
    }
  };

  const handleSave = async () => {
    if (!activeSpreadsheetId) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await saveSpreadsheetRows(activeSpreadsheetId, rowData);

      let created = 0;
      let skipped = 0;
      let errors = 0;
      const createdCustomerIds: number[] = [];

      for (const row of rowData) {
        const nombre = row.nombre?.trim();
        const telefono = row.telefono?.trim();
        const correo = row.correo?.trim();

        if (!nombre) { skipped++; continue; }
        if (!telefono && !correo) { skipped++; continue; }

        const isDuplicate = existingCustomers.some((c: any) => {
          const phoneMatch = telefono && c.phone && normalizePhone(c.phone) === normalizePhone(telefono);
          const emailMatch = correo && c.email && c.email.toLowerCase() === correo.toLowerCase();
          return phoneMatch || emailMatch;
        });

        if (isDuplicate) { skipped++; continue; }

        try {
          const result = await createCustomer({
            full_name: `${nombre} ${row.apellido || ''}`.trim(),
            company_name: row.empresa || '',
            customer_type: row.tipo_cliente === 'Empresa' ? 'company' : 'individual',
            document_number: '',
            phone: telefono || '',
            email: correo || '',
            city: row.ciudad || '',
            address: row.direccion || '',
            contact_person: row.nombre || '',
            source: row.origen || 'Hoja de Cálculo',
            notes: row.observaciones || '',
          } as any);
          
          created++;
          if (result?.id) createdCustomerIds.push(result.id);
        } catch (err: any) {
          errors++;
          console.error('Error creando cliente:', err);
        }
      }

      await loadExistingCustomers();

      let distSummary: Record<string, number> | null = null;
      if (autoAssign && createdCustomerIds.length > 0) {
        try {
          const sellers = await getEligibleSellers();
          if (sellers.length > 0) {
            const distributionResult = await distributeEqually(createdCustomerIds, sellers);
            await saveAssignments(distributionResult.assignments);
            distSummary = distributionResult.summary;
            setDistributionSummary(distSummary);
            setShowDistributionModal(true);
          } else {
            setError('No hay vendedores elegibles. Los clientes se crearon pero no se asignaron.');
          }
        } catch (distErr: any) {
          console.error('Error en distribución:', distErr);
          setError(`Clientes creados pero error en distribución: ${distErr.message}`);
        }
      }

      setModified(false);
      
      let successMsg = `✅ Guardado en CRM: ${created} clientes creados`;
      if (skipped > 0) successMsg += `, ${skipped} omitidos`;
      if (errors > 0) successMsg += `, ${errors} errores`;
      if (autoAssign && distSummary) {
        successMsg += ` | 📊 Distribuidos entre ${Object.keys(distSummary).length} vendedores`;
      }
      setSuccess(successMsg);
    } catch (err: any) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  const handleAddRow = () => {
    setRowData([...rowData, createEmptyRow()]);
    setModified(true);
  };

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    const newRowData = [...rowData];
    newRowData[rowIndex] = { ...newRowData[rowIndex], [column]: value };
    setRowData(newRowData);
    setModified(true);
  };

  const handlePaste = (e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split('\n').filter(row => row.trim());
    const newRowData = [...rowData];
    
    rows.forEach((row, rIdx) => {
      const cells = row.split('\t');
      const targetRowIndex = rowIndex + rIdx;
      if (targetRowIndex >= newRowData.length) newRowData.push(createEmptyRow());
      cells.forEach((cell, cIdx) => {
        const targetColIndex = colIndex + cIdx;
        if (targetColIndex < COLUMNS.length) {
          newRowData[targetRowIndex][COLUMNS[targetColIndex]] = cell.trim();
        }
      });
    });
    
    setRowData(newRowData);
    setModified(true);
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><FileSpreadsheet size={28} className="me-2" />Hojas de Cálculo</h2>
          <p className="text-muted mb-0">Gestiona múltiples hojas y guarda automáticamente en el CRM</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="me-2" /> Nueva Hoja
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {spreadsheets.length === 0 ? (
        <Card className="border-0 shadow-sm text-center p-5">
          <Card.Body>
            <FileSpreadsheet size={64} className="text-muted mb-3" />
            <h4>No hay hojas de cálculo</h4>
            <p className="text-muted">Crea tu primera hoja para comenzar</p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} className="me-2" /> Crear Primera Hoja
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="d-flex align-items-center mb-3 bg-light rounded p-2 flex-wrap">
            {spreadsheets.map((sheet: SpreadsheetData) => (
              <div key={sheet.id} className="d-flex align-items-center me-2 mb-1">
                <Button
                  variant={activeSpreadsheetId === sheet.id ? 'primary' : 'outline-secondary'}
                  size="sm"
                  onClick={() => setActiveSpreadsheetId(sheet.id)}
                  className="me-1"
                >
                  {sheet.name}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteSpreadsheet(sheet.id)}
                  className="p-1"
                  style={{ width: '24px', height: '24px', padding: '0' }}
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>

          <Card className="border-0 shadow-sm mb-3">
            <Card.Body className="py-2">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <Badge bg="info" className="me-2">{rowData.length} filas</Badge>
                  {modified && <Badge bg="warning" text="dark">Cambios sin guardar</Badge>}
                  <Badge bg="secondary" className="ms-2">
                    <Users size={14} className="me-1" /> {existingCustomers.length} clientes en CRM
                  </Badge>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <Form.Check
                    type="switch"
                    id="autoAssignSwitch"
                    label="Asignar a vendedores"
                    checked={autoAssign}
                    onChange={(e) => setAutoAssign(e.target.checked)}
                    className="me-2"
                  />
                  <Button variant="outline-primary" size="sm" onClick={handleAddRow}>
                    <Plus size={16} className="me-1" /> Agregar Fila
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleSave}
                    disabled={!modified || loading}
                  >
                    <Save size={16} className="me-1" />
                    {loading ? 'Guardando...' : 'Guardar en CRM'}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-info bg-opacity-10 border-0 py-2">
              <small className="text-muted">
                💡 <strong>Tip:</strong> Haz clic en cualquier celda para editar | Copia desde Excel y usa Ctrl+V para pegar múltiples filas
              </small>
            </Card.Header>
            <Card.Body className="p-0">
              <div style={{ overflow: 'auto', maxHeight: '600px' }}>
                <Table ref={tableRef} bordered hover size="sm" className="mb-0">
                  <thead className="bg-light sticky-top">
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      {COLUMNS.map(col => (
                        <th key={col} style={{ minWidth: '120px' }}>{COLUMN_LABELS[col]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowData.map((row: Record<string, any>, rowIndex: number) => (
                      <tr key={row.id}>
                        <td className="text-center text-muted">{rowIndex + 1}</td>
                        {COLUMNS.map((col: string, colIndex: number) => (
                          <td key={col} style={{ padding: '0' }}>
                            <input
                              type="text"
                              className="form-control form-control-sm border-0"
                              value={row[col] || ''}
                              onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                              onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                              style={{ width: '100%', minHeight: '35px', borderRadius: '0' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Crear Nueva Hoja de Cálculo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Nombre de la hoja *</Form.Label>
            <Form.Control
              type="text"
              value={newSpreadsheetName}
              onChange={(e) => setNewSpreadsheetName(e.target.value)}
              placeholder="Ej: Clientes Octubre 2024"
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateSpreadsheet} disabled={!newSpreadsheetName.trim()}>Crear Hoja</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDistributionModal} onHide={() => setShowDistributionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><CheckCircle className="text-success me-2" />Distribución Completada</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">Los clientes han sido distribuidos automáticamente entre los vendedores:</p>
          <Row className="g-3">
            {distributionSummary && Object.entries(distributionSummary).map(([sellerId, count]) => (
              <Col md={6} key={sellerId}>
                <div className="p-3 bg-primary bg-opacity-10 rounded text-center">
                  <div className="fs-5 fw-bold text-primary">Vendedor</div>
                  <div className="fs-3 fw-bold">{count}</div>
                  <div className="small">Clientes Asignados</div>
                </div>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowDistributionModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
