import { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { Users, FileText, ShoppingCart, Wrench, DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle, Receipt, CreditCard } from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import './DashboardPage.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  return (
    <Card className="stat-card h-100">
      <Card.Body>
        <div className="stat-header">
          <div className="stat-icon" style={{ backgroundColor: color }}>
            <Icon size={24} color="white" />
          </div>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle small text-muted">{subtitle}</div>}
      </Card.Body>
    </Card>
  );
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'vendedor'>('vendedor');
  const [stats, setStats] = useState({
    clientesActivos: 0,
    cotizacionesPendientes: 0,
    cotizacionesAprobadas: 0,
    cotizacionesConvertidas: 0,
    cotizacionesCompletadas: 0,
    facturasPendientes: 0,
    facturasPagadas: 0,
    facturasParciales: 0,
    ventasDelMes: 0,
    cuentasPorCobrar: 0,
    totalFacturado: 0,
    totalCotizaciones: 0,
    ingresosMes: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      console.log('🔍 Dashboard - Usuario:', user.email);

      // 2. Determinar rol
      let isAdmin = user.email === 's24hseguridad@gmail.com';
      try {
        const { data: profile, error } = await (supabase.from('profiles') as any)
          .select('role')
          .eq('id', user.id)
          .single();
        if (!error && profile?.role === 'admin') isAdmin = true;
      } catch (e) {}
      setUserRole(isAdmin ? 'admin' : 'vendedor');

      // 3. Fechas de referencia
      const ahora = new Date();
      const primerDiaDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
      const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString();

      // 4. CLIENTES
      let clientesQuery = (supabase.from('customers') as any).select('*', { count: 'exact', head: true });
      if (!isAdmin) clientesQuery = clientesQuery.eq('assigned_to', user.id);
      const { count: clientesCount } = await clientesQuery;

      // 5. IDs de clientes del vendedor (para filtrar facturas)
      let clienteIds: number[] = [];
      if (!isAdmin) {
        const { data: misClientes } = await (supabase.from('customers') as any)
          .select('id')
          .eq('assigned_to', user.id);
        clienteIds = misClientes?.map((c: any) => c.id) || [];
      }

      // 6. COTIZACIONES
      let quotesQuery = (supabase.from('quotes') as any).select('status, total, created_at, customer_id');
      if (!isAdmin && clienteIds.length > 0) {
        quotesQuery = quotesQuery.in('customer_id', clienteIds);
      }
      const { data: quotes } = await quotesQuery;

      const cotizacionesPendientes = quotes?.filter(q => ['draft', 'sent'].includes(q.status)).length || 0;
      const cotizacionesAprobadas = quotes?.filter(q => q.status === 'approved').length || 0;
      const cotizacionesConvertidas = quotes?.filter(q => q.status === 'converted').length || 0;
      const cotizacionesCompletadas = quotes?.filter(q => q.status === 'completed').length || 0;

      // 7. FACTURAS REALES (accounts_receivable) ← TABLA CORRECTA
      let facturasQuery = (supabase.from('accounts_receivable') as any)
        .select('status, total_amount, paid_amount, issue_date, customer_id');
      if (!isAdmin && clienteIds.length > 0) {
        facturasQuery = facturasQuery.in('customer_id', clienteIds);
      }
      const { data: facturas } = await facturasQuery;
      console.log('📄 Facturas obtenidas:', facturas?.length);
      console.log('📄 Detalle facturas:', facturas);

      const facturasPendientes = facturas?.filter(f => f.status === 'pending').length || 0;
      const facturasParciales = facturas?.filter(f => f.status === 'partial').length || 0;
      const facturasPagadas = facturas?.filter(f => f.status === 'paid').length || 0;

      // 8. CUENTAS POR COBRAR: suma de (total - pagado) de facturas pendientes/parciales
      const cuentasPorCobrar = facturas
        ?.filter(f => f.status === 'pending' || f.status === 'partial')
        .reduce((sum, f) => sum + ((f.total_amount || 0) - (f.paid_amount || 0)), 0) || 0;

      // 9. TOTAL FACTURADO: suma de TODAS las facturas
      const totalFacturado = facturas
        ?.reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0;

      // 10. INGRESOS DEL MES: suma de paid_amount de facturas pagadas/parciales este mes
      const ingresosMes = facturas
        ?.filter(f => {
          const issueDate = f.issue_date ? new Date(f.issue_date) : new Date();
          return issueDate >= new Date(primerDiaDelMes);
        })
        .reduce((sum, f) => sum + (f.paid_amount || 0), 0) || 0;

      // 11. VENTAS DEL MES: Facturas emitidas este mes (total_amount)
      const ventasDelMes = facturas
        ?.filter(f => {
          const issueDate = f.issue_date ? new Date(f.issue_date) : new Date();
          return issueDate >= new Date(primerDiaDelMes);
        })
        .reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0;

      setStats({
        clientesActivos: clientesCount || 0,
        cotizacionesPendientes,
        cotizacionesAprobadas,
        cotizacionesConvertidas,
        cotizacionesCompletadas,
        facturasPendientes,
        facturasPagadas,
        facturasParciales,
        ventasDelMes,
        cuentasPorCobrar,
        totalFacturado,
        totalCotizaciones: quotes?.length || 0,
        ingresosMes,
      });

      console.log('✅ Dashboard cargado:', {
        clientes: clientesCount,
        cotizaciones: quotes?.length,
        facturas: facturas?.length,
        ventasDelMes,
        cuentasPorCobrar,
        ingresosMes,
      });
    } catch (err) {
      console.error('💥 Error cargando dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>Dashboard {userRole === 'admin' ? '(Administrador)' : '(Vendedor)'}</h2>
          <p>
            {userRole === 'admin'
              ? 'Vista global de toda la operación de S24'
              : 'Resumen de tu actividad comercial'}
          </p>
        </div>
      </div>

      {/* SECCIÓN 1: CLIENTES Y COTIZACIONES */}
      <div className="mb-3">
        <h5 className="text-muted mb-3">📊 Comercial</h5>
        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Clientes Activos" value={stats.clientesActivos} icon={Users} color="#007bff" />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Cotiz. Pendientes" value={stats.cotizacionesPendientes} icon={FileText} color="#ffc107" subtitle="Borrador + Enviadas" />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Cotiz. Aprobadas" value={stats.cotizacionesAprobadas} icon={CheckCircle} color="#28a745" subtitle="Listas para facturar" />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Cotiz. Completadas" value={stats.cotizacionesCompletadas} icon={Clock} color="#343a40" subtitle="Proceso finalizado" />
          </Col>
        </Row>
      </div>

      {/* SECCIÓN 2: FACTURACIÓN */}
      <div className="mb-3 mt-4">
        <h5 className="text-muted mb-3"> Facturación</h5>
        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Total Facturado" value={fmtMoney(stats.totalFacturado)} icon={Receipt} color="#6f42c1" subtitle="Histórico" />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Ventas del Mes" value={fmtMoney(stats.ventasDelMes)} icon={ShoppingCart} color="#17a2b8" subtitle="Facturas emitidas" />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Ingresos del Mes" value={fmtMoney(stats.ingresosMes)} icon={DollarSign} color="#28a745" subtitle="Dinero cobrado" />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <StatCard title="Por Cobrar" value={fmtMoney(stats.cuentasPorCobrar)} icon={AlertCircle} color="#dc3545" subtitle="Pendiente" />
          </Col>
        </Row>
      </div>

      {/* SECCIÓN 3: DETALLE DE FACTURAS */}
      <div className="mt-4">
        <Row className="g-3">
          <Col lg={6}>
            <Card className="dashboard-card h-100">
              <Card.Header>
                <h5 className="mb-0">📄 Estado de Facturas</h5>
              </Card.Header>
              <Card.Body>
                <Row className="text-center">
                  <Col xs={4}>
                    <div className="fs-3 fw-bold text-warning">{stats.facturasPendientes}</div>
                    <small className="text-muted">Pendientes</small>
                    <div className="mt-1"><Badge bg="warning">Sin pago</Badge></div>
                  </Col>
                  <Col xs={4}>
                    <div className="fs-3 fw-bold text-info">{stats.facturasParciales}</div>
                    <small className="text-muted">Parciales</small>
                    <div className="mt-1"><Badge bg="info">Abonos</Badge></div>
                  </Col>
                  <Col xs={4}>
                    <div className="fs-3 fw-bold text-success">{stats.facturasPagadas}</div>
                    <small className="text-muted">Pagadas</small>
                    <div className="mt-1"><Badge bg="success">Completas</Badge></div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            <Card className="dashboard-card h-100">
              <Card.Header>
                <h5 className="mb-0">📈 Embudo de Ventas</h5>
              </Card.Header>
              <Card.Body>
                <Row className="text-center">
                  <Col xs={3}>
                    <div className="fs-3 fw-bold text-secondary">{stats.totalCotizaciones}</div>
                    <small className="text-muted">Cotizaciones</small>
                  </Col>
                  <Col xs={3}>
                    <div className="fs-3 fw-bold text-success">{stats.cotizacionesAprobadas}</div>
                    <small className="text-muted">Aprobadas</small>
                  </Col>
                  <Col xs={3}>
                    <div className="fs-3 fw-bold text-primary">{stats.cotizacionesConvertidas}</div>
                    <small className="text-muted">Facturadas</small>
                  </Col>
                  <Col xs={3}>
                    <div className="fs-3 fw-bold text-dark">{stats.facturasPagadas}</div>
                    <small className="text-muted">Cobradas</small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* GUÍA VISUAL DEL FLUJO */}
      <Card className="mt-4 border-info">
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">💡 Flujo de Ventas S24</h5>
        </Card.Header>
        <Card.Body>
          <Row className="text-center">
            <Col md={2}>
              <div className="p-2 bg-light rounded">
                <FileText className="text-warning mb-2" size={32} />
                <div className="fw-bold">1. Cotización</div>
                <small className="text-muted">Propuesta comercial</small>
              </div>
            </Col>
            <Col md={1} className="d-flex align-items-center justify-content-center">
              <TrendingUp className="text-muted" size={24} />
            </Col>
            <Col md={2}>
              <div className="p-2 bg-light rounded">
                <CheckCircle className="text-success mb-2" size={32} />
                <div className="fw-bold">2. Aprobada</div>
                <small className="text-muted">Cliente acepta</small>
              </div>
            </Col>
            <Col md={1} className="d-flex align-items-center justify-content-center">
              <TrendingUp className="text-muted" size={24} />
            </Col>
            <Col md={2}>
              <div className="p-2 bg-light rounded">
                <Receipt className="text-primary mb-2" size={32} />
                <div className="fw-bold">3. Factura</div>
                <small className="text-muted">Documento legal</small>
              </div>
            </Col>
            <Col md={1} className="d-flex align-items-center justify-content-center">
              <TrendingUp className="text-muted" size={24} />
            </Col>
            <Col md={2}>
              <div className="p-2 bg-success bg-opacity-10 rounded">
                <CreditCard className="text-success mb-2" size={32} />
                <div className="fw-bold">4. Pagada</div>
                <small className="text-muted">Dinero recibido</small>
              </div>
            </Col>
          </Row>
          <div className="alert alert-info mt-3 mb-0">
            <strong>📌 Tip:</strong> Cuando una cotización se aprueba, haz clic en <strong>"Generar Factura"</strong> para crear la factura real. El Dashboard se actualizará automáticamente.
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
