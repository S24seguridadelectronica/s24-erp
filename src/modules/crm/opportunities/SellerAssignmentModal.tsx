import { useEffect, useState } from 'react';
import { Modal, Row, Col, Card, Badge, Spinner } from 'react-bootstrap';
import { supabase } from '@/services/supabase/client';
import { UserCircle2, CheckCircle2 } from 'lucide-react';

interface Seller {
  id: string;
  full_name: string;
  is_available: boolean;
}

interface Props {
  show: boolean;
  onHide: () => void;
  onSelectSeller: (sellerId: string, sellerName: string) => void;
}

export function SellerAssignmentModal({ show, onHide, onSelectSeller }: Props) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show) return;

    const fetchSellers = async () => {
      setLoading(true);
      try {
        // 1. Traemos todos los perfiles disponibles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, is_available')
          .eq('is_available', true);

        if (profilesError) throw profilesError;

        if (profiles && profiles.length > 0) {
          // 2. Traemos los roles por separado
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select(`
              user_id,
              roles (name)
            `);

          // 👇 SOLUCIÓN: Forzamos el tipo any para que TypeScript no se queje
          const safeRolesData = (rolesData as any[]) || [];
          const safeProfiles = (profiles as any[]) || [];

          // 3. Filtramos en JavaScript
          const filteredSellers = safeProfiles.filter((profile) => {
            const userRoles = safeRolesData.filter((r) => r.user_id === profile.id);
            const roleNames = userRoles.map((ur) => ur.roles?.name?.toLowerCase());
            
            // Mostramos a vendedores, técnicos o vendedores_campo
            return roleNames.some((r: string) => r === 'vendedor' || r === 'tecnico' || r === 'salesperson' || r === 'vendedor_campo');
          });

          setSellers(filteredSellers as Seller[]);
        } else {
          setSellers([]);
        }
      } catch (err) {
        console.error("Error cargando vendedores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Asignar Vendedor / Técnico</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-4">
          Selecciona un vendedor disponible. Se le creará una tarea automáticamente en su agenda.
        </p>

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : sellers.length === 0 ? (
          <div className="text-center text-muted py-5">
            <UserCircle2 size={40} className="mb-2" />
            <p>No hay vendedores disponibles en este momento.</p>
            <small>Ve a Configuración &gt; Usuarios y asegúrate de que tengan el rol de Vendedor y estén disponibles.</small>
          </div>
        ) : (
          <Row className="g-3">
            {sellers.map((seller) => (
              <Col md={6} key={seller.id}>
                <Card 
                  className="shadow-sm border-0 h-100 cursor-pointer hover-bg-light" 
                  onClick={() => onSelectSeller(seller.id, seller.full_name)}
                  style={{ cursor: 'pointer', transition: '0.2s', backgroundColor: '#f8f9fa' }}
                >
                  <Card.Body className="d-flex align-items-center gap-3">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3">
                      <UserCircle2 size={30} />
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-bold">{seller.full_name}</h6>
                      <Badge bg="success" className="d-flex align-items-center gap-1 w-auto" style={{ width: 'fit-content' }}>
                        <CheckCircle2 size={12} /> Disponible
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Modal.Body>
    </Modal>
  );
}