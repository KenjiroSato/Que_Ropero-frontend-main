import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { EditarUsuario, RegistroUsuario, SesionSchema, Usuario, UsuarioSchema } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly apiBase = `${environment.urlApiBase}/usuarios`;
  private readonly usuario = signal<Usuario | null>(null);
  readonly sesion = this.usuario.asReadonly();
  constructor(private http: HttpClient) {}
  login(correo: string, password: string) {
    return this.http.post<unknown>(`${this.apiBase}/login`, { correo, password }).pipe(
      map(data => SesionSchema.parse(data)), tap(data => this.usuario.set(data.usuario)));
  }
  registrar(datos: RegistroUsuario) {
    return this.http.post<unknown>(`${this.apiBase}/registro`, datos).pipe(
      map(data => SesionSchema.parse(data)), tap(data => this.usuario.set(data.usuario)));
  }
  restaurarSesion(): Observable<Usuario | null> {
    return this.http.get<unknown>(`${this.apiBase}/sesion`).pipe(
      map(data => SesionSchema.parse(data).usuario), tap(user => this.usuario.set(user)),
      catchError(() => { this.usuario.set(null); return of(null); }));
  }
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<unknown>(this.apiBase).pipe(map(data => UsuarioSchema.array().parse(data)));
  }
  crearUsuario(datos: RegistroUsuario & Pick<Usuario, 'tipoUsuario'>) {
    return this.http.post<unknown>(this.apiBase, datos).pipe(map(data => SesionSchema.parse(data)));
  }
  actualizarUsuario(id: number, usuario: EditarUsuario) {
    return this.http.put<unknown>(`${this.apiBase}/${id}`, usuario).pipe(map(data => SesionSchema.parse(data)));
  }
  eliminarUsuario(id: number) { return this.http.delete<unknown>(`${this.apiBase}/${id}`); }
  obtenerSesion(): Usuario | null { return this.usuario(); }
  esAdmin(): boolean { return this.usuario()?.tipoUsuario === 'Administrador'; }
  esOperador(): boolean { return ['Administrador', 'Operador Logistico'].includes(this.usuario()?.tipoUsuario ?? ''); }
  cerrarSesion() {
    return this.http.post<unknown>(`${this.apiBase}/logout`, {}).pipe(tap(() => this.usuario.set(null)));
  }
}
