# StockSeguro

Gestor de inventario simple para pequeñas empresas, construido con **Electron + Vue 3**.  
Permite registrar productos, controlar stock, exportar a Excel y mantener un historial de operaciones con trazabilidad por usuario.

> 🚀 Pensado para un setup rápido, mínima capacitación y alto impacto operativo.

---

## ✨ Características

- **Autenticación local** (RUT + PIN) y **roles** (admin / trabajador).
- **Inventario** con:
  - Alta de productos (autocompletado desde catálogo base).
  - Edición rápida de stock y umbral **bajo stock**.
  - Eliminación de productos.
- **Selector de productos** (modal) con búsqueda por ID/Nombre/Categoría.
- **Exportación a Excel** (inventario e historial).
- **Carpeta de destino** para exportaciones (vía diálogo del sistema).
- **Historial de operaciones** (solo admin):
  - ingreso/eliminación de productos, selección de carpeta y exportaciones.
  - registro de fecha/hora + usuario responsable.
- **Perfil del trabajador** (modal en Historial):
  - nombre, RUT, último ingreso, empresa, email (mailto), teléfono y PIN (mostrar/ocultar).
  - soporte de **avatar** por RUT (con placeholder si falta).

---

## 🧱 Arquitectura (clean-ish)

src/
├─ main/ # Proceso principal (Electron)
│ └─ main.js
├─ renderer/ # UI (Vue en proceso renderer)
│ ├─ assets/ # Imágenes y recursos estáticos
│ │ ├─ avatar/ # Foto trabajador (RUT sin puntos ni guion, .jpg)
│ │ ├─ categorias/
│ │ ├─ productos/
│ │ └─ sTOCKsEGURO.png
│ ├─ data/ # Datos/base estática
│ │ ├─ BDProductos.js
│ │ └─ BDTrabajadores.js
│ ├─ scripts/ # Lógica de vistas
│ │ ├─ app.js # Principal (inventario)
│ │ └─ login.js # Login
│ ├─ styles/
│ │ └─ style.css
│ └─ views/ # Vistas HTML
│ ├─ login.html
│ ├─ principal.html
│ └─ historial.html


- **Datos y estado**: `localStorage` (inventario, usuario logueado, historial, ruta de exportación).
- **Excel**: [`xlsx`](https://www.npmjs.com/package/xlsx).
- **Dialogo de carpetas**: `@electron/remote` (habilitado desde `main.js`).
- **Render**: Vue 3 (CDN).

---

## 🖥️ Requisitos

- Node.js 18+ (recomendado).
- npm 9+.
- Windows/macOS/Linux.

---

## ⚙️ Instalación y ejecución

```bash
# 1) instalar dependencias
npm install

# 2) ejecutar en modo desarrollo (desde la RAÍZ del repo)
npm start
