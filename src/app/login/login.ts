import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../servicios/usuario';
import { CarritoService } from '../servicios/carrito-service';
import { mensajeError } from '../servicios/api-error';
@Component({ selector: 'app-login', standalone: false, templateUrl: './login.html', styleUrl: './login.css' })
export class Login {
  usr = ''; pwd = ''; modoRegistro = false; cargando = false; confirmarPassword = ''; error = '';
  nuevoUsuario = { nombre: '', correo: '', celular: '', direccion: '', documento: '', password: '' };
  constructor(private router: Router, private usuarios: UsuarioService, private carrito: CarritoService) {}
  cambiarModo(registro: boolean): void { this.modoRegistro = registro; this.error = ''; }
  login(): void {
    if (this.cargando || !this.usr.trim() || !this.pwd) return;
    this.enviar(false);
  }
  registrar(): void {
    if (this.cargando) return;
    if (this.nuevoUsuario.password !== this.confirmarPassword) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.enviar(true);
  }
  private enviar(registro: boolean): void {
    this.cargando = true; this.error = '';
    const request = registro ? this.usuarios.registrar(this.nuevoUsuario) : this.usuarios.login(this.usr, this.pwd);
    request.subscribe({ next: () => { this.cargando = false; this.router.navigate([this.carrito.items().length ? '/compras' : '/productos']); },
      error: error => { this.error = mensajeError(error); this.cargando = false; } });
  }
}
