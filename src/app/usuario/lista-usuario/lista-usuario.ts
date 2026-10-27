import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Usuario } from '../../models/usuario';
import { UsuarioService } from '../../servicios/usuario';
import { Modal } from 'bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-usuario',
  standalone: false,
  templateUrl: './lista-usuario.html',
  styleUrls: ['./lista-usuario.css']
})
export class ListaUsuario implements OnInit {
  @ViewChild('modalUsuario') modal: ElementRef | undefined;
  vectorUsuarios: Usuario[] = [];
  usuarioSeleccionado: Usuario | undefined = undefined;
  isnew: boolean = false;

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.cargarUsuariosDesdeBD();
  }

  cargarUsuariosDesdeBD(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: (usuarios) => this.vectorUsuarios = usuarios,
      error: () => console.error('No se pudieron cargar los usuarios desde SQL Server')
    });
  }

  editarUsuario(usuario: Usuario) {
    this.isnew = false;
    this.usuarioSeleccionado = { ...usuario };
  }

  NuevoUsuario() {
    this.isnew = true;
    this.usuarioSeleccionado = { id: 0, nombre: '', correo: '', fechaRegistro: new Date() };
  }

  guardarUsuario() {
    if (!this.usuarioSeleccionado) return;

    if (this.isnew) {
      const correoGenerado = this.usuarioSeleccionado.correo ||
        `${this.usuarioSeleccionado.nombre.replace(/\s+/g, '').toLowerCase()}@queropero.com`;
      this.usuarioService.registrar({
        nombre: this.usuarioSeleccionado.nombre,
        correo: correoGenerado,
        password: '1234',
        direccion: 'Itagüí, Antioquia'
      }).subscribe({
        next: () => {
          this.cargarUsuariosDesdeBD();
          this.cerrarModal(this.modal);
          Swal.fire({ title: 'Usuario guardado en SQL Server', icon: 'success' });
        }
      });
    } else {
      this.usuarioService.actualizarUsuario(this.usuarioSeleccionado.id, this.usuarioSeleccionado).subscribe({
        next: () => {
          this.cargarUsuariosDesdeBD();
          this.cerrarModal(this.modal);
          Swal.fire({ title: 'Usuario actualizado en SQL Server', icon: 'success' });
        }
      });
    }
  }

  EliminarUsuario(us: Usuario) {
    Swal.fire({
      icon: 'question',
      title: `¿Está seguro de eliminar el usuario ${us.nombre}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuarioService.eliminarUsuario(us.id).subscribe({
          next: () => {
            this.cargarUsuariosDesdeBD();
            Swal.fire('Eliminado', 'El usuario ha sido desactivado en SQL Server', 'success');
          }
        });
      }
    });
  }

  cerrarModal(modal: ElementRef | undefined) {
    if (modal) {
      const bsmodal = Modal.getInstance(modal.nativeElement);
      bsmodal?.hide();
    }
    const backdrop = document.querySelector('.modal-backdrop.fade.show');
    if (backdrop) {
      backdrop.parentNode?.removeChild(backdrop);
    }
    document.body.removeAttribute('style');
    document.body.removeAttribute('class');
  }
}