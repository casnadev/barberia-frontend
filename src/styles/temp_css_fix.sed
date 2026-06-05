# Cambiar selectedCardSelected y similares a turquesa con fondo + texto blanco
s/\.serviceCardSelected:hover {/&\n  border-color: var(--color-turquoise) !important;\n  background: var(--color-turquoise) !important;\n  color: white !important;\n  box-shadow: 0 0 0 1px rgba(0, 188, 212, 0.3), 0 8px 24px rgba(0, 188, 212, 0.2) !important;\n}/

s/\.serviceCardSelected {/&\n  border-color: var(--color-turquoise) !important;\n  background: var(--color-turquoise) !important;\n  color: white !important;\n  box-shadow: 0 0 0 1px rgba(0, 188, 212, 0.3), 0 8px 24px rgba(0, 188, 212, 0.2) !important;\n  transition: none;\n}/
