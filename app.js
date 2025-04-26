const { createApp } = Vue
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')
const { dialog } = require('@electron/remote')
import { productosBase } from './BDProductos.js'

createApp({
  data() {
    return {
      nuevoProducto: {
        id: '',
        categoria: '',
        precioUnitario: null,
        precioCaja30: null,
        stock: null,
        stockMinimo: null
      },
      productos: [],
      rutaGuardado: null,
      productoBloqueado: false,
      rut: ''
    }
  },

  mounted() {
    const productosGuardados = localStorage.getItem('productos')
    this.productos = productosGuardados ? JSON.parse(productosGuardados) : productosBase
    if (!productosGuardados) this.guardarProductos()
  },

  methods: {
    formatearRut() {
      let rutLimpio = this.rut.replace(/[^\dkK]/g, '').replace(/^0+/, '');
      if (rutLimpio.length > 1) {
        rutLimpio = rutLimpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + rutLimpio.slice(-1);
      }
      this.rut = rutLimpio.toUpperCase();
    },

    autocompletarProducto() {
      if (this.productoBloqueado) return;

      const encontrado = productosBase.find(p =>
        p.id.toLowerCase() === this.nuevoProducto.id.toLowerCase() ||
        p.nombre.toLowerCase() === this.nuevoProducto.id.toLowerCase()
      )

      if (encontrado) {
        this.nuevoProducto.categoria = encontrado.categoria
        this.nuevoProducto.precioUnitario = encontrado.precioUnitario
        this.nuevoProducto.precioCaja30 = encontrado.precioCaja30
        this.nuevoProducto.stockMinimo = encontrado.stockMinimo
        this.nuevoProducto.nombre = encontrado.nombre
        this.productoBloqueado = true
      }
    },

    borrarCamposProducto() {
      this.nuevoProducto = { id: '', categoria: '', precioUnitario: null, precioCaja30: null, stock: null, stockMinimo: null }
      this.productoBloqueado = false
    },

    agregarProducto() {
      const p = this.nuevoProducto

      const encontrado = productosBase.find(prod => prod.id.toLowerCase() === p.id.toLowerCase())
      if (!encontrado) {
        alert('⚠️ El producto no existe en la base de datos.')
        return
      }

      if (p.id && p.categoria && p.precioUnitario !== null && p.precioCaja30 !== null && p.stock !== null && p.stockMinimo !== null) {
        const producto = { ...p, nombre: encontrado.nombre }

        this.productos.push(producto)
        this.borrarCamposProducto()
        this.guardarProductos()
      } else {
        alert('Completa todos los campos')
      }
    },

    eliminarProducto(index) {
      this.productos.splice(index, 1)
      this.guardarProductos()
    },

    guardarProductos() {
      localStorage.setItem('productos', JSON.stringify(this.productos))
    },

    seleccionarRuta() {
      const result = dialog.showOpenDialogSync({
        title: 'Selecciona una carpeta para guardar los archivos Excel',
        properties: ['openDirectory']
      })
      if (result && result.length > 0) {
        this.rutaGuardado = result[0]
        alert(`📁 Carpeta seleccionada:\n${this.rutaGuardado}`)
      }
    },

    exportarExcel() {
      if (!this.rutaGuardado) {
        alert('⚠️ Primero debes seleccionar una carpeta para guardar el archivo.')
        return
      }

      const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'))

      const productosParaExportar = this.productos.map(p => ({
        ID: p.id,
        Nombre: p.nombre || p.id,
        Categoría: p.categoria,
        Precio_Unitario: p.precioUnitario,
        Precio_Caja30: p.precioCaja30,
        Stock: p.stock,
        Stock_Mínimo: p.stockMinimo,
        Responsable: usuarioLogueado.nombre
      }))

      const ws = XLSX.utils.json_to_sheet(productosParaExportar)

      ws['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 10 },
        { wch: 15 }, { wch: 25 }
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Inventario")

      const fecha = new Date().toISOString().slice(0, 10)
      const nombreArchivo = `inventario-${fecha}.xlsx`

      const filePath = path.join(this.rutaGuardado, nombreArchivo)

      XLSX.writeFile(wb, filePath)
      alert(`✅ ¡Archivo exportado correctamente a:\n${filePath}`)
    }
  }
}).mount('#app')
