import { ThemeService } from '../../servicios/theme-service';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../../servicios/usuario';
import { CarritoService } from '../../servicios/carrito-service';
import { mensajeError } from '../../servicios/api-error';
@Component({ selector: 'app-header', standalone: false, templateUrl: './header.html', styleUrl: './header.css' })
export class Header {
  menuAbierto = false;
  error = '';
  constructor(public theme: ThemeService, public usuarios: UsuarioService, public carrito: CarritoService, private router: Router) {}
  salir(): void {
    this.usuarios.cerrarSesion().subscribe({ next: () => { this.carrito.vaciarCarrito(); this.menuAbierto = false; this.router.navigate(['/']); }, error: error => this.error = mensajeError(error) });
  }
}
