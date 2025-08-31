const { createApp } = Vue;
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { dialog } = require('@electron/remote');
import { productosBase } from '../data/BDProductos.js';

// 🔐 Clave especial para acceder a la vista Historial
const CLAVE_ESPECIAL_HISTORIAL = '12345';

createApp({
  data() {
    return {
      nuevoProducto: {
        id: '',
        categoria: '',
        precioUnitario: null,
        precioCaja30: null,
        stock: null,
        stockMinimo: null,
        nombre: ''
      },
      productos: [],
      rutaGuardado: null,

      productoBloqueado: false, // controla readonly del ID
      selectorAbierto: false,
      busqueda: '',

      // ===== Acceso a historial =====
      esAdmin: false,
      modalHistorialAbierta: false,
      claveHistorial: '',

      // Placeholder embebido (SVG gris) si no hay imagen
      placeholderSvg:
        "data:image/svg+xml;utf8," +
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>" +
        "<rect x='4' y='10' width='40' height='28' rx='6' fill='%23EEF2F7' stroke='%239AA4B2' stroke-width='2'/>" +
        "<path d='M12 24h24' stroke='%239AA4B2' stroke-width='2' stroke-linecap='round'/>" +
        "<circle cx='24' cy='24' r='3' fill='%239AA4B2'/></svg>"
    };
  },

  mounted() {
    // Cargar productos guardados
    const productosGuardados = localStorage.getItem('productos');
    this.productos = productosGuardados ? JSON.parse(productosGuardados) : [];

    // Asegurar que el input ID no quede en readonly al iniciar
    this.productoBloqueado = false;
    this.$nextTick(() => { this.$refs?.inputId && (this.$refs.inputId.readOnly = false); });

    // ¿El usuario es admin?
    try {
      const u = JSON.parse(localStorage.getItem('usuarioLogueado') || '{}');
      this.esAdmin = u?.rol === 'admin';
    } catch {
      this.esAdmin = false;
    }
  },

  computed: {
    productosFiltrados() {
      const q = this.busqueda.toLowerCase();
      if (!q) return productosBase;
      return productosBase.filter(p =>
        p.id.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      );
    }
  },

  methods: {
    // ====== Registro de eventos (historial global) ======
    _cargarEventos(){
      try { return JSON.parse(localStorage.getItem('eventos') || '[]'); }
      catch { return []; }
    },
    _guardarEventos(list){
      localStorage.setItem('eventos', JSON.stringify(list));
    },
    logEvento({ tipo, detalle, extra }){
      const usuario = JSON.parse(localStorage.getItem('usuarioLogueado') || '{}');
      const evento = {
        id: (Date.now().toString(36) + Math.random().toString(36).slice(2)),
        tipo,                      // 'ingreso_producto' | 'eliminacion_producto' | 'seleccion_carpeta' | 'exportacion_excel' | ...
        detalle,                   // string legible
        usuario: { nombre: usuario?.nombre || '', rut: usuario?.rut || '' },
        extra: extra || null,      // datos adicionales opcionales
        timestamp: new Date().toISOString()
      };
      const lista = this._cargarEventos();
      lista.push(evento);
      this._guardarEventos(lista);
    },

    // ====== Imágenes en tarjetas ======
    imgProducto(p) { return `../assets/productos/${p.id}.svg`; },
    onImgError(ev, p) {
      const img = ev.target;
      const exts = ['svg', 'png', 'jpg', 'jpeg', 'webp'];

      // Normalizadores
      const stripAccents = s =>
        (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normName = s =>
        stripAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
      const normCat = s =>
        stripAccents(s).toLowerCase().replace(/\s+/g, '-');

      const keys = {
        id: String(p.id || ''),
        name: normName(p.nombre || p.id || ''),
        name2: normName(p.nombre || p.id || '').replace(/\d+/g, ''),
        cat: normCat(p.categoria || '')
      };

      let mode = img.dataset.mode || 'id-s';
      let i = parseInt(img.dataset.extIndex || '0', 10);
      const buildSrc = (m, extIndex) => {
        const e = exts[extIndex];
        switch (m) {
          case 'id-s':    return `../assets/productos/${keys.id}.${e}`;
          case 'id-r':    return `../assets/${keys.id}.${e}`;
          case 'name-s':  return `../assets/productos/${keys.name}.${e}`;
          case 'name-r':  return `../assets/${keys.name}.${e}`;
          case 'name2-s': return `../assets/productos/${keys.name2}.${e}`;
          case 'name2-r': return `../assets/${keys.name2}.${e}`;
          case 'cat-s':   return `../assets/categorias/${keys.cat}.${e}`;
          case 'cat-r':   return `../assets/${keys.cat}.${e}`;
          default:        return null;
        }
      };
      const advance = () => {
        if (i < exts.length - 1) i++;
        else {
          i = 0;
          mode =
            mode === 'id-s'    ? 'id-r'   :
            mode === 'id-r'    ? 'name-s' :
            mode === 'name-s'  ? 'name-r' :
            mode === 'name-r'  ? 'name2-s':
            mode === 'name2-s' ? 'name2-r':
            mode === 'name2-r' ? 'cat-s'  :
            mode === 'cat-s'   ? 'cat-r'  :
            'done';
        }
      };
      advance();
      if (mode === 'done') { img.dataset.mode = 'done'; img.src = this.placeholderSvg; return; }
      img.dataset.mode = mode;
      img.dataset.extIndex = String(i);
      img.src = buildSrc(mode, i);
    },

    // ====== Helpers UI ======
    enfocarId() { this.$nextTick(() => this.$refs?.inputId?.focus()); },
    desbloquearId() {
      this.productoBloqueado = false;
      this.$nextTick(() => {
        const el = this.$refs?.inputId;
        if (el) { el.readOnly = false; el.focus(); el.select(); }
      });
    },

    // ====== Modal selector de productos ======
    abrirSelector() { this.busqueda = ''; this.selectorAbierto = true; },
    cerrarSelector() { this.selectorAbierto = false; },
    seleccionarDeCatalogo(p) {
      this.nuevoProducto.id = p.id;
      this.nuevoProducto.categoria = p.categoria;
      this.nuevoProducto.precioUnitario = p.precioUnitario;
      this.nuevoProducto.precioCaja30 = p.precioCaja30;
      this.nuevoProducto.stockMinimo = p.stockMinimo;
      this.nuevoProducto.nombre = p.nombre;
      this.productoBloqueado = true;
      this.selectorAbierto = false;
    },

    // ====== Autocomplete ID ======
    autocompletarProducto() {
      if (this.productoBloqueado) return;
      const entrada = String(this.nuevoProducto.id || '').toLowerCase();
      const encontrado = productosBase.find(p =>
        p.id.toLowerCase() === entrada || p.nombre.toLowerCase() === entrada
      );

      if (encontrado) {
        this.nuevoProducto.categoria = encontrado.categoria;
        this.nuevoProducto.precioUnitario = encontrado.precioUnitario;
        this.nuevoProducto.precioCaja30 = encontrado.precioCaja30;
        this.nuevoProducto.stockMinimo = encontrado.stockMinimo;
        this.nuevoProducto.nombre = encontrado.nombre;
        this.productoBloqueado = true;
      } else {
        // sin match → dejar editable
        this.desbloquearId();
        this.nuevoProducto.categoria = '';
        this.nuevoProducto.precioUnitario = null;
        this.nuevoProducto.precioCaja30 = null;
        this.nuevoProducto.stockMinimo = null;
        this.nuevoProducto.nombre = '';
      }
    },

    // ====== Acciones formulario ======
    borrarCamposProducto() {
      this.nuevoProducto = {
        id: '',
        categoria: '',
        precioUnitario: null,
        precioCaja30: null,
        stock: null,
        stockMinimo: null,
        nombre: ''
      };
      this.desbloquearId();
    },

    agregarProducto() {
      const p = this.nuevoProducto;

      // ID vacío → desbloquear
      if (!p.id || String(p.id).trim() === '') {
        alert('Ingresa el ID o nombre del producto.');
        this.desbloquearId();
        return;
      }

      // Buscar por id o nombre
      const needle = String(p.id).toLowerCase();
      const encontrado = productosBase.find(
        prod => prod.id.toLowerCase() === needle || prod.nombre.toLowerCase() === needle
      );
      if (!encontrado) {
        alert('⚠️ El producto no existe en la base de datos.');
        this.desbloquearId();
        return;
      }

      // Completar desde BD si falta
      if (!p.categoria)             p.categoria      = encontrado.categoria;
      if (p.precioUnitario == null) p.precioUnitario = encontrado.precioUnitario;
      if (p.precioCaja30  == null)  p.precioCaja30   = encontrado.precioCaja30;
      if (p.stockMinimo   == null)  p.stockMinimo    = encontrado.stockMinimo;

      // Validar cantidades
      if (p.stock == null || p.stockMinimo == null) {
        alert('Completa los campos de Stock y Stock Mínimo.');
        this.productoBloqueado = true; // el producto existe → mantener bloqueado
        return;
      }

      // Agregar
      const producto = { ...p, nombre: encontrado.nombre };
      this.productos.push(producto);
      this.guardarProductos();

      // 🔹 Log: ingreso de producto
      this.logEvento({
        tipo: 'ingreso_producto',
        detalle: `${producto.nombre} (${producto.id}) • Stock=${producto.stock} • Mín=${producto.stockMinimo}`
      });

      this.borrarCamposProducto();
    },

    eliminarProducto(index) {
      const prod = this.productos[index];

      // 🔹 Log: eliminación antes de borrar
      if (prod) {
        this.logEvento({
          tipo: 'eliminacion_producto',
          detalle: `${prod.nombre || prod.id} eliminado(a) del inventario`
        });
      }

      this.productos.splice(index, 1);
      this.guardarProductos();
    },

    guardarProductos() {
      localStorage.setItem('productos', JSON.stringify(this.productos));
    },

    // ====== Exportar / Carpeta ======
    seleccionarRuta() {
      const result = dialog.showOpenDialogSync({
        title: 'Selecciona una carpeta para guardar los archivos Excel',
        properties: ['openDirectory']
      });
      if (result && result.length > 0) {
        this.rutaGuardado = result[0];
        alert(`📁 Carpeta seleccionada:\n${this.rutaGuardado}`);

        // 🔹 Log: carpeta seleccionada
        this.logEvento({
          tipo: 'seleccion_carpeta',
          detalle: this.rutaGuardado
        });
      }
    },

    exportarExcel() {
      if (!this.rutaGuardado) {
        alert('⚠️ Primero debes seleccionar una carpeta para guardar el archivo.');
        return;
      }
      const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado') || '{}');
      const productosParaExportar = this.productos.map(p => ({
        ID: p.id,
        Nombre: p.nombre || p.id,
        Categoría: p.categoria,
        Precio_Unitario: p.precioUnitario,
        Precio_Caja30: p.precioCaja30,
        Stock: p.stock,
        Stock_Mínimo: p.stockMinimo,
        Responsable: usuarioLogueado?.nombre || ''
      }));

      const ws = XLSX.utils.json_to_sheet(productosParaExportar);
      ws['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 10 },
        { wch: 15 }, { wch: 25 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

      const fecha = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `inventario-${fecha}.xlsx`;
      const filePath = path.join(this.rutaGuardado, nombreArchivo);

      XLSX.writeFile(wb, filePath);
      alert(`✅ ¡Archivo exportado correctamente a:\n${filePath}`);

      // 🔹 Log: exportación exitosa
      this.logEvento({
        tipo: 'exportacion_excel',
        detalle: filePath
      });
    },

    // ====== Acceso a HISTORIAL (modal + contraseña especial) ======
    abrirModalHistorial() {
      if (!this.esAdmin) {
        alert('Acceso restringido. Solo administradores.');
        return;
      }
      this.claveHistorial = '';
      this.modalHistorialAbierta = true;
    },
    cerrarModalHistorial() {
      this.modalHistorialAbierta = false;
      this.claveHistorial = '';
    },
    accederHistorial() {
      if (!this.esAdmin) {
        alert('Acceso restringido. Solo administradores.');
        return;
      }
      if (this.claveHistorial !== CLAVE_ESPECIAL_HISTORIAL) {
        alert('Contraseña especial incorrecta.');
        return;
      }
      // OK → ir a la vista nueva
      window.location.href = 'historial.html';
    }
  }
}).mount('#app');
