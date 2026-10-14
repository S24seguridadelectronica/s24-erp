import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Mail, Lock, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import './LoginPage.css'

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <Card className="login-card">
          <Card.Body>
            <div className="login-header">
              <div className="logo-wrapper"><Shield size={48} color="#ffc107" /></div>
              <h1>S24</h1>
              <p>Seguridad Electrónica</p>
            </div>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit(onSubmit)} className="login-form">
              <Form.Group className="mb-3">
                <Form.Label>Correo electrónico</Form.Label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <Form.Control type="email" placeholder="tu@correo.com" isInvalid={!!errors.email} {...register('email')} />
                </div>
                {errors.email && <Form.Text className="text-danger">{errors.email.message}</Form.Text>}
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>Contraseña</Form.Label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <Form.Control type="password" placeholder="••••••••" isInvalid={!!errors.password} {...register('password')} />
                </div>
                {errors.password && <Form.Text className="text-danger">{errors.password.message}</Form.Text>}
              </Form.Group>
              <Button type="submit" className="login-btn" disabled={loading}>
                {loading ? <><Loader2 size={18} className="spinner" /> Ingresando...</> : 'Iniciar Sesión'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}