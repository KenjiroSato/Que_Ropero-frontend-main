import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CarritoService } from '../../servicios/carrito-service';
import { UsuarioService } from '../../servicios/usuario';
import { Reserva, SolicitudReserva } from '../../models/usuario';
import { mensajeError } from '../../servicios/api-error';
import { z } from 'zod';
const IntentoSchema = z.object({ firma: z.string(), clave: z.string().uuid() });
@Component({ selector: 'app-carrito', standalone: false, templateUrl: './carrito.html', styleUrl: './carrito.css' })
export class Carrito implements OnInit {
  misReservas: Reserva[] = []; direccionEntrega = ''; procesando = false; cargandoReservas = false;
  readonly horasInvalidas = new Set<number>();
  error = ''; errorReservas = ''; anuncio = ''; accionPendiente: number | null = null;
  private intento: { firma: string; clave: string } | null = null;
  constructor(public carrito: CarritoService, public usuarios: UsuarioService, private router: Router) {}
  ngOnInit(): void { this.direccionEntrega = this.usuarios.obtenerSesion()?.direccion ?? ''; this.cargarMisReservas(); }
  calcularTotal(): number { return this.carrito.items().reduce((total, item) => total + item.precio * item.horasAlquiler, 0); }
  cambiarHoras(id: number, value: number): void {
    if (!Number.isInteger(value) || value < 1 || value > 72) { this.horasInvalidas.add(id); this.error = 'Elige entre 1 y 72 horas completas.'; return; }
    this.horasInvalidas.delete(id); this.error = ''; this.carrito.actualizarHoras(id, value);
  }
  quitar(id: number): void { this.horasInvalidas.delete(id); this.carrito.eliminarItem(id); }
  confirmarAlquiler(): void {
    if (!this.usuarios.obtenerSesion()) { this.router.navigate(['/login']); return; }
    if (this.procesando || this.horasInvalidas.size || !this.carrito.items().length) return;
    if (this.direccionEntrega.trim().length < 8) { this.error = 'Escribe tu dirección completa de entrega.'; return; }
    const payload: SolicitudReserva = { direccionEntrega: this.direccionEntrega.trim(), metodoPago: 'Efectivo',
      items: this.carrito.items().map(({ idLavadora, horasAlquiler }) => ({ idLavadora, horasAlquiler })) };
    const firma = JSON.stringify({ usuario: this.usuarios.obtenerSesion()?.id, payload });
    if (!this.intento) {
      try {
        const parsed = IntentoSchema.safeParse(JSON.parse(sessionStorage.getItem('qr-reservation-attempt') ?? 'null'));
        if (parsed.success) this.intento = parsed.data;
      } catch { /* Storage can be disabled; the in-memory key still protects retries in this view. */ }
    }
    if (this.intento?.firma !== firma) this.intento = { firma, clave: crypto.randomUUID() };
    try { sessionStorage.setItem('qr-reservation-attempt', JSON.stringify(this.intento)); }
    catch { this.carrito.storageError.set('No podemos guardar este intento. Si pierdes la conexión, revisa tus reservas antes de volver a confirmar.'); }
    this.procesando = true; this.error = ''; this.anuncio = '';
    this.carrito.registrarAlquilerEnBD(payload, this.intento.clave).subscribe({ next: () => {
      this.procesando = false; this.carrito.vaciarCarrito(); this.intento = null;
      try { sessionStorage.removeItem('qr-reservation-attempt'); } catch { /* Successful request already cleared the cart. */ }
      this.cargarMisReservas();
      this.anuncio = 'Tu reserva quedó registrada. El pago en efectivo está pendiente para la entrega.';
    }, error: error => { this.procesando = false; this.error = mensajeError(error); } });
  }
  cargarMisReservas(): void {
    if (!this.usuarios.obtenerSesion()) { this.misReservas = []; return; }
    this.cargandoReservas = true; this.errorReservas = '';
    this.carrito.obtenerMisAlquileres().subscribe({ next: data => { this.misReservas = data; this.cargandoReservas = false; },
      error: error => { this.errorReservas = mensajeError(error); this.cargandoReservas = false; } });
  }
  operar(reserva: Reserva, accion: 'solicitar' | 'finalizar' | 'pago'): void {
    if (this.accionPendiente !== null) return;
    if (accion !== 'solicitar' && !window.confirm(accion === 'pago' ? '¿Confirmas que recibiste el efectivo?' : '¿Confirmas que el equipo fue recolectado?')) return;
    this.accionPendiente = reserva.idReserva; this.errorReservas = '';
    const request = accion === 'solicitar' ? this.carrito.solicitarRecoleccion(reserva.idReserva) :
      accion === 'finalizar' ? this.carrito.finalizarAlquiler(reserva.idReserva) : this.carrito.confirmarPago(reserva.idReserva);
    request.subscribe({ next: () => { this.accionPendiente = null; this.cargarMisReservas(); },
      error: error => { this.accionPendiente = null; this.errorReservas = mensajeError(error); } });
  }
}
