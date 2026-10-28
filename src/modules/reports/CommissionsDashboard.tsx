import { useEffect, useState } from 'react';
import { Card, Table, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, TrendingUp, Users, Target, Calculator } from 'lucide-react';

// 💰 CONFIGURACIÓN DE COMISIONES
// Porcentaje de la UTILIDAD que se destina a pagar comisiones
const COMMISSION_POOL_RATE = 0.30; // Ejemplo: Del 100% de la ganancia, destinamos el 30% a comisiones
const COBRADOR_RATE = 0.02;        // Cobrador gana 2% del recaudo

export function CommissionsDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchCommissions();
  }, [profile]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await (supabase.from('user_roles') as any)
        .select('roles(name)').eq('user_id', user.id).maybeSingle();
      const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';
      setUserRole(roleName);

      const { data: summaryData, error } = await (supabase.from('v_commissions_summary') as any).select('*');
      if (error) throw error;

      if (roleName !== 'admin' && roleName !== 'admin_super' && roleName !== 'administrador') {
        setData(summaryData.filter((d: any) => d.user_id === user.id));
      } else {
        setData(summaryData.filter((d: any) => d.role_name !== null));
      }
    } catch (error) {
      console.error("Error cargando comisiones:", error);
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (val: number) => '$' + Math.round(val || 0).toLocaleString('es-CO');

  // Cálculos para las tarjetas superiores (Sumamos todos los empleados)
  let totalVentas = 0;
  let totalCostos = 0;
  let totalUtilidad = 0;
  let totalComisionesPagadas = 0;

  data.forEach(item => {
    // Para el admin, sumamos los totales que devuelve la vista
    if (item.role_name === 'admin' || item.role_name === 'admin_super') {
      totalVentas = item.total_gross_sale;
      totalCostos = item.total_cost;
      totalUtilidad = item.total_net_profit;
    }

    // Cálculo de comisiones por empleado (usando la utilidad neta)
    const comPrev = (item.preventa_alone_profit * COMMISSION_POOL_RATE * 0.50) + (item.preventa_shared_profit * COMMISSION_POOL_RATE * 0.25);
    const comVend = (item.vendedor_alone_profit * COMMISSION_POOL_RATE * 0.50) + (item.vendedor_shared_profit * COMMISSION_POOL_RATE * 0.25);
    const comCobr = item.collected_value * COBRADOR_RATE;

    totalComisionesPagadas += (comPrev + comVend + comCobr);
  });

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="fw-bold m-0"><TrendingUp className="me-2" /> Dashboard de Comisiones (Sobre Utilidad)</h2>
        <p className="text-muted">La comisión se calcula descontando materiales, equipos y mano de obra.</p>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-light">
            <Card.Body>
              <h6 className="text-muted fw-bold"><DollarSign size={16} className="me-1"/> Ventas Brutas</h6>
              <h4 className="fw-bold text-dark mb-0">{fmtMoney(totalVentas)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
            <Card.Body>
              <h6 className="text-muted fw-bold"><Calculator size={16} className="me-1"/> Costos (Equipos/MO)</h6>
              <h4 className="fw-bold text-danger mb-0">- {fmtMoney(totalCostos)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-success bg-opacity-10">
            <Card.Body>
              <h6 className="text-muted fw-bold"><Target size={16} className="me-1"/> Utilidad Real</h6>
              <h4 className="fw-bold text-success mb-0">{fmtMoney(totalUtilidad)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm bg-warning bg-opacity-25">
            <Card.Body>
              <h6 className="text-muted fw-bold"><Users size={16} className="me-1"/> Comisiones a Pagar</h6>
              <h4 className="fw-bold text-dark mb-0">{fmtMoney(totalComisionesPagadas)}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* TABLA DE RENDIMIENTO */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Empleado</th>
                <th>Rol</th>
                <th>Utilidad Generada</th>
                <th>Recaudo (Cobrador)</th>
                <th className="text-end pe-4">Comisión a Pagar</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5 text-muted">No hay datos de comisiones aún.</td></tr>
              ) : (
                data.map((item) => {
                  let comisionTotal = 0;
                  let utilidadGenerada = 0;

                  if (item.role_name === 'preventa') {
                    const comSolo = item.preventa_alone_profit * COMMISSION_POOL_RATE * 0.50;
                    const comCompartida = item.preventa_shared_profit * COMMISSION_POOL_RATE * 0.25;
                    comisionTotal = comSolo + comCompartida;
                    utilidadGenerada = item.preventa_alone_profit + item.preventa_shared_profit;
                  } 
                  
                  if (item.role_name === 'vendedor_campo') {
                    const comSolo = item.vendedor_alone_profit * COMMISSION_POOL_RATE * 0.50;
                    const comCompartida = item.vendedor_shared_profit * COMMISSION_POOL_RATE * 0.25;
                    comisionTotal = comSolo + comCompartida;
                    utilidadGenerada = item.vendedor_alone_profit + item.vendedor_shared_profit;
                  } 
                  
                  if (item.role_name === 'cobrador' || item.role_name === 'cobrador_campo') {
                    comisionTotal = item.collected_value * COBRADOR_RATE;
                  }

                  return (
                    <tr key={item.user_id}>
                      <td className="ps-4 fw-bold">{item.full_name}</td>
                      <td><Badge bg="secondary">{item.role_name.toUpperCase()}</Badge></td>
                      <td className="text-success fw-bold">{fmtMoney(utilidadGenerada)}</td>
                      <td className="text-primary fw-bold">{fmtMoney(item.collected_value)}</td>
                      <td className="text-end pe-4">
                        <h5 className="fw-bold text-dark mb-0">{fmtMoney(comisionTotal)}</h5>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}