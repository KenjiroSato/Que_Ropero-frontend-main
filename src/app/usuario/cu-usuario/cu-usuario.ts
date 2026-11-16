import { Component, Input } from '@angular/core';
import { Usuario } from '../../models/usuario';
@Component({ selector: 'app-cu-usuario', standalone: false, templateUrl: './cu-usuario.html', styleUrl: './cu-usuario.css' })
export class CuUsuario { @Input() usuario: Usuario | null = null; }
