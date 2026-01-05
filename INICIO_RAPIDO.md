# 🚀 Family Express - Inicio Rápido

## ✅ La aplicación está lista y funcionando!

El servidor de desarrollo está corriendo en:
- **Local**: http://localhost:3000
- **Network**: http://192.168.1.173:3000

## 📋 Primeros Pasos

### 1. Iniciar Sesión
- Abre http://localhost:3000 en tu navegador
- Haz clic en "Iniciar sesión con Google"
- Usa tu cuenta de Google para autenticarte
- Serás redirigido al Dashboard automáticamente

### 2. Registrar tu Primer Cliente

**Para cliente CON registro consular (Categoría G):**
1. Ve a la página "Clientes" en el menú lateral
2. Haz clic en "➕ Nuevo Cliente"
3. Completa el formulario:
   - Nombre completo
   - Teléfono
   - Email (opcional)
   - Dirección en Ecuador
   - Número de identificación
   - Selecciona "Categoría G (Con registro consular)"
   - Ingresa el número de registro consular
   - Sube una foto/documento (opcional)
4. Haz clic en "Guardar Cliente"

**Para cliente SIN registro consular (Categoría B):**
- Sigue los mismos pasos pero selecciona "Categoría B (Sin registro consular)"
- No necesitas número de registro consular

### 3. Crear tu Primer Envío

1. Ve a la página "Envíos"
2. Haz clic en "➕ Nuevo Envío"
3. Selecciona el cliente del dropdown
4. Marca los artículos que va en el paquete (ropa, zapatos, vitaminas, etc.)
5. Ingresa el valor declarado en USD (máximo $400)
6. Verifica el desglose de costos que aparece automáticamente:
   - **Cat. G**: $18.50 + (valor × 0.5%) FODINFA
   - **Cat. B**: $18.50 + $20.00 + (valor × 0.5%) FODINFA
7. Haz clic en "Crear Envío"
8. ¡Se generará automáticamente un código de rastreo! (Ej: FE-20241224-0001)

### 4. Rastrear un Paquete

**Para empleados (desde el sistema):**
1. Ve a la página "Rastreo"
2. Ingresa el código de rastreo
3. Haz clic en "Buscar"
4. Verás toda la información y el historial

**Para clientes (página pública):**
1. Abre http://localhost:3000/public/tracking.html
2. Ingresa el código de rastreo
3. El cliente verá el estado actual y el historial completo

### 5. Actualizar Estado de Envío

1. En la página "Envíos", encuentra el envío
2. Haz clic en "Estado"
3. Ingresa:
   - Nuevo estado (pending, in_transit, delivered, cancelled)
   - Ubicación actual
   - Notas adicionales
4. Se guardará en el historial de rastreo automáticamente

### 6. Ver Reportes

1. Ve a la página "Reportes"
2. Selecciona el rango de fechas
3. Haz clic en "Generar Reporte"
4. Verás:
   - Total de envíos
   - Ingresos totales
   - Costos totales
   - Ganancia neta
   - Distribución por categoría

## 💡 Consejos Importantes

### Cálculo de Costos
- **FODINFA se aplica SOLO al valor declarado**, no al costo de envío
- El precio al cliente siempre es $25.00 fijo
- La ganancia varía según la categoría y el valor declarado

### Ejemplo de Cálculos:

**Categoría G con valor declarado $100:**
```
Tarifa envío:  $18.50
FODINFA:       $100 × 0.5% = $0.50
TOTAL COSTO:   $19.00
PRECIO CLIENTE: $25.00
GANANCIA:      $6.00
```

**Categoría B con valor declarado $100:**
```
Tarifa envío:    $18.50
Impuesto Courier: $20.00
FODINFA:         $100 × 0.5% = $0.50
TOTAL COSTO:     $39.00
PRECIO CLIENTE:  $25.00
GANANCIA:        -$14.00 (pérdida)
```

⚠️ **Importante**: Categoría B puede generar pérdida si el valor declarado es alto. Considera ajustar el precio al cliente o limitar los valores declarados para Cat. B.

## 🔧 Comandos Útiles

### Iniciar servidor de desarrollo:
```bash
npm run dev
```

### Detener servidor:
Presiona `Ctrl + C` en la terminal

### Reiniciar servidor:
1. Detén el servidor (Ctrl + C)
2. Vuelve a ejecutar `npm run dev`

## 📦 Empaquetar para Desktop (Electron)

Cuando estés listo para crear la aplicación de escritorio:

1. **Instalar Electron**:
```bash
npm install electron --save-dev
```

2. **Probar en modo Electron**:
```bash
npm run electron
```

3. **Crear instalador para Windows**:
```bash
npm install electron-builder --save-dev
```

Luego edita `package.json` y agrega:
```json
{
  "scripts": {
    "build:win": "electron-builder --win"
  },
  "build": {
    "appId": "com.familyexpress.app",
    "productName": "Family Express",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis",
      "icon": "icon.png"
    }
  }
}
```

Ejecuta:
```bash
npm run build:win
```

Esto generará un instalador `.exe` en la carpeta `dist/`

## 🔐 Seguridad

- Las credenciales de Firebase y Backblaze B2 ya están configuradas
- Solo usuarios autenticados con Google pueden acceder al sistema
- La página pública de rastreo NO requiere autenticación
- Los clientes solo pueden ver información de sus paquetes con el código

## 📞 Soporte

Si encuentras algún problema:
1. Revisa la consola del navegador (F12) para errores
2. Verifica que el servidor esté corriendo
3. Asegúrate de tener conexión a internet (para Firebase)
4. Verifica que las credenciales de Firebase estén correctas

## 🎨 Personalización

Para cambiar colores o diseño:
- Edita `styles/styles.css`
- Modifica las variables CSS en `:root`
- Los cambios se verán inmediatamente al recargar

## ✨ Características Implementadas

✅ Autenticación con Google
✅ Gestión completa de clientes (CRUD)
✅ Gestión completa de envíos (CRUD)
✅ Cálculo automático de costos por categoría
✅ Generación de códigos de rastreo únicos
✅ Sistema de rastreo público para clientes
✅ Dashboard con estadísticas en tiempo real
✅ Reportes personalizados por fecha
✅ Historial de seguimiento de paquetes
✅ Almacenamiento de fotos en Backblaze B2
✅ Base de datos en tiempo real con Firestore
✅ Diseño premium con dark theme y glassmorphism
✅ Listo para empaquetar con Electron

¡Tu sistema Family Express está listo para usar! 🚀📦
