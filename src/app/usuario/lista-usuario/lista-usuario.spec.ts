import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ListaUsuario } from './lista-usuario';
import { CuUsuario } from '../cu-usuario/cu-usuario';

describe('ListaUsuario', () => {
  let component: ListaUsuario;
  let fixture: ComponentFixture<ListaUsuario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule],
      declarations: [ListaUsuario, CuUsuario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaUsuario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
