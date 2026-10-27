import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../../servicios/usuario';
import { Usuario } from '../../models/usuario';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  constructor(private usuarioService: UsuarioService, private router: Router) {}

  get usuarioActual(): Usuario | null {
    return this.usuarioService.obtenerSesion();
  }

  get esAdmin(): boolean {
    return this.usuarioService.esAdmin();
  }

  salir(): void {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}