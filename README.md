# Barber.PE - Frontend

Frontend profesional y moderno para gestión de barberías en Perú.

## 🚀 Instalación Rápida

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## 📝 Credenciales Demo

**Admin:**
- Email: casnad23@gmail.com
- Contraseña: (configurada en BD)
- Tenant: demo

## 🏗️ Estructura

```
src/
├── pages/           # Páginas principales
│   ├── LoginPage.tsx
│   ├── admin/       # Dashboard, Agenda, etc
│   ├── trabajador/  # Mi Agenda
│   └── cliente/     # Reservar
├── services/        # API client + servicios
│   ├── apiClient.ts (SIEMPRE usa X-Tenant-Subdomain)
│   ├── authService.ts
│   └── reservasService.ts
├── store/          # Zustand state
│   └── authStore.ts
├── styles/         # Tailwind global
└── App.tsx         # Routing
```

## 🔌 Backend

- URL: https://localhost:44355
- Tenant Header: `X-Tenant-Subdomain: demo`
- JWT en localStorage

## ✨ Características

✅ Login funcional (email + password)
✅ Roles: Admin, Trabajador, Cliente
✅ Protección de rutas por rol
✅ Integración real con backend
✅ UI Premium tipo Fresha
✅ Mobile-first responsive
✅ Framer Motion animations

## 🔐 Seguridad

- JWT tokens en localStorage
- Interceptor axios automático
- Logout en token expirado
- X-Tenant-Subdomain en cada request

## 🚧 TODO

- Agenda premium con calendario
- Flujo de reservas cliente
- Gestión de trabajadores/servicios
- Cierre de caja
- Reportes

## 📦 Deploy

```bash
npm run build
# Genera dist/ listo para hosting
```

---

**Barber.PE © 2026**
