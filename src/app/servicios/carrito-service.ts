import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Lavadora } from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private apiUrl = environment.urlApiBase;
  productos: any[] = [];

  constructor(private http: HttpClient) {
    const guardado = localStorage.getItem('carritoLavadoras');
    if (guardado) {
      this.productos = JSON.parse(guardado);
    }
  }

  // Obtener lavadoras desde SQL Server
  obtenerCatalogoLavadoras(): Observable<Lavadora[]> {
    return this.http.get<Lavadora[]>(`${this.apiUrl}/lavadoras`);
  }

  agregarProducto(nombre: string, precio: number, imagen: string, idLavadora: number = 1, horasAlquiler: number = 4, modelo: string = '') {
    const existente = this.productos.find(p => p.idLavadora === idLavadora && p.nombre === nombre);
    if (existente) {
      existente.horasAlquiler += horasAlquiler;
    } else {
      this.productos.push({ idLavadora, nombre, precio, imagen, horasAlquiler, modelo });
    }
    this.sincronizarStorage();
  }

  obtenerProductos(): any[] {
    return this.productos;
  }

  eliminarItem(index: number): void {
    this.productos.splice(index, 1);
    this.sincronizarStorage();
  }

  vaciarCarrito(): void {
    this.productos = [];
    localStorage.removeItem('carritoLavadoras');
  }

  private sincronizarStorage(): void {
    localStorage.setItem('carritoLavadoras', JSON.stringify(this.productos));
  }

  // Guardar alquiler y pago en SQL Server
  registrarAlquilerEnBD(payload: { idUsuario: number; direccionEntrega: string; metodoPago: string; items: any[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/reservas`, payload);
  }

  // Consultar alquileres del usuario en SQL Server
  obtenerMisAlquileres(idUsuario: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reservas/usuario/${idUsuario}`);
  }

  // Finalizar alquiler / Devolver lavadora
  finalizarAlquiler(idReserva: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/reservas/${idReserva}/finalizar`, {});
  }
}