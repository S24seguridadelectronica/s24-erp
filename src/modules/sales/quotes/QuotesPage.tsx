import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { getQuotes, deleteQuote } from '@/services/api/quotes';
import { FileText, Search, Edit2, Trash2, Eye, Send } from 'lucide-react';
import { QuoteForm } from './QuoteForm';

const STATUS_CONFIG = {
  draft: { label: 'Borrador', color: 'secondary' },
  sent: { label: 'Enviada', color: 'info' },
  approved: { label: 'Aprobada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'danger' },
  converted: { label: 'Convertida', color: 'primary' },
};

export function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);

  useEffect(() => { loadQuotes(); }, []);

  async function loadQuotes() {
    try {
      setLoading(true);
      const data = await getQuotes();
      setQuotes(data || []);
    } catch (err: any) {
      setError('Error al cargar las cotizaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta cotización?')) {
      try {
        await deleteQuote(id);
        loadQuotes();
      } catch (err: any) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Cotizaciones</h2>
          <p className="text-muted mb-0">Gestiona las cotizaciones y propuestas comerciales de S24</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingQuote(null); setShowForm(true); }}>
          <FileText size={18} className="me-2" /> Nueva Cotización
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text><Search size={18} /></InputGroup.Text>
            <Form.Control placeholder="Buscar por número de cotización o cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </InputGroup>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Número</th>
                <th>Cliente</th>
                <th>Oportunidad</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Validez</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-5 text-muted">No hay cotizaciones registradas.</td></tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const status = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG];
                  return (
                    <tr key={quote.id}>
                      <td className="ps-4 fw-semibold">{quote.quote_number}</td>
                      <td>{quote.customers?.full_name || 'N/A'}</td>
                      <td>{quote.opportunities?.title || '-'}</td>
                      <td><Badge bg={status.color}>{status.label}</Badge></td>
                      <td className="fw-bold">${(quote.total || 0).toLocaleString('es-CO')}</td>
                      <td>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-CO') : '-'}</td>
                      <td className="text-end pe-4">
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => { setEditingQuote(quote); setShowForm(true); }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(quote.id)}>
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

      <QuoteForm show={showForm} onHide={() => setShowForm(false)} quote={editingQuote} onSuccess={loadQuotes} />
    </div>
  );
}
