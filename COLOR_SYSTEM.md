# 🎨 Sistema de Colores - Barber.pe

## Paleta Principal

```
Blanco Puro:         #FFFFFF
Blanco Secundario:   #FFFFFF
Gris Oscuro:         #333333
Gris Medio:          #666666
Borde:               #E0E0E0
Azul Principal:      #2855F6 (Botones, selecciones, acentos)
Azul Oscuro:         #1E3FCC
Azul Claro:          #5076F8
```

---

## Variables CSS

```css
/* En ReservaClientePage.module.css */
:root {
  --color-bg: #FFFFFF;
  --color-bg-secondary: #FFFFFF;
  --color-text-dark: #333333;
  --color-text-light: #666666;
  --color-border: #E0E0E0;
  --color-primary: #2855F6;
  --color-primary-dark: #1E3FCC;
  --color-primary-light: #5076F8;
}
```

---

## Uso por Elemento

### Fondos
```css
background: var(--color-bg);  /* Blanco puro */
```

### Textos
```css
color: var(--color-text-dark);  /* Gris oscuro #333333 */
color: var(--color-text-light);  /* Gris medio #666666 */
```

### Bordes
```css
border: 1px solid var(--color-border);  /* #E0E0E0 */
```

### Botones y Selecciones
```css
background: var(--color-primary);  /* Azul #2855F6 */
color: white;
border-color: var(--color-primary);
box-shadow: 0 0 0 1px rgba(40, 85, 246, 0.3);
```

### Gradientes
```css
background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
```

---

## Paleta Visual

| Elemento | Color | Hex |
|----------|-------|-----|
| Fondo | Blanco Puro | #FFFFFF |
| Textos | Gris Oscuro | #333333 |
| Bordes | Gris Claro | #E0E0E0 |
| Botones/Selección | Azul | #2855F6 |
| Texto en Botones | Blanco | #FFFFFF |

---

## Cómo Usar en Nuevos Componentes

### Dashboard
```css
.dashboardContainer {
  background: var(--color-bg);
  color: var(--color-text-dark);
}

.dashboardButton {
  background: var(--color-primary);
  color: white;
}
```

### Admin Panel
```css
.adminCard {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.adminActionButton {
  background: var(--color-primary);
  color: white;
}
```

### Trabajador
```css
.trabajadorSection {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.trabajadorConfirmButton {
  background: var(--color-primary);
  color: white;
}
```

---

## Estado del Proyecto

| Componente | Estado | Tema |
|-----------|--------|------|
| ReservaClientePage | ✅ Completo | Blanco + Azul #2855F6 |
| Dashboard | ⏳ Próximo | - |
| Admin Panel | ⏳ Próximo | - |
| Trabajador | ⏳ Próximo | - |
| SuperAdmin | ⏳ Próximo | - |

---

**Mantén consistencia usando las variables CSS en todos los componentes.** 🎨✨


