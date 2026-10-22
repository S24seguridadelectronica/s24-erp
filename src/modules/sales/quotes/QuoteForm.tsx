import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Table, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createQuote, updateQuote, getNextQuoteNumber, type QuoteItem } from '@/services/api/quotes';
import { getCustomers, updateCustomer } from '@/services/api/customers';
import { getOpportunities, updateOpportunity } from '@/services/api/opportunities';
import { getProducts } from '@/services/api/inventory'; // <-- CONEXIÓN AL INVENTARIO
import { supabase } from '@/services/supabase/client';
import { Plus, Trash2, Target, DollarSign, Calendar, MessageSquare, Wrench, FileBox, Calculator, User, Phone, MapPin, Building, FileText, Package } from 'lucide-react';
import { CctvCalculatorModal } from './CctvCalculatorModal';
import { CalcularServicios } from './CalcularServicios';

const schema = z.object({
  quote_number: z.string().min(1, 'Número es requerido'),
  customer_id: z.coerce.number().min(1, 'Selecciona un cliente'),
  opportunity_id: z.coerce.number().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'converted']),
  valid_until: z.string().min(1, 'Fecha de validez es requerida'),
  terms: z.string().optional(),
  internal_notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface QuoteFormProps {
  show: boolean;
  onHide: () => void;
  quote?: any | null;
  preselectedOpportunity?: any | null;
  onSuccess: () => void;
}

export function QuoteForm({ show, onHide, quote, preselectedOpportunity, onSuccess }: QuoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allOpportunities, setAllOpportunities] = useState<any[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<any[]>([]);
  const [selectedOppInfo, setSelectedOppInfo] = useState<any | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [autoSelectedOppId, setAutoSelectedOppId] = useState<number | undefined>(undefined);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any | null>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]); // <-- ESTADO PARA PRODUCTOS

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: quote || { status: 'draft', quote_number: 'COT-001' }
  });

  const watchedCustomerId = watch('customer_id');
  const watchedOppId = watch('opportunity_id');

  useEffect(() => {
    if (show) {
      loadData();
      loadTemplates();
      loadProducts(); // <-- CARGAR PRODUCTOS DEL INVENTARIO
      setAutoSelectedOppId(undefined);
      setSelectedCustomerData(null);

      const initializeForm = async () => {
        if (quote) {
          const { data: fullQuote } = await (supabase.from('quotes') as any)
            .select('*, items(*)')
            .eq('id', quote.id)
            .single();
          
          reset({
            ...quote,
            valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
            opportunity_id: quote.opportunity_id || undefined,
            internal_notes: quote.internal_notes || ''
          });
          setItems(fullQuote?.items || []);
          
          if (quote.customer_id) {
            const cust = customers.find(c => Number(c.id) === Number(quote.customer_id));
            if (cust) setCustomerData(cust);
          }
        } else if (preselectedOpportunity) {
          reset({
            status: 'draft',
            valid_until: '',
            quote_number: 'COT-001',
            customer_id: preselectedOpportunity.customer_id,
            opportunity_id: preselectedOpportunity.id,
            internal_notes: ''
          });
          setItems([]);
          setSelectedOppInfo(preselectedOpportunity);
          setAutoSelectedOppId(preselectedOpportunity.id);
          const cust = customers.find(c => Number(c.id) === Number(preselectedOpportunity.customer_id));
          if (cust) setCustomerData(cust);
          getNextQuoteNumber().then(num => {
            reset(prev => ({ ...prev, quote_number: num }));
          });
        } else {
          reset({ status: 'draft', valid_until: '', quote_number: 'COT-001', internal_notes: '' });
          setItems([]);
          getNextQuoteNumber().then(num => reset({ status: 'draft', valid_until: '', quote_number: num }));
        }
      };

      initializeForm();
    }
  }, [quote, preselectedOpportunity, show, reset, customers]);

  const setCustomerData = (cust: any) => {
    setSelectedCustomerData({
      id: cust.id,
      document_number: cust.document_number || '',
      full_name: cust.full_name || '',
      company_name: cust.company_name || '',
      contact_person: cust.contact_person || '',
      whatsapp_phone: cust.whatsapp_phone || '',
      address: cust.address || '',
      city: cust.city || '',
      email: cust.email || ''
    });
  };

  const updateCustomerField = (field: string, value: string) => {
    if (selectedCustomerData) {
      setSelectedCustomerData({ ...selectedCustomerData, [field]: value });
    }
  };

  useEffect(() => {
    if (watchedCustomerId && allOpportunities.length > 0) {
      const opps = allOpportunities.filter(opp =>
        Number(opp.customer_id) === Number(watchedCustomerId) &&
        !['ganado', 'perdido'].includes(opp.stage)
      );
      setFilteredOpportunities(opps);

      if (opps.length === 1 && !watchedOppId && !preselectedOpportunity && !autoSelectedOppId) {
        setAutoSelectedOppId(opps[0].id);
        setSelectedOppInfo(opps[0]);
        reset(prev => ({ ...prev, opportunity_id: opps[0].id }));
      } else if (opps.length === 0) {
        setAutoSelectedOppId(undefined);
        if (!preselectedOpportunity) setSelectedOppInfo(null);
      }
    } else {
      setFilteredOpportunities([]);
      if (!preselectedOpportunity) {
        setSelectedOppInfo(null);
        setAutoSelectedOppId(undefined);
      }
    }
  }, [watchedCustomerId, allOpportunities]);

  useEffect(() => {
    if (watchedCustomerId && !quote && !preselectedOpportunity) {
      const cust = customers.find(c => Number(c.id) === Number(watchedCustomerId));
      if (cust) setCustomerData(cust);
      else setSelectedCustomerData(null);
    }
  }, [watchedCustomerId, customers, quote, preselectedOpportunity]);

  useEffect(() => {
    if (watchedOppId) {
      const opp = filteredOpportunities.find(o => Number(o.id) === Number(watchedOppId)) ||
                  allOpportunities.find(o => Number(o.id) === Number(watchedOppId));
      if (opp) {
        setSelectedOppInfo(opp);
        setAutoSelectedOppId(opp.id);
      }
    } else if (!preselectedOpportunity) {
      setSelectedOppInfo(null);
      setAutoSelectedOppId(undefined);
    }
  }, [watchedOppId, filteredOpportunities, allOpportunities]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roleData } = await (supabase.from('user_roles') as any).select('roles(name)').eq('user_id', user?.id).maybeSingle();
      const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';
      const isSalesperson = roleName === 'salesperson' || roleName === 'vendedor';
      const sellerId = isSalesperson ? user?.id : undefined;

      const [custData, oppData] = await Promise.all([
        getCustomers(sellerId),
        getOpportunities(sellerId)
      ]);
      setCustomers(custData || []);
      setAllOpportunities(oppData || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar clientes u oportunidades');
    }
  }

  async function loadProducts() { // <-- FUNCIÓN PARA CARGAR INVENTARIO
    try {
      const data = await getProducts();
      setAvailableProducts(data?.filter((p: any) => p.is_active) || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
    }
  }

  async function loadTemplates() {
    try {
      const { data } = await (supabase.from('quote_templates') as any).select('*').order('name');
      setTemplates(data || []);
    } catch (err) {
      console.error('Error cargando plantillas:', err);
    }
  }

  const handleLoadTemplate = (template: any) => {
    if (window.confirm(`¿Cargar la plantilla "${template.name}"? Esto reemplazará los items actuales.`)) {
      setItems(template.items || []);
    }
  };

  const handleAddCalculatedItems = (calculatedItems: any[]) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      calculatedItems.forEach(calcItem => {
        newItems.push({
          item_type: calcItem.item_type,
          description: calcItem.description,
          quantity: Number(calcItem.quantity) || 1,
          unit_price: Number(calcItem.unit_price) || 0,
          discount: Number(calcItem.discount) || 0,
          tax_rate: Number(calcItem.tax_rate) || 19
        });
      });
      return newItems;
    });
  };

  const handleAddFromCatalog = (productId: number) => { // <-- FUNCIÓN PARA AGREGAR DESDE CATÁLOGO
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    setItems(prevItems => [
      ...prevItems,
      {
        item_type: 'product',
        description: `${product.sku} - ${product.name}`,
        quantity: 1,
        unit_price: product.price || 0,
        discount: 0,
        tax_rate: 19
      }
    ]);
  };

  const addItem = () => {
    setItems([...items, { item_type: 'service', description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 19 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
    const discountAmount = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const disc = Number(item.discount) || 0;
      return sum + (qty * price * disc / 100);
    }, 0);
    const taxAmount = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const disc = Number(item.discount) || 0;
      const tax = Number(item.tax_rate) || 19;
      return sum + ((qty * price * (1 - disc / 100)) * tax / 100);
    }, 0);
    const taxBase = subtotal - discountAmount;
    const total = taxBase + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  };

  const onSubmit = async (data: FormData) => {
    if (items.length === 0) {
      setError('Debes agregar al menos un item a la cotización');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totals = calculateTotals();
      const quoteData = { 
        ...data, 
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        total: totals.total,
        salesperson_id: user?.id 
      };

      if (quote?.id) {
        await updateQuote(quote.id, quoteData);
      } else {
        await createQuote(quoteData, items);
      }

      if (selectedCustomerData && data.customer_id) {
        await updateCustomer(data.customer_id, {
          document_number: selectedCustomerData.document_number,
          full_name: selectedCustomerData.full_name,
          company_name: selectedCustomerData.company_name,
          contact_person: selectedCustomerData.contact_person,
          whatsapp_phone: selectedCustomerData.whatsapp_phone,
          address: selectedCustomerData.address,
          city: selectedCustomerData.city,
          email: selectedCustomerData.email
        });
      }

      if ((data.status === 'approved' || data.status === 'converted') && data.opportunity_id) {
        try {
          await updateOpportunity(data.opportunity_id, { stage: 'ganado' });
        } catch (err) {
          console.error('Error actualizando oportunidad:', err);
        }
      }

      onSuccess();
      onHide();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setError(err.message || 'Error al guardar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{quote ? 'Editar Cotización' : 'Nueva Cotización'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Group><Form.Label>Número *</Form.Label><Form.Control {...register('quote_number')} readOnly /></Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group>
                <Form.Label>Cliente *</Form.Label>
                <Form.Select isInvalid={!!errors.customer_id} {...register('customer_id')} disabled={!!preselectedOpportunity && !quote}>
                  <option value="">Selecciona un cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.customer_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Oportunidad (opcional)</Form.Label>
                <Form.Select {...register('opportunity_id')} disabled={!!preselectedOpportunity && !quote}>
                  <option value="">Sin oportunidad</option>
                  {filteredOpportunities.map(o => <option key={o.id} value={o.id}>{o.title} (Etapa: {o.stage})</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Estado *</Form.Label>
                <Form.Select {...register('status')}>
                  <option value="draft">Borrador</option>
                  <option value="sent">Enviada</option>
                  <option value="approved">Aprobada</option>
                  <option value="rejected">Rechazada</option>
                  <option value="converted">Convertida en Venta</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Válida hasta *</Form.Label>
                <Form.Control type="date" isInvalid={!!errors.valid_until} {...register('valid_until')} />
                <Form.Control.Feedback type="invalid">{errors.valid_until?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {selectedCustomerData && (
            <Card className="mb-4 border-info">
              <Card.Header className="bg-info bg-opacity-10">
                <h6 className="mb-0"><MessageSquare size={18} className="me-2" />Datos del Cliente (Confirmar o Actualizar)</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold"><FileText size={14} className="me-1" />NIT / Cédula</Form.Label>
                      <Form.Control value={selectedCustomerData.document_number} onChange={(e) => updateCustomerField('document_number', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold"><Building size={14} className="me-1" />Razón Social / Empresa</Form.Label>
                      <Form.Control value={selectedCustomerData.company_name} onChange={(e) => updateCustomerField('company_name', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold"><User size={14} className="me-1" />Nombre del Dueño / Contacto</Form.Label>
                      <Form.Control value={selectedCustomerData.contact_person} onChange={(e) => updateCustomerField('contact_person', e.target.value)} placeholder="Nombre de la persona de contacto" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-bold"><Phone size={14} className="me-1" />WhatsApp</Form.Label>
                      <Form.Control value={selectedCustomerData.whatsapp_phone} onChange={(e) => updateCustomerField('whatsapp_phone', e.target.value)} placeholder="Número para WhatsApp" />
                    </Form.Group>
                  </Col>
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label className="small fw-bold"><MapPin size={14} className="me-1" />Dirección Real</Form.Label>
                      <Form.Control value={selectedCustomerData.address} onChange={(e) => updateCustomerField('address', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Ciudad</Form.Label>
                      <Form.Control value={selectedCustomerData.city} onChange={(e) => updateCustomerField('city', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Correo Electrónico</Form.Label>
                      <Form.Control type="email" value={selectedCustomerData.email} onChange={(e) => updateCustomerField('email', e.target.value)} />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Text className="text-muted mt-2 d-block">
                  💡 Al guardar esta cotización, estos datos se actualizarán automáticamente en la ficha del cliente.
                </Form.Text>
              </Card.Body>
            </Card>
          )}

          {selectedOppInfo && (
            <Card className="mb-4 border-primary">
              <Card.Header className="bg-primary bg-opacity-10">
                <h6 className="mb-0"><Target size={18} className="me-2" />Información de la Oportunidad Vinculada</h6>
              </Card.Header>
              <Card.Body>
                <Row className="g-3">
                  <Col md={4}>
                    <div className="d-flex align-items-center">
                      <DollarSign size={20} className="text-success me-2" />
                      <div><div className="small text-muted">Valor Estimado</div><div className="fw-bold">${(selectedOppInfo.value || 0).toLocaleString('es-CO')}</div></div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex align-items-center">
                      <Calendar size={20} className="text-info me-2" />
                      <div><div className="small text-muted">Fecha Cierre Estimada</div><div className="fw-bold">{selectedOppInfo.expected_close_date ? new Date(selectedOppInfo.expected_close_date).toLocaleDateString('es-CO') : 'No definida'}</div></div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="d-flex align-items-center">
                      <Target size={20} className="text-primary me-2" />
                      <div><div className="small text-muted">Probabilidad</div><div className="fw-bold">{selectedOppInfo.probability || 0}%</div></div>
                    </div>
                  </Col>
                  {selectedOppInfo.technical_survey && (
                    <Col md={12}>
                      <div className="border rounded p-3 bg-light">
                        <div className="d-flex align-items-center mb-2"><Wrench size={18} className="text-warning me-2" /><strong>Levantamiento Técnico</strong></div>
                        <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{selectedOppInfo.technical_survey}</div>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          )}

          <h5 className="mb-3 d-flex justify-content-between align-items-center">
            <span>Items de la Cotización</span>
            <div className="d-flex gap-2 flex-wrap">
              <Form.Select
                style={{ width: '200px' }}
                onChange={(e) => {
                  if (e.target.value) {
                    const tpl = templates.find(t => t.id === Number(e.target.value));
                    if (tpl) handleLoadTemplate(tpl);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">📋 Cargar Plantilla...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Form.Select>
              <Button variant="outline-info" size="sm" onClick={() => setShowCalcModal(true)}>
                <Calculator size={16} className="me-1" /> Calcular Instalación
              </Button>
              <Button variant="outline-success" size="sm" onClick={() => setShowServiceModal(true)}>
                <Wrench size={16} className="me-1" /> Calcular Servicios
              </Button>
            </div>
          </h5>

          {/* NUEVO: BUSCADOR DE PRODUCTOS DEL INVENTARIO */}
          <div className="mb-3 p-3 bg-light rounded border">
            <Row className="align-items-end">
              <Col md={8}>
                <Form.Group>
                  <Form.Label className="small fw-bold text-primary"><Package size={14} className="me-1" /> Agregar desde Catálogo de Productos</Form.Label>
                  <Form.Select 
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddFromCatalog(Number(e.target.value));
                        e.target.value = ""; // Resetear el select después de elegir
                      }
                    }}
                  >
                    <option value="">🔍 Seleccionar un producto del inventario...</option>
                    {availableProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name} (Stock: {p.stock_quantity}) - ${Number(p.price).toLocaleString('es-CO')}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">Al seleccionar, el producto se agregará automáticamente a la tabla con su precio y descripción.</Form.Text>
                </Form.Group>
              </Col>
              <Col md={4} className="text-end">
                <Button variant="outline-primary" size="sm" onClick={addItem}>
                  <Plus size={16} className="me-2" /> Agregar Item Manual
                </Button>
              </Col>
            </Row>
          </div>

          <Table responsive bordered size="sm">
            <thead className="bg-light">
              <tr>
                <th>Tipo</th><th>Descripción</th><th style={{width: '80px'}}>Cantidad</th>
                <th style={{width: '120px'}}>Precio Unit.</th><th style={{width: '80px'}}>Desc. %</th>
                <th style={{width: '80px'}}>IVA %</th><th style={{width: '120px'}}>Total</th><th style={{width: '50px'}}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <Form.Select value={item.item_type} onChange={(e) => updateItem(index, 'item_type', e.target.value)}>
                      <option value="product">Producto</option>
                      <option value="service">Servicio</option>
                    </Form.Select>
                  </td>
                  <td><Form.Control value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Descripción" /></td>
                  <td><Form.Control type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                  <td><Form.Control type="number" min="0" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                  <td><Form.Control type="number" min="0" max="100" value={item.discount || 0} onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)} /></td>
                  <td><Form.Control type="number" min="0" max="100" value={item.tax_rate || 19} onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)} /></td>
                  <td className="fw-bold">${((Number(item.quantity) * Number(item.unit_price)) * (1 - (Number(item.discount) || 0) / 100) * (1 + (Number(item.tax_rate) || 19) / 100)).toLocaleString('es-CO')}</td>
                  <td><Button variant="outline-danger" size="sm" onClick={() => removeItem(index)}><Trash2 size={14} /></Button></td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Row className="mt-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Términos y Condiciones (Visible en el PDF)</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('terms')} placeholder="Términos de pago, garantía, etc." />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="text-warning"><FileBox size={16} className="me-1" /> Notas Internas (SOLO para el vendedor)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  {...register('internal_notes')}
                  className="bg-warning bg-opacity-10 border-warning"
                  placeholder="Estrategia de negociación, contacto clave, observaciones internas, etc."
                />
                <Form.Text className="text-muted">Esta información NO aparecerá en el PDF ni se enviará al cliente.</Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <div className="mt-4 p-3 bg-light rounded">
            <Row>
              <Col md={6}></Col>
              <Col md={6}>
                <div className="d-flex justify-content-between mb-2"><span>Subtotal:</span><span>${totals.subtotal.toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between mb-2"><span>Descuento:</span><span>-${totals.discountAmount.toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between mb-2"><span>IVA (19%):</span><span>${totals.taxAmount.toLocaleString('es-CO')}</span></div>
                <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2"><span>TOTAL:</span><span>${totals.total.toLocaleString('es-CO')}</span></div>
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="secondary" onClick={onHide} disabled={loading}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Cotización'}
          </Button>
        </Modal.Footer>
      </Form>

      <CctvCalculatorModal
        show={showCalcModal}
        onHide={() => setShowCalcModal(false)}
        onAddItems={handleAddCalculatedItems}
      />
      <CalcularServicios
        show={showServiceModal}
        onHide={() => setShowServiceModal(false)}
        onAddItems={handleAddCalculatedItems}
      />
    </Modal>
  );
}