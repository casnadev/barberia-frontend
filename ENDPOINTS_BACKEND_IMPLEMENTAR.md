# ENDPOINTS BACKEND A IMPLEMENTAR

## 🔴 CRÍTICO - Implementar primero (Día 1-2)

### 1. Obtener datos de reserva por token
```csharp
[HttpGet("api/reservas/obtener-por-token")]
[AllowAnonymous]
public async Task<IActionResult> ObtenerPorToken([FromQuery] string token)
{
    if (string.IsNullOrEmpty(token))
        return BadRequest("Token requerido");
    
    var reserva = await _context.Reservas
        .Include(r => r.Servicio)
        .Include(r => r.Trabajador)
        .Include(r => r.Sede)
        .Include(r => r.Cliente)
        .FirstOrDefaultAsync(r => r.TokenConfirmacion == token && !r.EstaEliminado);
    
    if (reserva == null)
        return NotFound("Reserva no encontrada");
    
    // Validar que el token no esté expirado (ej: 48 horas)
    var horaCreacion = reserva.FechaCreacion;
    var horasTranscurridas = (DateTime.UtcNow - horaCreacion).TotalHours;
    if (horasTranscurridas > 48)
        return BadRequest("Token expirado");
    
    return Ok(new
    {
        idReserva = reserva.IdReserva,
        cliente = reserva.Cliente.Nombre,
        telefono = reserva.Cliente.Telefono,
        servicio = reserva.Servicio.Nombre,
        precio = reserva.Servicio.PrecioBase,
        duracion = reserva.Servicio.DuracionMinutos,
        barbero = reserva.Trabajador.NombreCompleto,
        fecha = reserva.FechaReserva.ToString("dddd, d MMMM yyyy", new System.Globalization.CultureInfo("es-ES")),
        hora = reserva.HoraInicio,
        sede = reserva.Sede.Nombre,
        direccion = reserva.Sede.Direccion,
        estado = reserva.Estado.ToString()
    });
}
```

---

### 2. Confirmar reserva con token (cliente clickea en WhatsApp)
```csharp
[HttpPost("api/reservas/confirmar-token")]
[AllowAnonymous]
public async Task<IActionResult> ConfirmarConToken([FromBody] ConfirmarTokenRequest request)
{
    if (string.IsNullOrEmpty(request.Token))
        return BadRequest("Token requerido");
    
    var reserva = await _context.Reservas
        .Include(r => r.Cliente)
        .Include(r => r.Servicio)
        .Include(r => r.Trabajador)
        .FirstOrDefaultAsync(r => r.TokenConfirmacion == request.Token && !r.EstaEliminado);
    
    if (reserva == null)
        return NotFound("Reserva no encontrada");
    
    if (reserva.Estado != EstadoReserva.Pendiente)
        return BadRequest($"La reserva no está en estado Pendiente (está en {reserva.Estado})");
    
    try
    {
        // 1. Cambiar estado
        reserva.Estado = EstadoReserva.Confirmada;
        reserva.FechaActualizacion = DateTime.UtcNow;
        
        // 2. Guardar
        _context.Reservas.Update(reserva);
        await _context.SaveChangesAsync();
        
        // 3. Enviar WhatsApp de confirmación
        var mensaje = $"✅ Hola {reserva.Cliente.Nombre}!\n\n" +
            $"Tu cita está CONFIRMADA\n\n" +
            $"👤 {reserva.Trabajador.NombreCompleto}\n" +
            $"✂️ {reserva.Servicio.Nombre}\n" +
            $"📅 {reserva.FechaReserva:dd/MM/yyyy} a las {reserva.HoraInicio}\n\n" +
            $"Te esperamos! 💈";
        
        await _mensajeriaService.EnviarWhatsAppAsync(
            numeroDestino: reserva.Cliente.Telefono,
            mensaje: mensaje,
            idSede: reserva.IdSede
        );
        
        // 4. Programar recordatorios
        await _recordatoriosService.ProgramarRecordatoriosAsync(reserva.IdReserva);
        
        return Ok(new { success = true, message = "Reserva confirmada" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error confirmando reserva con token");
        return StatusCode(500, "Error al confirmar");
    }
}
```

---

### 3. Cancelar reserva con token
```csharp
[HttpPost("api/reservas/cancelar-token")]
[AllowAnonymous]
public async Task<IActionResult> CancelarConToken([FromBody] CancelarTokenRequest request)
{
    if (string.IsNullOrEmpty(request.Token))
        return BadRequest("Token requerido");
    
    var reserva = await _context.Reservas
        .Include(r => r.Cliente)
        .FirstOrDefaultAsync(r => r.TokenConfirmacion == request.Token && !r.EstaEliminado);
    
    if (reserva == null)
        return NotFound("Reserva no encontrada");
    
    if (reserva.Estado == EstadoReserva.Cancelada)
        return BadRequest("La reserva ya está cancelada");
    
    try
    {
        // 1. Cambiar estado
        reserva.Estado = EstadoReserva.Cancelada;
        reserva.FechaActualizacion = DateTime.UtcNow;
        
        // 2. Guardar
        _context.Reservas.Update(reserva);
        await _context.SaveChangesAsync();
        
        // 3. Enviar WhatsApp de cancelación
        var mensaje = $"❌ Hola {reserva.Cliente.Nombre}!\n\n" +
            $"Tu cita ha sido CANCELADA\n\n" +
            $"Puedes reservar nuevamente cuando lo desees. ¡Te esperamos!";
        
        await _mensajeriaService.EnviarWhatsAppAsync(
            numeroDestino: reserva.Cliente.Telefono,
            mensaje: mensaje,
            idSede: reserva.IdSede
        );
        
        return Ok(new { success = true, message = "Reserva cancelada" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error cancelando reserva");
        return StatusCode(500, "Error al cancelar");
    }
}
```

---

## 🟡 IMPORTANTE - Implementar después (Día 3-4)

### 4. Obtener próximas reservas del día (Admin)
```csharp
[HttpGet("api/reservas/proximas-del-dia")]
public async Task<IActionResult> ObtenerProximasDelDia()
{
    var usuarioId = int.Parse(User.FindFirst("IdUsuario")?.Value ?? "0");
    var usuario = await _usuarioService.ObtenerPorIdAsync(usuarioId);
    
    if (usuario.Rol != RolUsuario.Admin)
        return Forbid();
    
    var hoy = DateTime.Today;
    var idEmpresa = usuario.IdEmpresa;
    
    var reservas = await _context.Reservas
        .Where(r => r.IdEmpresa == idEmpresa
            && r.FechaReserva.Date == hoy
            && (r.Estado == EstadoReserva.Pendiente || r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.Atendida)
            && !r.EstaEliminado)
        .Include(r => r.Cliente)
        .Include(r => r.Servicio)
        .Include(r => r.Trabajador)
        .OrderBy(r => r.HoraInicio)
        .Select(r => new
        {
            idReserva = r.IdReserva,
            cliente = r.Cliente.Nombre,
            telefono = r.Cliente.Telefono,
            servicio = r.Servicio.Nombre,
            precio = r.Servicio.PrecioBase,
            duracion = r.Servicio.DuracionMinutos,
            barbero = r.Trabajador.NombreCompleto,
            fecha = r.FechaReserva.ToString("dddd, d MMMM yyyy", new System.Globalization.CultureInfo("es-ES")),
            hora = r.HoraInicio,
            estado = r.Estado.ToString(),
            token = r.TokenConfirmacion
        })
        .ToListAsync();
    
    return Ok(reservas);
}
```

---

### 5. Admin confirma reserva
```csharp
[HttpPost("api/reservas/{idReserva}/confirmar")]
public async Task<IActionResult> ConfirmarReserva(int idReserva)
{
    var usuarioId = int.Parse(User.FindFirst("IdUsuario")?.Value ?? "0");
    var usuario = await _usuarioService.ObtenerPorIdAsync(usuarioId);
    
    if (usuario.Rol != RolUsuario.Admin)
        return Forbid();
    
    var reserva = await _context.Reservas
        .Include(r => r.Cliente)
        .Include(r => r.Servicio)
        .Include(r => r.Trabajador)
        .FirstOrDefaultAsync(r => r.IdReserva == idReserva && r.IdEmpresa == usuario.IdEmpresa);
    
    if (reserva == null)
        return NotFound();
    
    if (reserva.Estado != EstadoReserva.Pendiente)
        return BadRequest("Solo se pueden confirmar reservas Pendientes");
    
    try
    {
        reserva.Estado = EstadoReserva.Confirmada;
        reserva.FechaActualizacion = DateTime.UtcNow;
        _context.Reservas.Update(reserva);
        await _context.SaveChangesAsync();
        
        // Enviar WhatsApp
        var mensaje = $"✅ Tu cita está CONFIRMADA\n\n" +
            $"👤 {reserva.Trabajador.NombreCompleto}\n" +
            $"📅 {reserva.FechaReserva:dd/MM/yyyy} {reserva.HoraInicio}";
        
        await _mensajeriaService.EnviarWhatsAppAsync(
            numeroDestino: reserva.Cliente.Telefono,
            mensaje: mensaje,
            idSede: reserva.IdSede
        );
        
        return Ok(new { message = "Reserva confirmada" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error confirmando reserva");
        return StatusCode(500, "Error al confirmar");
    }
}
```

---

### 6. Admin marca como atendida (crea Venta automáticamente)
```csharp
[HttpPost("api/reservas/{idReserva}/atender")]
public async Task<IActionResult> MarcarAtendida(int idReserva)
{
    var usuarioId = int.Parse(User.FindFirst("IdUsuario")?.Value ?? "0");
    var usuario = await _usuarioService.ObtenerPorIdAsync(usuarioId);
    
    var reserva = await _context.Reservas
        .Include(r => r.Servicio)
        .FirstOrDefaultAsync(r => r.IdReserva == idReserva && r.IdEmpresa == usuario.IdEmpresa);
    
    if (reserva == null)
        return NotFound();
    
    try
    {
        // 1. Cambiar estado
        reserva.Estado = EstadoReserva.Atendida;
        reserva.FechaActualizacion = DateTime.UtcNow;
        _context.Reservas.Update(reserva);
        
        // 2. Crear Venta automáticamente
        var venta = new Venta
        {
            IdEmpresa = reserva.IdEmpresa,
            IdSede = reserva.IdSede,
            IdTrabajador = reserva.IdTrabajador,
            IdCliente = reserva.IdCliente,
            Monto = reserva.Servicio.PrecioBase,
            Estado = EstadoVenta.Pendiente, // Aún no se cobró
            MetodoPago = MetodoPago.Indefinido,
            Fecha = DateTime.UtcNow,
            Descripcion = $"{reserva.Servicio.Nombre} - Reserva {idReserva}",
            FechaCreacion = DateTime.UtcNow
        };
        
        // 3. Calcular comisión (20%)
        venta.ComisionTrabajador = reserva.Servicio.PrecioBase * 0.20m;
        
        _context.Ventas.Add(venta);
        await _context.SaveChangesAsync();
        
        return Ok(new
        {
            message = "Reserva marcada como atendida",
            ventaCreada = new
            {
                idVenta = venta.IdVenta,
                monto = venta.Monto,
                comision = venta.ComisionTrabajador
            }
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error marcando atendida");
        return StatusCode(500, "Error al marcar como atendida");
    }
}
```

---

### 7. Admin marca como No-Show
```csharp
[HttpPost("api/reservas/{idReserva}/no-show")]
public async Task<IActionResult> MarcarNoShow(int idReserva)
{
    var usuarioId = int.Parse(User.FindFirst("IdUsuario")?.Value ?? "0");
    var usuario = await _usuarioService.ObtenerPorIdAsync(usuarioId);
    
    var reserva = await _context.Reservas
        .Include(r => r.Cliente)
        .FirstOrDefaultAsync(r => r.IdReserva == idReserva && r.IdEmpresa == usuario.IdEmpresa);
    
    if (reserva == null)
        return NotFound();
    
    try
    {
        reserva.Estado = EstadoReserva.NoShow;
        reserva.FechaActualizacion = DateTime.UtcNow;
        _context.Reservas.Update(reserva);
        
        // Aumentar contador de no-shows del cliente
        reserva.Cliente.ContadorNoShows = (reserva.Cliente.ContadorNoShows ?? 0) + 1;
        
        // Si llega a 3 no-shows, bloquearlo
        if (reserva.Cliente.ContadorNoShows >= 3)
        {
            reserva.Cliente.BloqueadoWeb = true;
        }
        
        _context.Clientes.Update(reserva.Cliente);
        await _context.SaveChangesAsync();
        
        return Ok(new { message = "Marcado como No-Show" });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error marcando no-show");
        return StatusCode(500, "Error");
    }
}
```

---

## DTO Requests

```csharp
public class ConfirmarTokenRequest
{
    public string Token { get; set; }
}

public class CancelarTokenRequest
{
    public string Token { get; set; }
}
```

---

## ¿Qué ya tienes implementado?

Basándome en tu estructura actual:
- ✅ ReservaService.cs (crear reserva, validaciones)
- ✅ Twilio WhatsApp (envío)
- ✅ Resend Email (envío)
- ✅ Token generation

**Lo que falta:**
- ❌ Endpoints para confirmar/cancelar con token
- ❌ Endpoints para admin (próximas del día, confirmar, marcar atendida, no-show)
- ❌ Creación automática de Venta al marcar atendida
- ❌ Lógica de bloqueo cuando cliente llega a 3 no-shows

---

## Próximos pasos

1. **Hoy:** Implementa los 3 primeros endpoints (confirmar/cancelar token, obtener por token)
2. **Mañana:** Implementa los 4 endpoints de admin
3. **Integrate en App.tsx:** Las 3 nuevas rutas
4. **Prueba end-to-end:** Cliente reserva → recibe WhatsApp → confirma con botón → admin lo ve

**¿Empezamos? Dime qué necesitas que cree primero.** 👇
