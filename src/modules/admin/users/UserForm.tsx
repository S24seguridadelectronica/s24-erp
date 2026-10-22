import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUser, updateUser, getRoles } from '@/services/api/users';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  full_name: z.string().min(3, 'Nombre completo es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().optional(),
  role_id: z.coerce.number().min(1, 'Selecciona un rol'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface UserFormProps {
  show: boolean;
  onHide: () => void;
  user?: any | null;
  onSuccess: () => void;
}

export function UserForm({ show, onHide, user, onSuccess }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      is_active: true,
      role_id: undefined
    }
  });

  useEffect(() => {
    if (show) {
      loadRoles();
      setCreatedPassword(null);
      setShowPassword(false);
      setShowCreatedPassword(false);
      
      // ✅ CORRECCIÓN: Resetear el formulario con los datos del usuario
      if (user) {
        reset({
          full_name: user.full_name || '',
          email: user.email || '',
          phone: user.phone || '',
          role_id: user.role_id || undefined,
          is_active: user.is_active !== undefined ? user.is_active : true,
          password: ''
        });
      } else {
        reset({
          is_active: true,
          role_id: undefined,
          full_name: '',
          email: '',
          phone: '',
          password: ''
        });
      }
    }
  }, [user, show, reset]);

  async function loadRoles() {
    try {
      const data = await getRoles();
      setRoles(data || []);
    } catch (err) { console.error(err); }
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setCreatedPassword(null);
    try {
      if (user?.id) {
        await updateUser(user.id, data);
        onSuccess();
        onHide();
      } else {
        const password = data.password || 'S24Temp2024!';
        await createUser({ ...data, password } as any);
        setCreatedPassword(password);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header closeButton>
          <Modal.Title>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {createdPassword && (
            <Alert variant="success">
              <h6>✅ Usuario creado exitosamente</h6>
              <p className="mb-1">
                <strong>Contraseña:</strong>{' '}
                <code style={{ fontSize: '16px', cursor: 'pointer' }} onClick={() => setShowCreatedPassword(!showCreatedPassword)}>
                  {showCreatedPassword ? createdPassword : '••••••••••'}
                </code>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                  className="ms-2 p-0"
                >
                  {showCreatedPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => navigator.clipboard.writeText(createdPassword)}
                  className="ms-1 p-0"
                  title="Copiar contraseña"
                >
                  📋
                </Button>
              </p>
              <small className="text-muted">Guarda esta contraseña, no podrás verla nuevamente.</small>
            </Alert>
          )}

          <Row className="g-3">
            <Col md={12}>
              <Form.Group><Form.Label htmlFor="full_name">Nombre Completo *</Form.Label>
                <Form.Control id="full_name" isInvalid={!!errors.full_name} {...register('full_name')} placeholder="Ej: Juan Pérez" />
                <Form.Control.Feedback type="invalid">{errors.full_name?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label htmlFor="email">Correo Electrónico *</Form.Label>
                <Form.Control id="email" type="email" isInvalid={!!errors.email} {...register('email')} placeholder="ejemplo@correo.com" />
                <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label htmlFor="phone">Teléfono</Form.Label>
                <Form.Control id="phone" {...register('phone')} placeholder="3001234567" />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label htmlFor="role_id">Rol *</Form.Label>
                <Form.Select id="role_id" isInvalid={!!errors.role_id} {...register('role_id')}>
                  <option value="">Selecciona un rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label || r.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.role_id?.message}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group><Form.Label htmlFor="is_active">Estado</Form.Label>
                <Form.Check id="is_active" type="switch" label="Usuario activo" {...register('is_active')} />
              </Form.Group>
            </Col>
            {!user && (
              <Col md={12}>
                <Form.Group>
                  <Form.Label htmlFor="password">Contraseña {createdPassword ? '' : '(opcional)'}</Form.Label>
                  <InputGroup>
                    <Form.Control 
                      id="password"
                      type={showPassword ? 'text' : 'password'} 
                      {...register('password')} 
                      placeholder={createdPassword ? 'Ya fue creada' : 'Mínimo 6 caracteres'}
                      disabled={!!createdPassword}
                      isInvalid={!!errors.password}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                      disabled={!!createdPassword}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                    <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    {createdPassword 
                      ? 'Contraseña ya establecida' 
                      : 'Si no ingresas una, se usará: S24Temp2024!'}
                  </Form.Text>
                </Form.Group>
              </Col>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            {createdPassword ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!createdPassword && (
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <><Spinner animation="border" size="sm" className="me-2" /> Guardando...</> : 'Guardar Usuario'}
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

