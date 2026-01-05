# Family Express - Sistema de Gestión de Envíos

Sistema completo de gestión para empresa de envíos de paquetería desde USA hacia Ecuador.

## 🚀 Características

### Gestión de Clientes
- ✅ Registro completo de clientes
- ✅ Categorización (B: Sin registro consular, G: Con registro consular)
- ✅ Almacenamiento de fotos/documentos en Backblaze B2
- ✅ Búsqueda y filtrado de clientes

### Gestión de Envíos
- ✅ Creación de envíos con código de rastreo único (FE-YYYYMMDD-XXXX)
- ✅ Cálculo automático de costos según categoría:
  - **Categoría B**: $18.50 + $20.00 courier + 0.5% FODINFA del valor
  - **Categoría G**: $18.50 + 0.5% FODINFA del valor
- ✅ Selección de contenido del paquete (ropa, zapatos, vitaminas, etc.)
- ✅ Gestión de estados (pendiente, en tránsito, entregado, cancelado)
- ✅ Historial de rastreo completo

### Dashboard & Reportes
- ✅ Estadísticas en tiempo real
- ✅ Ganancias por período
- ✅ Reportes personalizados por rango de fechas
- ✅ Envíos recientes

### Seguridad
- ✅ Autenticación con Google (Firebase Auth)
- ✅ Datos almacenados en Firestore
- ✅ Imágenes en Backblaze B2

## 📦 Tecnologías

- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript (ES6 Modules)
- **Backend**: Firebase (Auth, Firestore)
- **Storage**: Backblaze B2 (S3-compatible)
- **Design**: Dark theme, vibrant gradients, smooth animations

## 🛠️ Instalación

### Requisitos
- Node.js 16+
- Navegador moderno (Chrome, Firefox, Edge)

### Pasos

1. **Instalar dependencias**
```bash
npm install
```

2. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

3. **Abrir en navegador**
```
http://localhost:3000
```

## 📱 Empaquetado para Desktop (Electron)

Para crear una aplicación de escritorio:

1. **Instalar Electron**
```bash
npm install electron --save-dev
```

2. **Crear electron.js**
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

3. **Actualizar package.json**
```json
{
  "main": "electron.js",
  "scripts": {
    "electron": "electron ."
  }
}
```

4. **Ejecutar**
```bash
npm run electron
```

5. **Crear instalador (Windows)**
```bash
npm install electron-builder --save-dev
npm run build:win
```

## 🎨 Diseño

### Paleta de Colores
- **Primary**: #6366f1 (Índigo vibrante)
- **Secondary**: #ec4899 (Rosa magenta)
- **Accent**: #14b8a6 (Teal)
- **Success**: #10b981 (Verde)
- **Warning**: #f59e0b (Ámbar)
- **Danger**: #ef4444 (Rojo)

### Efectos
- Glassmorphism con backdrop-filter
- Gradientes animados
- Sombras dinámicas
- Transiciones suaves

## 📊 Estructura del Proyecto

```
family/
├── index.html              # Página principal
├── package.json
├── README.md
├── src/
│   ├── app.js             # Controlador principal
│   ├── config/
│   │   ├── firebase-config.js
│   │   ├── b2-config.js
│   │   └── package-items-config.js
│   └── modules/
│       ├── auth.js
│       ├── client-manager.js
│       ├── shipment-manager.js
│       ├── cost-calculator.js
│       └── tracking-generator.js
└── styles/
    └── styles.css         # Estilos premium
```

## 🔐 Configuración de Firebase

El proyecto ya está configurado con:
- **Project ID**: family-b1702
- **Auth**: Google Sign-In habilitado
- **Firestore**: Colecciones automáticas

### Colecciones de Firestore:
- `clients` - Información de clientes
- `shipments` - Envíos y paquetes
- `tracking_history` - Historial de rastreo

## 📸 Configuración de Backblaze B2

El proyecto usa:
- **Bucket**: Familyapp
- **Region**: us-east-005
- **Endpoint**: s3.us-east-005.backblazeb2.com
- **Tipo**: Public

## 🧮 Cálculos de Costos

### Categoría B (Sin registro consular)
```
Tarifa de envío:    $18.50
Impuesto Courier:   $20.00
FODINFA (0.5%):     Valor declarado × 0.005
-----------------------------------
TOTAL:              $38.50 + (Valor × 0.005)
```

### Categoría G (Con registro consular)
```
Tarifa de envío:    $18.50
FODINFA (0.5%):     Valor declarado × 0.005
-----------------------------------
TOTAL:              $18.50 + (Valor × 0.005)
```

### Precio al Cliente
```
Precio fijo:        $25.00 por paquete de 8 libras
```

## 📝 Artículos Permitidos

- 👕 Ropa
- 👟 Zapatos
- 💊 Vitaminas y Suplementos
- 🧴 Perfumes
- 💉 Medicinas (con receta)
- 🥫 Alimentos Sellados
- 💄 Cosméticos
- ⌚ Accesorios
- 🧸 Juguetes
- 📚 Libros

## 🚀 Uso

1. **Iniciar sesión** con Google
2. **Registrar clientes** con su información y categoría
3. **Crear envíos** seleccionando cliente y contenido
4. **Rastrear paquetes** con el código generado
5. **Ver reportes** de ingresos y estadísticas

## 📞 Soporte

Para problemas o preguntas sobre el sistema, contactar al equipo de Family Express.

## 📄 Licencia

© 2024 Family Express. Todos los derechos reservados.
