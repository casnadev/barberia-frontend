// GUÍA: INTEGRACIÓN DE LANDING TIPO FRESHA A BARBER.PE

## PASO 1: AGREGAR RUTAS EN App.tsx

En `/src/App.tsx`, en la sección de rutas, agrega ANTES del login:

```tsx
import { PublicSedeDetailPage } from '@/pages/PublicSedeDetailPage'
import { LandingPage } from '@/pages/LandingPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============ RUTAS PÚBLICAS (SIN LOGIN) ============ */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sede/:idSede" element={<PublicSedeDetailPage />} />
        <Route path="/reservar/:idSede?" element={<ReservaPublicaPage />} />
        
        {/* ============ RESTO DE RUTAS ============ */}
        <Route path="/login" element={<LoginPage />} />
        {/* ... resto */}
      </Routes>
    </BrowserRouter>
  )
}
```

## PASO 2: EXTENDER sedesService.ts

En `/src/services/sedesService.ts`, agrega estos métodos:

```typescript
import { apiClient } from './apiClient'

export const sedesService = {
  // ... métodos existentes ...

  // MÉTODOS NUEVOS PARA LANDING PÚBLICA
  
  /** Obtener info pública de una sede (sin login) */
  obtenerSedePublica: async (idSede: number) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/public/sedes/${idSede}`,
        {
          headers: {
            'X-Tenant-Subdomain': localStorage.getItem('tenantSubdomain') || 'default'
          }
        }
      )
      return res.json()
    } catch (error) {
      console.error('Error obteniendo sede:', error)
      throw error
    }
  },

  /** Obtener servicios públicos de una sede */
  obtenerServiciosPublicos: async (idSede: number) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/public/sedes/${idSede}/servicios`,
        {
          headers: {
            'X-Tenant-Subdomain': localStorage.getItem('tenantSubdomain') || 'default'
          }
        }
      )
      return res.json()
    } catch (error) {
      console.error('Error obteniendo servicios:', error)
      throw error
    }
  },

  /** Obtener trabajadores públicos de una sede */
  obtenerTrabajadoresPublicos: async (idSede: number) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/public/sedes/${idSede}/trabajadores`,
        {
          headers: {
            'X-Tenant-Subdomain': localStorage.getItem('tenantSubdomain') || 'default'
          }
        }
      )
      return res.json()
    } catch (error) {
      console.error('Error obteniendo trabajadores:', error)
      throw error
    }
  },

  /** Obtener reseñas públicas de una sede */
  obtenerResenasPublicas: async (idSede: number) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/public/sedes/${idSede}/resenas`,
        {
          headers: {
            'X-Tenant-Subdomain': localStorage.getItem('tenantSubdomain') || 'default'
          }
        }
      )
      return res.json()
    } catch (error) {
      console.error('Error obteniendo reseñas:', error)
      throw error
    }
  },
}
```

## PASO 3: CREAR LandingPage (Búsqueda de sedes)

Crea `/src/pages/LandingPage.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import styles from '@/styles/Landing.module.css'
import { sedesService } from '@/services/sedesService'

export function LandingPage() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!busqueda.trim()) return

    setBuscando(true)
    try {
      // Aquí irá la búsqueda desde el backend
      // Por ahora es placeholder
      const resultados = await fetch(
        `/api/public/sedes/buscar?q=${encodeURIComponent(busqueda)}`
      ).then(r => r.json()).catch(() => [])
      setSedes(resultados)
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* HERO */}
      <motion.div 
        className={styles.hero}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Barber.PE
          </h1>
          <p className={styles.subtitle}>
            Encuentra y reserva tu barbería favorita
          </p>

          <form onSubmit={handleBuscar} className={styles.searchForm}>
            <div className={styles.searchInput}>
              <Search className="w-5 h-5" />
              <input
                type="text"
                placeholder="¿Dónde quieres tu corte?"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className={styles.input}
              />
            </div>
            <button type="submit" disabled={buscando} className={styles.searchButton}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>
      </motion.div>

      {/* RESULTADOS */}
      {sedes.length > 0 && (
        <div className={styles.results}>
          <h2 className={styles.resultsTitle}>
            {sedes.length} barbería{sedes.length > 1 ? 's' : ''} encontrada{sedes.length > 1 ? 's' : ''}
          </h2>

          <div className={styles.sedesGrid}>
            {sedes.map((sede: any) => (
              <motion.div
                key={sede.idSede}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/sede/${sede.idSede}`)}
                className={styles.sedeCard}
              >
                <div className={styles.sedeImage}>
                  <img src={sede.foto} alt={sede.nombre} />
                </div>

                <div className={styles.sedeContent}>
                  <h3 className={styles.sedeName}>{sede.nombre}</h3>

                  <div className={styles.sedeRating}>
                    <div className={styles.stars}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(sede.ratingPromedio)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={styles.ratingValue}>
                      {sede.ratingPromedio.toFixed(1)} ({sede.totalResenas})
                    </span>
                  </div>

                  <p className={styles.sedeAddress}>
                    <MapPin className="w-4 h-4" />
                    {sede.direccion}
                  </p>

                  <button className={styles.sedeButton}>
                    Ver detalles →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* INFO SECTIONS */}
      <div className={styles.infoSections}>
        <div className={styles.infoSection}>
          <div className={styles.infoIcon}>✨</div>
          <h3>Fácil de usar</h3>
          <p>Busca, elige y reserva en minutos</p>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoIcon}>⭐</div>
          <h3>Reseñas reales</h3>
          <p>Conoce la experiencia de otros clientes</p>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoIcon}>⏰</div>
          <h3>Siempre disponible</h3>
          <p>Reserva 24/7 desde tu teléfono</p>
        </div>
      </div>
    </div>
  )
}
```

## PASO 4: CREAR ESTILOS PARA LandingPage

Crea `/src/styles/Landing.module.css`:

```css
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: white;
  display: flex;
  flex-direction: column;
}

.hero {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 500px;
}

.heroContent {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.title {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f97316, #ea580c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2.5rem;
}

.searchForm {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.searchInput {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem;
  background: white;
  border-radius: 0.5rem;
  color: #666;
}

.input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  padding: 1rem 0;
  font-size: 1rem;
}

.searchButton {
  padding: 1rem 2rem;
  background: #f97316;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms ease;
}

.searchButton:hover {
  background: #ea580c;
  transform: translateY(-2px);
}

.results {
  padding: 4rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.resultsTitle {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: white;
}

.sedesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.sedeCard {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 200ms ease;
  color: #1a1a1a;
}

.sedeCard:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
}

.sedeImage {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f0f0f0;
}

.sedeImage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 200ms ease;
}

.sedeCard:hover .sedeImage img {
  transform: scale(1.05);
}

.sedeContent {
  padding: 1.5rem;
}

.sedeName {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.sedeRating {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stars {
  display: flex;
  gap: 0.25rem;
}

.ratingValue {
  font-size: 0.875rem;
  color: #666;
}

.sedeAddress {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1.5rem;
}

.sedeButton {
  width: 100%;
  padding: 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.sedeButton:hover {
  background: #1d4ed8;
}

.infoSections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 4rem 2rem;
  background: rgba(0, 0, 0, 0.5);
}

.infoSection {
  text-align: center;
}

.infoIcon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.infoSection h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.infoSection p {
  color: rgba(255, 255, 255, 0.7);
}
```

## PASO 5: ENDPOINTS QUE FALTA CREAR EN BACKEND

En `Controllers/PublicController.cs` (NUEVO):

```csharp
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    [HttpGet("sedes/{idSede}")]
    public async Task<IActionResult> ObtenerSedePublica(int idSede, CancellationToken ct)
    {
        // Obtener sede sin login
    }

    [HttpGet("sedes/{idSede}/servicios")]
    public async Task<IActionResult> ObtenerServiciosPublicos(int idSede, CancellationToken ct)
    {
        // Obtener servicios sin login
    }

    [HttpGet("sedes/{idSede}/trabajadores")]
    public async Task<IActionResult> ObtenerTrabajadoresPublicos(int idSede, CancellationToken ct)
    {
        // Obtener trabajadores sin login
    }

    [HttpGet("sedes/{idSede}/resenas")]
    public async Task<IActionResult> ObtenerResenasPublicas(int idSede, CancellationToken ct)
    {
        // Obtener reseñas sin login
    }

    [HttpGet("sedes/buscar")]
    public async Task<IActionResult> BuscarSedes([FromQuery] string q, CancellationToken ct)
    {
        // Buscar sedes por nombre/ubicación
    }
}
```

## PASO 6: CAMBIOS EN ReservaClientePage.tsx

La página actual CASI no necesita cambios. Solo:
1. Quita el `requireAuth` si lo tiene
2. Lee `idSede` del URL: `const { idSede } = useParams()`
3. Carga servicios/trabajadores de ese `idSede` específico

## PASO 7: CREAR LoginClientePage.tsx

Ver documento anterior - LoginClientePage con OTP.

## RESUMEN: QUÉ AGREGAR

✅ PublicSedeDetailPage.tsx (YA CREADO)
✅ PublicSedeDetail.module.css (YA CREADO)
⬜ LandingPage.tsx (crear con pasos arriba)
⬜ Landing.module.css (crear con pasos arriba)
⬜ Extender sedesService.ts (ver paso 2)
⬜ Actualizar App.tsx routes (ver paso 1)
⬜ Crear PublicController en backend
⬜ Crear LoginClientePage.tsx
⬜ Crear LoginCliente.module.css

## RESULTADO FINAL

Cuando termines, tendrás:

/ → LandingPage (búsqueda de barberías)
  ↓
/sede/{idSede} → PublicSedeDetailPage (INFO TIPO FRESHA)
  ↓
/reservar/{idSede} → ReservaPublicaPage (FLUJO ACTUAL - SIN LOGIN)
  ↓
Confirmación por WhatsApp (SIN LOGIN REQUERIDO)

Cliente después puede:
/login-cliente → Loguear con OTP
  ↓
/mi-reservas → Ver sus citas

100% FLUIDO, 100% PÚBLICO, 0 FRICCIÓN.
