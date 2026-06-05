# 🚀 BARBER.PE FRONTEND - SETUP COMPLETO

## 📋 Requisitos Previos

- ✅ Node.js 18+ instalado
- ✅ Backend corriendo (Swagger en https://localhost:44302)
- ✅ npm o yarn disponible

---

## 🎯 INSTALACIÓN RÁPIDA

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Configurar variables de entorno
El archivo `.env` ya viene configurado con los valores por defecto:
```
VITE_API_BASE_URL=https://localhost:44302
VITE_TENANT=demo
```

**Si tu backend está en otro puerto, edita `.env`:**
```
VITE_API_BASE_URL=https://localhost:TU_PUERTO
```

### Paso 3: Ejecutar en desarrollo
```bash
npm run dev
```

### Paso 4: Acceder a la app
Abre tu navegador en: **http://localhost:5173**

---

## 🔑 Credenciales de Prueba

**Email:** casnad23@gmail.com  
**Password:** (Completa en el formulario)

---

## 📁 Estructura del Proyecto

```
barber-pe-fixed/
├── src/
│   ├── pages/              # Páginas principales
│   ├── components/         # Componentes reutilizables
│   ├── services/           # APIs y servicios
│   ├── store/              # Estado global (Zustand)
│   ├── styles/             # Estilos globales
│   ├── types/              # Tipos TypeScript
│   ├── App.tsx            # Componente raíz
│   └── main.tsx           # Punto de entrada
├── .env                    # Variables de entorno ✅ IMPORTANTE
├── .env.example           # Template de env
├── package.json           # Dependencias
└── README.md             # Este archivo
```

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo (con hot reload)
npm run dev

# Build para producción
npm build

# Preview del build
npm preview

# Linter
npm lint
```

---

## ⚙️ Configuración del Backend

### URL de API
- **Desarrollo:** https://localhost:44302
- **Producción:** https://api.barber.pe/api (editar en `.env`)

### Headers Automáticos
El frontend envía automáticamente:
- `Authorization: Bearer {token}`
- `X-Tenant-Subdomain: demo`

---

## 🔍 Troubleshooting

### ❌ Pantalla blanca en startup
**Solución:** Asegurate de que:
1. ✅ `npm install` completó sin errores
2. ✅ Archivo `.env` existe
3. ✅ Backend está corriendo
4. ✅ Abre DevTools (F12) y revisa la consola

### ❌ Error de conexión al API
**Solución:** 
1. Verifica que el backend esté corriendo
2. Abre el Swagger: https://localhost:44302/swagger
3. Actualiza `VITE_API_BASE_URL` en `.env`
4. Reinicia el servidor: `npm run dev`

### ❌ Error 401 Unauthorized
**Solución:**
1. Limpia localStorage en DevTools
2. Inicia sesión nuevamente
3. Verifica credenciales en el backend

### ❌ CORS Error
**Solución:**
1. Backend debe permitir CORS desde http://localhost:5173
2. En desarrollo, HTTPS localhost puede causar issues
3. Cambiar a HTTP en `.env` si es necesario

---

## 🎨 Personalización

### Cambiar colores (Tailwind)
Editar: `tailwind.config.ts`
```typescript
colors: {
  'barber-dark': '#0f172a',
  'barber-card': '#1e293b',
  'barber-border': '#334155',
  'barber-accent': '#8b5cf6',
}
```

### Agregar nueva página
1. Crear archivo en `src/pages/`
2. Importar en `src/App.tsx`
3. Agregar ruta

### Agregar nuevo componente
1. Crear archivo en `src/components/`
2. Exportar componente
3. Importar donde sea necesario

---

## 📊 Tech Stack

- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build tool (súper rápido ⚡)
- **Tailwind CSS** - Utility-first CSS
- **React Router v7** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **Sonner** - Toast notifications
- **Lucide React** - Icons

---

## 📦 Dependencias Principales

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.7",
  "@tanstack/react-query": "^5.28.0",
  "axios": "^1.6.2",
  "framer-motion": "^10.16.12",
  "lucide-react": "^0.294.0",
  "sonner": "^1.2.0"
}
```

---

## 🚀 Deploying a Producción

### Build
```bash
npm run build
```

Esto crea carpeta `dist/` lista para deploy.

### Variables de Entorno
Editar `.env` antes de build:
```
VITE_API_BASE_URL=https://api.barber.pe/api
VITE_TENANT=production
```

### Opciones de hosting
- ✅ Vercel (recomendado para React)
- ✅ Netlify
- ✅ Azure Static Web Apps
- ✅ AWS S3 + CloudFront
- ✅ Servidor propio (Nginx)

---

## 💡 Tips & Tricks

### DevTools útiles
- Instalá React DevTools extension
- Redux DevTools para debugging del estado

### Performance
- Usa `React.memo` para componentes costosos
- Lazy load páginas con `React.lazy()`
- Monitorea bundle size con `npm run build`

### Debugging
- `console.log()` en cualquier lado
- DevTools > Network para ver requests
- DevTools > Application para localStorage

---

## 📞 Soporte

Si tienes problemas:
1. Abre DevTools (F12)
2. Copia errores de consola
3. Verifica que el backend esté corriendo
4. Revisa la sección Troubleshooting arriba

---

## 📝 Notas Importantes

✅ **Este proyecto ya tiene:**
- Authenticación completa
- Rutas protegidas por rol
- Variables de entorno configuradas
- Estilos Tailwind
- State management con Zustand
- Error handling mejorado

⚠️ **Recuerda:**
- No commitear `.env` a Git
- Cambiar credenciales de demo antes de producción
- Backend debe tener CORS habilitado
- HTTPS en localhost requiere certificado válido

---

## 🎉 ¡Listo para Desarrollar!

El proyecto está completamente configurado y listo para usar.

Para cualquier duda, revisa:
- `src/App.tsx` - Estructura de rutas
- `src/services/` - Servicios de API
- `src/store/` - Estado global
- `package.json` - Dependencias disponibles

**¡Que disfrutes! 🚀**

---

**Última actualización:** 22 de Mayo de 2026  
**Versión:** 2.0 - Lista para Producción
