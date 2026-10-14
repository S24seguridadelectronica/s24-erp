import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { getTransactions, deleteTransaction } from '@/services/api/finance';
import { ArrowDownCircle, ArrowUpCircle, Search, Trash2, Plus } from 'lucide-react';
import { TransactionForm } from './TransactionForm';

const TYPE_CONFIG: any = {
  income: { label: 'Ingreso', color: 'success', icon: ArrowDownCircle },
  expense: { label: 'Egreso', color: 'danger', icon: ArrowUpCircle },
  payment: { label: 'Pago', color: 'primary', icon: ArrowDownCircle },
  refund: { label: 'Reembolso', color: 'warning', icon: ArrowUpCircle },
};

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadTransactions(); }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data || []);
    } catch (err: any) {
      setError('Error al cargar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await deleteTransaction(id);
        loadTransactions();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || t.transaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Transacciones Financieras</h2>
          <p className="text-muted mb-0">Registro de ingresos, egresos, pagos y reembolsos</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Plus size={18} className="me-2" /> Nueva Transacción
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text><Search size={18} /></InputGroup.Text>
                <Form.Control placeholder="Buscar por descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Todos los tipos</option>
                {Object.entries(TYPE_CONFIG).map(([key, config]: any) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
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
                <th className="ps-4">Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Método</th>
                <th>Monto</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">No hay transacciones registradas.</td></tr>
              ) : (
                filteredTransactions.map((t) => {
                  const type = TYPE_CONFIG[t.transaction_type];
                  const Icon = type.icon;
                  return (
                    <tr key={t.id}>
                      <td className="ps-4">{new Date(t.transaction_date).toLocaleDateString('es-CO')}</td>
                      <td>
                        <Badge bg={type.color} className="d-flex align-items-center gap-1 w-fit">
                          <Icon size={14} /> {type.label}
                        </Badge>
                      </td>
                      <td>{t.description || '-'}</td>
                      <td>{t.payment_method || '-'}</td>
                      <td className={`fw-bold ${t.transaction_type === 'income' || t.transaction_type === 'payment' ? 'text-success' : 'text-danger'}`}>
                        {t.transaction_type === 'income' || t.transaction_type === 'payment' ? '+' : '-'}${(t.amount || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="text-end pe-4">
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(t.id)}>
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

      <TransactionForm show={showForm} onHide={() => setShowForm(false)} onSuccess={loadTransactions} />
    </div>
  );
}
