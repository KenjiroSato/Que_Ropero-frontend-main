import { Component, OnInit } from '@angular/core';
import { Usuario } from '../../models/usuario';
import { UsuarioService } from '../../servicios/usuario';
import { mensajeError } from '../../servicios/api-error';
@Component({
  selector: 'app-lista-usuario',
  standalone: false,
  templateUrl: './lista-usuario.html',
  styleUrl: './lista-usuario.css',
})
export class ListaUsuario implements OnInit {
  vectorUsuarios: Usuario[] = [];
  usuarioSeleccionado: Usuario | null = null;
  isnew = false;
  cargando = false;
  guardando = false;
  error = '';
  anuncio = '';
  password = '';
  constructor(private usuarios: UsuarioService) {}
  ngOnInit(): void {
    this.cargarUsuariosDesdeBD();
  }
  cargarUsuariosDesdeBD(): void {
    this.cargando = true;
    this.error = '';
    this.usuarios.getUsuarios().subscribe({
      next: (data) => {
        this.vectorUsuarios = data;
        this.cargando = false;
      },
      error: (error) => {
        this.error = mensajeError(error);
        this.cargando = false;
      },
    });
  }
  editarUsuario(usuario: Usuario): void {
    this.isnew = false;
    this.usuarioSeleccionado = { ...usuario };
    this.error = '';
  }
  NuevoUsuario(): void {
    this.isnew = true;
    this.password = '';
    this.error = '';
    this.usuarioSeleccionado = {
      id: 0,
      nombre: '',
      correo: '',
      celular: '',
      direccion: '',
      documento: '',
      tipoUsuario: 'Cliente',
      fechaRegistro: new Date().toISOString(),
    };
  }
  guardarUsuario(): void {
    const user = this.usuarioSeleccionado;
    if (!user || this.guardando) return;
    this.guardando = true;
    this.error = '';
    const request = this.isnew
      ? this.usuarios.crearUsuario({
          nombre: user.nombre,
          correo: user.correo,
          celular: user.celular,
          direccion: user.direccion,
          documento: user.documento,
          password: this.password,
          tipoUsuario: user.tipoUsuario,
        })
      : this.usuarios.actualizarUsuario(user.id, {
          nombre: user.nombre,
          correo: user.correo,
          celular: user.celular,
          direccion: user.direccion,
          tipoUsuario: user.tipoUsuario,
        });
    request.subscribe({
      next: () => {
        this.guardando = false;
        this.usuarioSeleccionado = null;
        this.password = '';
        this.anuncio = 'Usuario guardado.';
        this.cargarUsuariosDesdeBD();
      },
      error: (error) => {
        this.error = mensajeError(error);
        this.guardando = false;
      },
    });
  }
  EliminarUsuario(user: Usuario): void {
    if (!window.confirm(`¿Desactivar la cuenta de ${user.nombre}?`)) return;
    this.usuarios.eliminarUsuario(user.id).subscribe({
      next: () => {
        this.anuncio = 'Cuenta desactivada.';
        this.cargarUsuariosDesdeBD();
      },
      error: (error) => (this.error = mensajeError(error)),
    });
  }
}
