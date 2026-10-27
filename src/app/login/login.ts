import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../servicios/usuario';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  usr: string = '';
  pwd: string = '';
  modoRegistro: boolean = false;
  cargando: boolean = false;
  confirmarPassword: string = '';

  nuevoUsuario = {
    nombre: '',
    correo: '',
    celular: '',
    direccion: 'Itagüí, Antioquia',
    documento: '',
    password: ''
  };

  constructor(private router: Router, private usuarioService: UsuarioService) {}

  cambiarModo(esRegistro: boolean) {
    this.modoRegistro = esRegistro;
  }

  login() {
    this.cargando = true;
    this.usuarioService.login(this.usr, this.pwd).subscribe({
      next: (res) => {
        this.cargando = false;
        this.usuarioService.guardarSesion(res.usuario);
        Swal.fire({
          icon: 'success',
          title: `¡Bienvenido, ${res.usuario.nombre}!`,
          text: 'Conectado a QueRoperoDB en SQL Server',
          timer: 1800,
          showConfirmButton: false
        });
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error de autenticación',
          text: err.error?.mensaje || 'Verifica que el Backend (node server.js) esté encendido.'
        });
      }
    });
  }

  registrar() {
    if (this.nuevoUsuario.password !== this.confirmarPassword) {
      Swal.fire('Atención', 'Las contraseñas no coinciden', 'warning');
      return;
    }

    this.cargando = true;
    this.usuarioService.registrar(this.nuevoUsuario).subscribe({
      next: (res) => {
        this.cargando = false;
        this.usuarioService.guardarSesion(res.usuario);
        Swal.fire({
          icon: 'success',
          title: '¡Registro Exitoso!',
          text: 'Tu cuenta fue guardada en SQL Server.',
          timer: 2000,
          showConfirmButton: false
        });
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.cargando = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo registrar',
          text: err.error?.mensaje || 'Error conectando con el servidor.'
        });
      }
    });
  }
}