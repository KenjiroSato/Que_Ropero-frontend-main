import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario } from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiBase = `${environment.urlApiBase}/usuarios`;

  constructor(private http: HttpClient) {}

  login(correo: string, password: string): Observable<any> {
    return this.http.post(`${this.apiBase}/login`, { correo, password });
  }

  registrar(datos: any): Observable<any> {
    return this.http.post(`${this.apiBase}/registro`, datos);
  }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiBase);
  }

  actualizarUsuario(id: number, usuario: Partial<Usuario>): Observable<any> {
    return this.http.put(`${this.apiBase}/${id}`, usuario);
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/${id}`);
  }

  guardarSesion(usuario: Usuario): void {
    localStorage.setItem('usuarioQueRopero', JSON.stringify(usuario));
  }

  obtenerSesion(): Usuario | null {
    const raw = localStorage.getItem('usuarioQueRopero');
    return raw ? JSON.parse(raw) : null;
  }

  // NUEVO: Verifica si el usuario actual tiene rol de Administrador
  esAdmin(): boolean {
    const sesion = this.obtenerSesion();
    return sesion !== null && sesion.tipoUsuario === 'Administrador';
  }

  cerrarSesion(): void {
    localStorage.removeItem('usuarioQueRopero');
  }
}