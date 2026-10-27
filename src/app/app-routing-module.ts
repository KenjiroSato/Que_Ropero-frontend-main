import { NgModule, inject } from '@angular/core';
import { RouterModule, Routes, Router, CanActivateFn } from '@angular/router';
import { Home } from './home/home';
import { Login as loginComponent } from './login/login';
import { UsuarioService } from './servicios/usuario';
import Swal from 'sweetalert2';

// Guardián de seguridad RBAC: solo permite el paso si el usuario es Administrador
export const adminGuard: CanActivateFn = () => {
  const usuarioService = inject(UsuarioService);
  const router = inject(Router);

  if (usuarioService.esAdmin()) {
    return true;
  }

  Swal.fire({
    icon: 'error',
    title: 'Acceso Restringido',
    text: 'Esta sección es exclusiva para el Administrador del sistema.'
  });
  router.navigate(['/']);
  return false;
};

const routes: Routes = [
  {
    path: 'usuarios',
    canActivate: [adminGuard], // <-- Protege la ruta de Usuarios (BD)
    loadChildren: () => import('./usuario/usuario-module').then(m => m.UsuarioModule)
  },
  {
    path: 'login',
    component: loginComponent
  },
  {
    path: 'productos',
    loadChildren: () => import('./productos/productos-module').then(m => m.ProductosModule)
  },
  {
    path: 'compras',
    loadChildren: () => import('./compras/compras-module').then(m => m.ComprasModule)
  },
  {
    path: '',
    component: Home
  },
  {
    path: '**',
    redirectTo: '/login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }