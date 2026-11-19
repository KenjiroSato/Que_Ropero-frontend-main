import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Catalogo } from './catalogo/catalogo';
import { RouterModule, Routes } from '@angular/router';

const router: Routes = [
  {
    path: '',
    component: Catalogo,
  },
];

@NgModule({
  declarations: [Catalogo],
  imports: [CommonModule, FormsModule, RouterModule.forChild(router)],
})
export class ProductosModule {}
