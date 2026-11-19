import { NgModule, inject } from '@angular/core';
import { RouterModule, Routes, Router, CanActivateFn } from '@angular/router';
import { Home } from './home/home';
import { Login } from './login/login';
import { UsuarioService } from './servicios/usuario';
export const adminGuard: CanActivateFn = () => {
  const service = inject(UsuarioService);
  return service.esAdmin() ? true : inject(Router).createUrlTree(['/login']);
};
const routes: Routes = [
  {
    path: 'usuarios',
    canActivate: [adminGuard],
    loadChildren: () => import('./usuario/usuario-module').then((m) => m.UsuarioModule),
  },
  { path: 'login', component: Login },
  {
    path: 'productos',
    loadChildren: () => import('./productos/productos-module').then((m) => m.ProductosModule),
  },
  {
    path: 'compras',
    loadChildren: () => import('./compras/compras-module').then((m) => m.ComprasModule),
  },
  { path: '', component: Home, pathMatch: 'full' },
  { path: '**', component: Home, data: { notFound: true } },
];
@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
