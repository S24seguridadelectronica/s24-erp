# Informe de revisión — Proyecto S24 ERP (s24-qwen)

**Fecha:** 2026-11-16 · **Ámbito:** revisión completa del códigobase (no de un documento de diseño; no existe un `TargetFile` de diseño en el repo, se revisó el proyecto directamente en modo "direct dispatch" sin subagentes).

---

## 1. Estructura del proyecto

**Stack:** React 19 + TypeScript + Vite · Supabase (PostgreSQL + Auth + Storage) · React-Bootstrap · React Hook Form + Zod · Zustand · React Query (instalado pero sin uso real) · Capacitor 6 (APK Android) · despliegue en GitHub Pages.

```
s24-qwen/
├── src/
│   ├── app/            router (hash router), guards, providers
│   ├── components/     layout (MainLayout, Sidebar, Header)
│   ├── hooks/          useAuth (Context), usePermissions
│   ├── modules/        dashboard, crm, sales/quotes, operations,
│   │                   inventory, finance, reports, admin, tools
│   ├── services/
│   │   ├── api/        ~20 archivos: quotes, work-orders, inventory,
│   │   │               users, import, pdf/catalog, storage, email…
│   │   └── supabase/   client.ts
│   ├── types/          database.ts (tipos generados de Supabase)
│   └── utils/          image, quotePhotos, constants
├── supabase/migrations/   6 migraciones SQL numeradas
├── android/               proyecto Capacitor (incluye build committed)
├── ---
name: frontend-ui-polishing
description: Audita y mejora la interfaz de usuario (UI), experiencia de usuario (UX) y diseño responsivo de componentes en React, TypeScript y Tailwind o React-Bootstrap.
---

# Objetivo
Actúa como un Diseñador UI/UX Senior y Frontend Expert. Tu objetivo es revisar el archivo de componentes asignado y refactorizar su código para que luzca moderno, limpio, intuitivo y profesional, manteniendo la tipación estricta en TypeScript y asegurando una perfecta adaptación en móviles y escritorios.

# Criterios de Mejora Visual
1. **Jerarquía Visual y Espaciado:** Uso correcto de padding, margenes y tarjetas limpias.
2. **Feedback Visual:** Estados claros de carga (loading), botones deshabilitados, validaciones de errores amigables y alertas visuales.
3. **Consistencia de Estilos:** Asegurar que los inputs, botones y tablas sigan el mismo lenguaje de diseño del resto del ERP.
4. **Accesibilidad y Legibilidad:** Contraste adecuado de textos y tamaños responsivos.t/skills/       skills EGM (bootstrap, brainstorm, draft, review…)
├── backup-*/              2 carpetas de respaldo manual dentro del repo
└── README.md
```

**Patrón dominante:** módulos por dominio de negocio, cada página con su propio fetch a Supabase. La capa `services/api` centraliza las consultas, pero muchas páginas llaman directamente a `supabase.from(...)` saltándose esa capa (QuotesPage, DashboardPage, QuoteForm, MyTasksPage, CustomersPage, etc.).

**Tamaño:** ~108 archivos TS/TSX/SQL, ~1 MB de código fuente.

---

## 2. Puntos fuertes

1. **Estructura por módulos clara y predecible.** Cada dominio (CRM, ventas, operaciones, inventario, finanzas, admin) tiene su carpeta, sus rutas y su capa de servicios. Un desarrollador nuevo puede ubicar cualquier pantalla en segundos.
2. **Esquema de base de datos sólido y versionado.** 6 migraciones ordenadas, con constraints (`CHECK` en enums, claves foráneas con `ON DELETE CASCADE`), tablas de auditoría (`audit_logs` con old/new JSONB), y RLS habilitado en todas las tablas desde la migración inicial. Es más disciplina de la habitual en proyectos de este tamaño.
3. **El motor de cotización (`calcular-servicios`) es la mejor parte del código.** Funciones puras separadas de la UI (`calc.ts` sin React), catálogo tipado, desglose de auditoría por línea (`meta` con categoría, topes, excedentes), y comentarios que explican *por qué* (el tope de mano de obra, el cableado fuera del tope). Se refactorizó desde un monolito de ~5.000 líneas y la separación quedó bien hecha: types, catalog, calc, draft, savedStore, UI.
4. **Manejo defensivo de entornos hostiles.** Fallbacks para `crypto.randomUUID` en WebViews antiguos, control de cuota de localStorage (4 MB, reintento sin fotos), detección runtime de columnas faltantes en Supabase (`supportsPhotosColumn`), migración gradual base64 → Storage sin romper datos antiguos. Indica iteración real contra dispositivos y datos reales.
5. **Validación en formularios clave.** QuoteForm usa Zod + React Hook Form correctamente.
6. **Multiplataforma real.** Web (GH Pages) + Android (Capacitor) con el mismo código, y detalles de UX para campo (cámara, borradores offline en localStorage).

---

## 3. Puntos débiles, riesgos y deuda técnica

### Seguridad (lo más grave)

- **🔴 RLS casi inoperante para escritura.** Las políticas de `work_order_photos` y varias de `pdf_import_*` son `USING (true)` / `WITH CHECK (true)` para cualquier usuario autenticado. Cualquier vendedor puede borrar fotos de cualquier orden de trabajo y modificar lotes de importación de otros. Lo mismo para `products` (INSERT/UPDATE/DELETE a cualquier autenticado en la migración 006).
- **🔴 El rol se decide en el cliente.** `RoleGuard` y el dashboard consultan `user_roles` desde el navegador. Con RLS permisivo, un usuario malintencionado puede otorgarse el rol admin escribiendo directamente a la tabla, o llamar a las APIs con cualquier rol. La autorización debe ser una función/consulta RPC con `SECURITY DEFINER` y políticas por rol en el servidor; el guard del frontend es solo UX.
- **🔴 Contraseña por defecto hardcodeada:** `UserForm.tsx:90` usa `'S24Temp2024!'` como password inicial de usuarios creados. Está en el bundle público de la app web.
- **🔴 `isAdmin = user.email === 's24hseguridad@gmail.com'`** en DashboardPage: dato de negocio en código, y puerta trasera de facto.
- **🟡 La tabla `user_roles` tiene política de escritura ambigua o inexistente en las migraciones revisadas**; conviene verificarla expresamente.

### Tipado y calidad de código

- **🔴 `as any` sistémico:** más de 66 ocurrencias. El patrón `(supabase.from('x') as any)` anula el tipado generado en `types/database.ts` en casi toda la capa de datos. Esto significa que cambios de esquema no los detecta el compilador: los errores aparecen en producción. Causa típica: `database.ts` desactualizado respecto al esquema real. Regenerarlo y quitar los casts es la deuda más rentable de todo el proyecto.
- **🟡 `any` en firmas públicas** (`createQuote(quote: any, items: any[])`, `order: any` en work-orders). Los contratos entre módulos no existen.
- **🟡 React Query instalado pero sin usar:** `providers.tsx` monta el `QueryClientProvider` y nadie usa `useQuery`/`useMutation`. Todo el fetching es `useEffect` + `useState` manual, sin caché, sin reintentos, sin invalidación. O se adopta o se desinstala.
- **🟡 Sin tests.** Ni unit ni E2E. El motor de cálculo (`calc.ts`) es puro y fácil de testear — es el candidato obvio para el primer suite.
- **🟡 `console.log` de depuración en producción** (DashboardPage, RoleGuard, emailService) incluyendo datos sensibles (emails, facturas).
- **🟡 Lógica de negocio duplicada:** la consulta de rol del usuario está repetida al menos 6 veces (RoleGuard, router, Sidebar, DashboardPage, QuoteForm, OpportunitiesPage, CustomersPage) con variantes distintas de parseo. Debería vivir en un `useUserRole()` único.
- **🟡 Detectar permisos consultando la BD en cada render** (Sidebar, router, dashboard) genera múltiples queries idénticas por sesión y latencia en móvil.

### Arquitectura

- **🟡 Falta de frontera entre módulos:** páginas escriben a tablas de otros módulos directamente (QuoteForm crea work orders; OpportunityForm crea tasks). Sin contratos, mover un módulo rompe otros silenciosamente.
- **🟡 Respaldo manual dentro del repo:** `backup-calcular-20261107-183443/` y `backup-responsive-20261027-183347/` (con un monolito pre-split de ~5.000 líneas) están versionados. Git ya es el historial; estas carpetas contaminan búsquedas y builds.
- **🟡 `android/app/src/main/assets/public/` con el bundle compilado committeado.** Debe estar en `.gitignore`; cada build genera diffs enormes.
- **🟡 Duplicación de roles en el código vs. BD:** el código conoce `admin`, `admin_super`, `administrador`, `preventa`, `salesperson`, `vendedor`, `cobrador`, `cerrador`… la BD define `admin_super`, `admin_ops`, `sales_supervisor`, `tech_coordinator`, `technician`, etc. Dos vocabularios que no coinciden; la asignación de rutas depende de strings sueltos.

### Operación

- **🟡 Despliegue a GitHub Pages para un ERP** con datos de clientes, cotizaciones y facturas. Funciona, pero no hay control de entorno (staging/prod), ni monitoreo, ni rollbacks rápidos. Supabase queda expuesto con la anon key y políticas laxas — el riesgo real son esas políticas, no la key, pero la combinación actual es delicada.
- **🟢 Migración 002, 003… numeradas pero con la 004 después de la 003** sin problema real, solo nota de orden.

---

## 4. Viabilidad y escalabilidad

**Viabilidad como producto interno: alta.** El sistema funciona, cubre el ciclo cotización → factura → orden de trabajo → cobro, tiene móvil de campo con borradores offline, y la base de datos está bien diseñada. Para una empresa de seguridad electrónica de tamaño pequeño/medio, esto es utilizable hoy.

**Escalabilidad: limitada, y el cuello de botella no es el stack sino la falta de autorización en servidor y el tipado ausente.**

- **Escala de usuarios (10–50):** sostiene. Las pantallas cargan todo el conjunto con queries sin paginación (`getCustomers`, `getProducts`, `checkDuplicates` con `limit(10000)`); con miles de registros el dashboard y las páginas de listado se degradarán visiblemente, sobre todo en el APK.
- **Escala de equipo de desarrollo:** es el punto débil. Sin tipos reales en la capa de datos ni tests, cada cambio de esquema es una búsqueda manual de `as any` y una prueba manual de pantallas. Crece linealmente el costo de cada feature; el monolito `CalcularServicios` ya se partió una vez por ese motivo y la capa de datos puede necesitar lo mismo.
- **Escala de confianza (lo crítico):** no es apto para exponer a terceros o abrir más roles hasta que la autorización viva en el servidor. Hoy el modelo de amenaza depende de que todos los usuarios se porten bien.

### Orden de remediación recomendado

1. **🔴 Regenerar `types/database.ts` y eliminar los casts `as any`** (deuda más rentable, habilita detectar los demás errores).
2. **🔴 Mover la autorización al servidor:** RPC `get_my_role()` con `SECURITY DEFINER`, políticas RLS por rol, `user_roles` solo editable por admin_super. Eliminar el hardcode del email y la contraseña por defecto.
3. **🔴 Endurecer políticas `USING (true)`** en `work_order_photos`, `pdf_import_*`, `products`.
4. **🟡 Consolidar `useUserRole()`** en un hook único con caché.
5. **🟡 Tests del motor `calc.ts`** (es puro; un día de trabajo cubre el riesgo de negocio más alto).
6. **🟡 Adoptar o quitar React Query**; paginar listados.
7. **🟢 Limpiar repo:** eliminar carpetas `backup-*` y el build de Android versionado; retirar `console.log`.

---

*Nota de método: la skill `egm-review` exige subagentes Goldfish, no disponibles en este entorno; se ejecutó en modo "direct dispatch" (etapas en secuencia, un solo revisor). No se encontró documento de diseño en el repo, por lo que el análisis se hizo directamente sobre el código.*
