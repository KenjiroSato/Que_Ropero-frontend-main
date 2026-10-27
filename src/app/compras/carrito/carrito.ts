import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CarritoService } from '../../servicios/carrito-service';
import { UsuarioService } from '../../servicios/usuario';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-carrito',
  standalone: false,
  templateUrl: './carrito.html',
  styleUrl: './carrito.css'
})
export class Carrito implements OnInit {
  productos: any[] = [];
  misReservas: any[] = [];
  direccionEntrega: string = 'Barrio San José, Calle 36, Itagüí';
  metodoPago: string = 'Nequi';
  procesando: boolean = false;

  constructor(
    private carritoService: CarritoService,
    private usuarioService: UsuarioService,
    private router: Router
  ) {}

  ngOnInit() {
    this.productos = this.carritoService.obtenerProductos();
    const sesion = this.usuarioService.obtenerSesion();
    if (sesion?.direccion) {
      this.direccionEntrega = sesion.direccion;
    }
    this.cargarMisReservas();
  }

  calcularTotal(): number {
    return this.productos.reduce((acc, item) => acc + (Number(item.precio) * (Number(item.horasAlquiler) || 4)), 0);
  }

  eliminarDelCarrito(index: number) {
    this.carritoService.eliminarItem(index);
    this.productos = this.carritoService.obtenerProductos();
  }

  vaciarCarrito() {
    this.carritoService.vaciarCarrito();
    this.productos = [];
  }

  confirmarAlquiler() {
    const sesion = this.usuarioService.obtenerSesion();
    if (!sesion) {
      Swal.fire({
        icon: 'warning',
        title: 'Inicia sesión para continuar',
        text: 'Debes iniciar sesión o registrarte para asociar el alquiler a tu cuenta en SQL Server.'
      }).then(() => this.router.navigate(['/login']));
      return;
    }

    this.procesando = true;
    this.carritoService.registrarAlquilerEnBD({
      idUsuario: sesion.id,
      direccionEntrega: this.direccionEntrega,
      metodoPago: this.metodoPago,
      items: this.productos
    }).subscribe({
      next: () => {
        this.procesando = false;
        this.vaciarCarrito();
        this.cargarMisReservas();
        Swal.fire({
          icon: 'success',
          title: '¡Reserva y Pago Confirmados!',
          text: `Tu lavadora será entregada en ${this.direccionEntrega}. Pago procesado por ${this.metodoPago}.`
        });
      },
      error: (err) => {
        this.procesando = false;
        Swal.fire('Error', err.error?.mensaje || 'No se pudo registrar el alquiler en SQL Server', 'error');
      }
    });
  }

  cargarMisReservas() {
    const sesion = this.usuarioService.obtenerSesion();
    const idUsuario = sesion ? sesion.id : 1;
    this.carritoService.obtenerMisAlquileres(idUsuario).subscribe({
      next: (data) => this.misReservas = data,
      error: () => this.misReservas = []
    });
  }

  devolverLavadora(idReserva: number) {
    this.carritoService.finalizarAlquiler(idReserva).subscribe({
      next: () => {
        Swal.fire('¡Equipo entregado!', 'La lavadora ha sido recolectada y está disponible nuevamente.', 'success');
        this.cargarMisReservas();
      }
    });
  }
}