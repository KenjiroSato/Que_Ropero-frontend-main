import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Carrito } from './carrito/carrito';
import { RouterModule, Routes } from '@angular/router';

const router: Routes = [
  {
    path: '',
    component: Carrito
  }
];

@NgModule({
  declarations: [
    Carrito
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(router)
  ]
})
export class ComprasModule { }