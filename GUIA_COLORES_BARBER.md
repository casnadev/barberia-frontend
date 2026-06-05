# 🎨 GUÍA DE COLORES - Barber.pe

## ✅ Sistema de Colores Implementado

Este proyecto sigue las pautas exactas del archivo de estilos Barber.pe.

### Paleta Principal
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

## 📍 Variables CSS

Todas las variables están definidas en `src/styles/variables.css`:

```css
:root {
  /* Paleta Principal */
  --color-bg: #FFFFFF;
  --color-bg-secondary: #FFFFFF;
  --color-text-dark: #333333;
  --color-text-light: #666666;
  --color-border: #E0E0E0;
  
  /* Azul Principal */
  --color-primary: #2855F6;
  --color-primary-dark: #1E3FCC;
  --color-primary-light: #5076F8;
}
```

---

## 🎯 Uso por Componente

### Dashboard (✅ Implementado)
```css
.dashboardContainer {
  background: var(--color-bg);
  color: var(--color-text-dark);
}

.dashboardButton {
  background: var(--color-primary);
  color: white;
}

.kpiCard {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}
```

### Admin Panel (✅ Implementado)
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

### Agenda (✅ Implementado)
```css
.calendarGrid {
  background-color: var(--color-border);
}

.timeCell {
  background: var(--color-bg);
  color: var(--color-text-light);
}

.trabajadorHeader {
  background: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-primary);
}

.reservaConfirmada {
  background: rgba(40, 85, 246, 0.1);
  border-left: 4px solid var(--color-primary);
}
```

---

## ✨ Crear Nuevos Componentes

### Paso 1: Crear CSS Module
```css
/* src/styles/NuevoComponente.module.css */

.container {
  background: var(--color-bg);
  color: var(--color-text-dark);
  border: 1px solid var(--color-border);
}

.button {
  background: var(--color-primary);
  color: white;
}

.button:hover {
  background: var(--color-primary-dark);
}

.link {
  color: var(--color-primary);
}

.text {
  color: var(--color-text-dark);
}

.textSecondary {
  color: var(--color-text-light);
}
```

### Paso 2: Usar en Componente
```typescript
import styles from '@/styles/NuevoComponente.module.css'

export function NuevoComponente() {
  return (
    <div className={styles.container}>
      <button className={styles.button}>
        Botón Azul
      </button>
      <p className={styles.text}>Texto oscuro</p>
      <p className={styles.textSecondary}>Texto gris</p>
    </div>
  )
}
```

---

## 🔄 Estados de Reserva

Usar estos colores para estados de reservas:

```css
.reservaConfirmada {
  background: rgba(40, 85, 246, 0.1);      /* Azul claro */
  border-left: 4px solid var(--color-primary);
}

.reservaPendiente {
  background: rgba(255, 152, 0, 0.1);      /* Naranja claro */
  border-left: 4px solid #FF9800;
}

.reservaAtendida {
  background: rgba(76, 175, 80, 0.1);      /* Verde claro */
  border-left: 4px solid #4CAF50;
}

.reservaCancelada {
  background: rgba(244, 67, 54, 0.1);      /* Rojo claro */
  border-left: 4px solid #F44336;
}
```

---

## 📱 Estructura de Archivos

```
src/styles/
├── variables.css        # Variables CSS globales (IMPORTAR PRIMERO)
├── globals.css          # Estilos globales
├── Dashboard.module.css # Estilos Dashboard
├── AgendaPage.module.css # Estilos Agenda
└── ... otros módulos
```

**IMPORTANTE:** `variables.css` DEBE importarse primero en `main.tsx`:
```typescript
import './styles/variables.css'
import './styles/globals.css'
```

---

## ✅ Checklist para Nuevos Componentes

- [ ] Usar `var(--color-*)` en lugar de valores hex directos
- [ ] Fondos con `var(--color-bg)`
- [ ] Textos con `var(--color-text-dark)` o `var(--color-text-light)`
- [ ] Bordes con `var(--color-border)`
- [ ] Botones/Accent con `var(--color-primary)`
- [ ] Hover effects con `var(--color-primary-dark)`
- [ ] Sombras con `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`

---

## 🎨 Ejemplo Completo

### CSS Module
```css
/* src/styles/Card.module.css */

.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary);
}

.cardTitle {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-text-dark);
  margin-bottom: 0.5rem;
}

.cardDescription {
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.cardButton {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
  margin-top: 1rem;
}

.cardButton:hover {
  background: var(--color-primary-dark);
}
```

### Componente React
```typescript
import styles from '@/styles/Card.module.css'

export function Card({ title, description, onButtonClick }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDescription}>{description}</p>
      <button className={styles.cardButton} onClick={onButtonClick}>
        Acción
      </button>
    </div>
  )
}
```

---

## 🚀 Instrucciones para Desarrolladores

1. **Siempre usa variables CSS** - Nunca hardcodear colores
2. **Revisa variables.css** antes de crear nuevos componentes
3. **Mantén consistencia** - Los mismos colores en componentes similares
4. **Prueba en navegador** - Verifica que los colores se vean correctos
5. **Sigue la paleta** - No improvises con colores nuevos

---

**Mantén consistencia usando las variables CSS en todos los componentes. 🎨✨**

Estado: ✅ IMPLEMENTADO
Versión: 3.0
Fecha: 27 Mayo 2026
