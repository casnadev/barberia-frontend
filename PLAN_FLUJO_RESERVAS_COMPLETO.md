# 🎯 PLAN EJECUTABLE: FLUJO DE RESERVAS 100% FUNCIONAL

## QUE YA TIENES HECHO ✅

```
BACKEND:
✅ ReservaService.cs - Crear reserva (Pendiente)
✅ Twilio WhatsApp - Envía mensaje
✅ Resend Email - Envía confirmación
✅ Validaciones completas
✅ SlotCalculator - Calcula disponibilidad
✅ Token generation - Genera código único

FRONTEND:
✅ ReservaClientePage.tsx - 4 pasos (Servicio → Barbero → Fecha → Confirmación)
✅ PublicSedeDetailPage.tsx - Landing tipo Fresha
✅ Flujo visual perfecto
```

---

## QUE FALTA (MÍNIMO PARA 100% FUNCIONAL)

### **PRIORIDAD 1: Confirmar reserva con Token (Día 1-2)**

**Backend Endpoints:**
```csharp
// 1. Confirmar con token (cliente clickea botón en WhatsApp)
[HttpPost("api/reservas/confirmar-token")]
public async Task<IActionResult> ConfirmarConToken([FromBody] ConfirmarTokenRequest req)
{
    // req.Token = "ABC123XYZ"
    // Busca reserva por token
    // Actualiza Estado: Pendiente → Confirmada
    // Envía WhatsApp: "Cita confirmada!"
    // Retorna: { success: true, message: "..." }
}

// 2. Cancelar con token (cliente clickea cancelar)
[HttpPost("api/reservas/cancelar-token")]
public async Task<IActionResult> CancelarConToken([FromBody] CancelarTokenRequest req)
{
    // Busca reserva por token
    // Actualiza Estado: Pendiente → Cancelada
    // Envía WhatsApp: "Cita cancelada"
    // Retorna: { success: true }
}
```

**Frontend:**
```typescript
// Nueva página: /confirmar-reserva/:token
// GET /api/reservas/confirmar-token?token=ABC123XYZ
// Muestra resumen de reserva
// Botones: [CONFIRMAR] [CANCELAR]
// POST /api/reservas/confirmar-token → Éxito
```

**Tiempo:** 2 días

---

### **PRIORIDAD 2: Dashboard Admin - Próximas Reservas (Día 3-4)**

**Backend Endpoints:**
```csharp
// 1. Obtener próximas reservas del día
[HttpGet("api/reservas/proximas-del-dia")]
public async Task<IActionResult> ObtenerProximasDelDia()
{
    // IdEmpresa = usuario logueado
    // Retorna: Lista de reservas ordenada por hora
    // [
    //   {
    //     idReserva: 1,
    //     cliente: "Carlos",
    //     telefono: "987654321",
    //     servicio: "Corte Clásico",
    //     barbero: "Juan",
    //     hora: "14:00",
    //     estado: "Pendiente",
    //     token: "ABC123XYZ"
    //   },
    //   ...
    // ]
}

// 2. Confirmar reserva (admin la confirma manualmente)
[HttpPost("api/reservas/{idReserva}/confirmar")]
public async Task<IActionResult> ConfirmarReserva(int idReserva)
{
    // Cambiar estado: Pendiente → Confirmada
    // Enviar WhatsApp: "Tu cita está confirmada"
    // Notificar a trabajador
}

// 3. Marcar como no-show
[HttpPost("api/reservas/{idReserva}/no-show")]
public async Task<IActionResult> MarcarNoShow(int idReserva)
{
    // Cambiar estado: Confirmada → NoShow
    // Aumentar contador de no-shows del cliente
    // Si >= 3 → BloqueadoWeb = true
}

// 4. Marcar como atendida (crear venta automáticamente)
[HttpPost("api/reservas/{idReserva}/atender")]
public async Task<IActionResult> MarcarAtendida(int idReserva)
{
    // Cambiar estado: Confirmada → Atendida
    // Crear Venta automáticamente
    // Asignar precio, barbero, método pago (undefined)
    // Calcular comisión
}
```

**Frontend Component:**
```typescript
// Componente: DashboardAdminReservas.tsx
// GET /api/reservas/proximas-del-dia
// Muestra tabla con:
//   - Hora | Cliente | Servicio | Barbero | Estado | Acciones
// Botones:
//   - [CONFIRMAR] si está Pendiente
//   - [ATENDIDA] si está Confirmada
//   - [NO-SHOW] si está Confirmada
//   - [VER DETALLES] siempre

// Modal de detalles:
//   - Nombre cliente + teléfono
//   - Servicio + precio
//   - Barbero
//   - Hora
//   - Estado
//   - Notas
//   - Botones de acción

export function DashboardAdminReservas() {
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReservas()
  }, [])

  const loadReservas = async () => {
    const res = await fetch('/api/reservas/proximas-del-dia', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    setReservas(await res.json())
    setLoading(false)
  }

  const handleConfirmar = async (idReserva: number) => {
    await fetch(`/api/reservas/${idReserva}/confirmar`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    loadReservas() // Refetch
  }

  const handleAtender = async (idReserva: number) => {
    await fetch(`/api/reservas/${idReserva}/atender`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    loadReservas() // Refetch
  }

  return (
    <div className={styles.dashboard}>
      <h1>Próximas Reservas</h1>
      
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Barbero</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {reservas.map(r => (
            <tr key={r.idReserva}>
              <td>{r.hora}</td>
              <td>{r.cliente}</td>
              <td>{r.servicio}</td>
              <td>{r.barbero}</td>
              <td>
                <span className={styles[`estado-${r.estado}`]}>
                  {r.estado}
                </span>
              </td>
              <td>
                {r.estado === 'Pendiente' && (
                  <button onClick={() => handleConfirmar(r.idReserva)}>
                    Confirmar
                  </button>
                )}
                {r.estado === 'Confirmada' && (
                  <>
                    <button onClick={() => handleAtender(r.idReserva)}>
                      Atendida
                    </button>
                    <button onClick={() => handleNoShow(r.idReserva)}>
                      No-Show
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Tiempo:** 2-3 días

---

### **PRIORIDAD 3: Dashboard Trabajador - Mi Agenda (Día 5-6)**

**Backend Endpoints:**
```csharp
// 1. Obtener mi agenda (trabajador logueado)
[HttpGet("api/trabajadores/mi-agenda")]
public async Task<IActionResult> ObtenerMiAgenda()
{
    // IdTrabajador = usuario logueado
    // Hoy = DateTime.Today
    // Retorna reservas de HOY donde IdTrabajador = miId
    // Y Estado = Confirmada o Pendiente
}

// 2. Marcar como presente (trabajador marca que atendió)
[HttpPost("api/reservas/{idReserva}/marcar-presente")]
public async Task<IActionResult> MarcarPresente(int idReserva)
{
    // Validar que es el barbero de la reserva
    // Cambiar estado: Confirmada → Atendida
    // Crear venta
    // Notificar a admin
}

// 3. Marcar como ausente/no-show
[HttpPost("api/reservas/{idReserva}/marcar-ausente")]
public async Task<IActionResult> MarcarAusente(int idReserva)
{
    // Estado → NoShow
    // Notificar a cliente
}
```

**Frontend Component:**
```typescript
// Componente: TrabajadorMiAgenda.tsx
// GET /api/trabajadores/mi-agenda
// Muestra HOY solamente (agenda del barbero)

// Cards de reservas:
//   - Hora: 2:00 PM
//   - Cliente: Carlos
//   - Servicio: Corte Clásico
//   - Botones: [PRESENTE] [NO-SHOW] [CANCELAR]

export function TrabajadorMiAgenda() {
  const [agenda, setAgenda] = useState([])

  useEffect(() => {
    loadAgenda()
  }, [])

  const loadAgenda = async () => {
    const res = await fetch('/api/trabajadores/mi-agenda', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    setAgenda(await res.json())
  }

  const handlePresente = async (idReserva: number) => {
    await fetch(`/api/reservas/${idReserva}/marcar-presente`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    loadAgenda()
  }

  return (
    <div>
      <h1>Mi Agenda - Hoy</h1>
      <div className={styles.cardsContainer}>
        {agenda.map(reserva => (
          <div key={reserva.idReserva} className={styles.card}>
            <div className={styles.hora}>
              {reserva.hora}
            </div>
            <div className={styles.cliente}>
              {reserva.cliente}
            </div>
            <div className={styles.servicio}>
              {reserva.servicio}
            </div>
            <div className={styles.acciones}>
              <button 
                onClick={() => handlePresente(reserva.idReserva)}
                className={styles.btnPresente}
              >
                ✓ Presente
              </button>
              <button className={styles.btnAusente}>
                ✕ No vino
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Tiempo:** 2 días

---

### **PRIORIDAD 4: Venta Automática (Día 7)**

**Backend:**
```csharp
// En ReservaService.cs - Método MarcarAtendida()
public async Task MarcarAtendidaAsync(int idReserva)
{
    var reserva = await _context.Reservas.FindAsync(idReserva);
    
    // 1. Actualizar estado
    reserva.Estado = EstadoReserva.Atendida;
    reserva.FechaActualizacion = DateTime.UtcNow;
    
    // 2. Crear Venta automáticamente
    var venta = new Venta
    {
        IdEmpresa = reserva.IdEmpresa,
        IdSede = reserva.IdSede,
        IdTrabajador = reserva.IdTrabajador,
        IdCliente = reserva.IdCliente,
        Monto = reserva.Servicio.PrecioBase,
        Estado = EstadoVenta.Pendiente, // Aún no se cobró
        MetodoPago = MetodoPago.Indefinido, // Se definirá en cierre de caja
        Fecha = DateTime.UtcNow,
        Descripcion = $"{reserva.Servicio.Nombre} - Reserva {idReserva}"
    };
    
    _context.Ventas.Add(venta);
    
    // 3. Calcular comisión del barbero
    var comisionPorcentaje = 0.20m; // 20%
    var comision = reserva.Servicio.PrecioBase * comisionPorcentaje;
    
    venta.ComisionTrabajador = comision;
    
    // 4. Guardar
    await _context.SaveChangesAsync();
    
    // 5. Notificar a admin
    await _mensajeriaService.EnviarWhatsAppAsync(
        idSede: reserva.IdSede,
        mensaje: $"✅ Venta registrada: {reserva.Servicio.Nombre} - S/ {venta.Monto}"
    );
}
```

**Tiempo:** 1 día

---

### **PRIORIDAD 5: Cierre de Caja (Día 8)**

**Backend Endpoints:**
```csharp
// 1. Obtener ventas del día (sin cierre aún)
[HttpGet("api/cierres-caja/ventas-del-dia")]
public async Task<IActionResult> ObtenerVentasDelDia()
{
    var hoy = DateTime.Today;
    var ventas = await _context.Ventas
        .Where(v => v.IdEmpresa == _idEmpresa 
            && v.IdSede == _idSede
            && v.Fecha.Date == hoy
            && v.Estado == EstadoVenta.Pendiente)
        .ToListAsync();
    
    // Agrupar por método de pago
    var resumen = ventas.GroupBy(v => v.MetodoPago)
        .Select(g => new {
            metodo = g.Key,
            cantidad = g.Count(),
            total = g.Sum(v => v.Monto)
        })
        .ToList();
    
    return Ok(new {
        totalEsperado = ventas.Sum(v => v.Monto),
        ventasPorMetodo = resumen,
        detalles = ventas
    });
}

// 2. Crear cierre de caja
[HttpPost("api/cierres-caja")]
public async Task<IActionResult> CrearCierreCaja([FromBody] CierreCajaRequest req)
{
    // req.DineroEfectivoContado = 150
    // req.DineroEsperado = 152
    // req.Observaciones = "Falta $2"
    
    var cierre = new CierreCaja
    {
        IdEmpresa = _idEmpresa,
        IdSede = _idSede,
        Fecha = DateTime.Today,
        DineroEsperado = req.DineroEsperado,
        DineroContado = req.DineroEfectivoContado,
        Diferencia = req.DineroEfectivoContado - req.DineroEsperado,
        Observaciones = req.Observaciones,
        CreadoPor = usuarioLogueado.IdUsuario,
        FechaCreacion = DateTime.UtcNow
    };
    
    _context.CierresCaja.Add(cierre);
    
    // Marcar ventas como "Cerradas"
    var ventas = await _context.Ventas
        .Where(v => v.IdEmpresa == _idEmpresa 
            && v.Fecha.Date == DateTime.Today
            && v.Estado == EstadoVenta.Pendiente)
        .ToListAsync();
    
    foreach (var venta in ventas)
    {
        venta.Estado = EstadoVenta.Cerrada;
    }
    
    await _context.SaveChangesAsync();
    
    return Ok(new { message = "Cierre registrado" });
}
```

**Frontend Component:**
```typescript
// CierreCajaComponent.tsx

export function CierreCaja() {
  const [ventasDelDia, setVentasDelDia] = useState(null)
  const [dineroContado, setDineroContado] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    loadVentas()
  }, [])

  const loadVentas = async () => {
    const res = await fetch('/api/cierres-caja/ventas-del-dia', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    setVentasDelDia(await res.json())
  }

  const handleCierre = async () => {
    const dineroEsperado = ventasDelDia.totalEsperado
    
    await fetch('/api/cierres-caja', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        dineroEfectivoContado: parseFloat(dineroContado),
        dineroEsperado,
        observaciones
      })
    })
    
    toast.success('Cierre registrado')
  }

  return (
    <div className={styles.container}>
      <h1>Cierre de Caja</h1>
      
      <div className={styles.resumen}>
        <div className={styles.card}>
          <h3>Dinero Esperado</h3>
          <p className={styles.monto}>
            S/ {ventasDelDia?.totalEsperado.toFixed(2)}
          </p>
          <small>({ventasDelDia?.detalles.length} ventas)</small>
        </div>
        
        <div className={styles.card}>
          <h3>Detalles por Método</h3>
          <ul>
            {ventasDelDia?.ventasPorMetodo.map(m => (
              <li key={m.metodo}>
                {m.metodo}: S/ {m.total.toFixed(2)} ({m.cantidad} ventas)
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <form onSubmit={(e) => { e.preventDefault(); handleCierre() }}>
        <div>
          <label>Dinero Efectivo Contado (S/)</label>
          <input
            type="number"
            step="0.01"
            value={dineroContado}
            onChange={(e) => setDineroContado(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Observaciones</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: Falta contabilizar Yape"
          />
        </div>
        
        {dineroContado && (
          <div className={styles.diferencia}>
            <p>
              Diferencia: S/{(
                parseFloat(dineroContado) - ventasDelDia?.totalEsperado
              ).toFixed(2)}
            </p>
          </div>
        )}
        
        <button type="submit">
          Confirmar Cierre
        </button>
      </form>
    </div>
  )
}
```

**Tiempo:** 2 días

---

## TIMELINE TOTAL

```
DÍA 1-2:   Endpoints confirmación con token        ✅ CRÍTICO
DÍA 3-4:   Dashboard Admin - Próximas reservas    ✅ CRÍTICO
DÍA 5-6:   Dashboard Trabajador - Mi agenda       ✅ CRÍTICO
DÍA 7:     Venta automática al marcar atendida    ⭐ IMPORTANTE
DÍA 8:     Cierre de caja funcional               ⭐ IMPORTANTE
DÍA 9:     Testing + refinamiento                 ✓ FINAL

TOTAL: ~2 semanas de trabajo
```

---

## FLUJO FINAL COMPLETO

```
Cliente anónimo
  ↓
/sede/{idSede} (PublicSedeDetailPage - tipo Fresha)
  ↓
"Reservar Ahora" → /reservar/{idSede}
  ↓
4 pasos: Servicio → Barbero → Fecha → Confirmación
  ↓
ESTADO: Pendiente
Twilio: ¿Cliente: ✅ CONFIRMAR | ❌ CANCELAR
Email: Resend - confirmación
  ↓
Cliente clickea ✅ CONFIRMAR en WhatsApp
  ↓
ESTADO: Confirmada
Twilio: ¿Admin: Cita confirmada! Te esperamos"
  ↓
Admin abre /dashboard → Próximas Reservas
├─ Ve "Carlos - Corte - 2:00 PM - Confirmada"
├─ Botones: [ATENDIDA] [NO-SHOW]
  ↓
Barbero abre /mi-agenda → Próximas de HOY
├─ Ve "2:00 PM - Carlos - Corte"
├─ Botones: [PRESENTE] [NO-SHOW]
  ↓
Barbero clickea [PRESENTE]
  ↓
ESTADO: Atendida
VENTA AUTOMÁTICA: Creada
├─ Monto: S/ 25
├─ Barbero: Juan
├─ Comisión: S/ 5 (20%)
  ↓
Admin hace cierre de caja
├─ Sistema: "Esperado: S/ 300 (10 ventas)"
├─ Admin ingresa: "Contado: S/ 298"
├─ Sistema calcula: "-S/ 2"
├─ Registra diferencia
  ↓
CICLO COMPLETO ✅
```

---

## CÓDIGO MÍNIMO A IMPLEMENTAR

**Backend (9 endpoints nuevos):**
1. `POST /api/reservas/confirmar-token`
2. `POST /api/reservas/cancelar-token`
3. `GET /api/reservas/proximas-del-dia`
4. `POST /api/reservas/{id}/confirmar`
5. `POST /api/reservas/{id}/atender`
6. `POST /api/reservas/{id}/no-show`
7. `GET /api/trabajadores/mi-agenda`
8. `POST /api/reservas/{id}/marcar-presente`
9. `POST /api/cierres-caja`

**Frontend (3 componentes nuevos):**
1. `ConfirmarReservaPage.tsx`
2. `DashboardAdminReservas.tsx`
3. `TrabajadorMiAgenda.tsx`
4. `CierreCaja.tsx`

**Actualizar en App.tsx:**
```typescript
<Route path="/confirmar-reserva/:token" element={<ConfirmarReservaPage />} />
<Route path="/admin/dashboard" element={<ProtectedRoute role="Admin"><DashboardAdminReservas /></ProtectedRoute>} />
<Route path="/trabajador/mi-agenda" element={<ProtectedRoute role="Trabajador"><TrabajadorMiAgenda /></ProtectedRoute>} />
<Route path="/admin/cierre-caja" element={<ProtectedRoute role="Admin"><CierreCaja /></ProtectedRoute>} />
```

---

## ¿EMPEZAMOS?

**El orden recomendado es:**

1. **Primero:** Endpoints de confirmación con token (Día 1-2)
2. **Segundo:** Dashboard Admin (Día 3-4)
3. **Tercero:** Dashboard Trabajador (Día 5-6)
4. **Cuarto:** Venta automática (Día 7)
5. **Quinto:** Cierre de caja (Día 8)

**¿Por dónde quieres empezar?** Puedo crear:
- [ ] Los 2 endpoints de confirmación (más fácil, ~30 min)
- [ ] El dashboard admin (más trabajo, ~4h)
- [ ] El dashboard trabajador (medio, ~2h)
- [ ] Todos los archivos listos

**Dime dónde empezar y creo los archivos exactos que necesitas copiar al proyecto.** 👇
