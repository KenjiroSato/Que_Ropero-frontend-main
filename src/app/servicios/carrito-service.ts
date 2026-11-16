import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ItemCarrito, ItemCarritoSchema, Lavadora, LavadoraSchema, ReservaSchema, SolicitudReserva } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly apiUrl = environment.urlApiBase;
  private readonly productos = signal<readonly ItemCarrito[]>([]);
  readonly items = this.productos.asReadonly();
  readonly storageError = signal('');
  constructor(private http: HttpClient) {
    try {
      localStorage.removeItem('usuarioQueRopero');
      const raw = localStorage.getItem('carritoLavadoras');
      const parsed = ItemCarritoSchema.array().max(20).safeParse(raw ? JSON.parse(raw) : []);
      if (parsed.success) this.productos.set(parsed.data);
      else localStorage.removeItem('carritoLavadoras');
    } catch { this.storageError.set('El carrito no pudo recuperarse. Puedes volver a agregar tus equipos.'); }
  }
  obtenerCatalogoLavadoras() {
    return this.http.get<unknown>(`${this.apiUrl}/lavadoras`).pipe(map(data => LavadoraSchema.array().parse(data)));
  }
  agregarProducto(lavadora: Lavadora): void {
    if (this.productos().some(item => item.idLavadora === lavadora.idLavadora)) return;
    this.productos.update(items => [...items, ItemCarritoSchema.parse({ ...lavadora, horasAlquiler: 4 })]);
    this.persistir();
  }
  actualizarHoras(id: number, horas: number): void {
    if (!Number.isInteger(horas) || horas < 1 || horas > 72) return;
    this.productos.update(items => items.map(item => item.idLavadora === id ? { ...item, horasAlquiler: horas } : item));
    this.persistir();
  }
  eliminarItem(id: number): void {
    this.productos.update(items => items.filter(item => item.idLavadora !== id)); this.persistir();
  }
  vaciarCarrito(): void { this.productos.set([]); this.persistir(); }
  private persistir(): void {
    try { localStorage.setItem('carritoLavadoras', JSON.stringify(this.productos())); this.storageError.set(''); }
    catch { this.storageError.set('No pudimos guardar el carrito en este dispositivo. No recargues antes de confirmar.'); }
  }
  registrarAlquilerEnBD(payload: SolicitudReserva, key: string) {
    return this.http.post<unknown>(`${this.apiUrl}/reservas`, payload, { headers: { 'Idempotency-Key': key } });
  }
  obtenerMisAlquileres() {
    return this.http.get<unknown>(`${this.apiUrl}/reservas`).pipe(map(data => ReservaSchema.array().parse(data)));
  }
  solicitarRecoleccion(id: number) { return this.http.put<unknown>(`${this.apiUrl}/reservas/${id}/recoleccion`, {}); }
  finalizarAlquiler(id: number) { return this.http.put<unknown>(`${this.apiUrl}/reservas/${id}/finalizar`, {}); }
  confirmarPago(id: number) { return this.http.put<unknown>(`${this.apiUrl}/reservas/${id}/pago`, {}); }
}
