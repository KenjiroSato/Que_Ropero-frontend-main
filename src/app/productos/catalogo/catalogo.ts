import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CarritoService } from '../../servicios/carrito-service';
import { Lavadora } from '../../models/usuario';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-catalogo',
  standalone: false,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css'
})
export class Catalogo implements OnInit {
  lavadoras: Lavadora[] = [];
  lavadorasFiltradas: Lavadora[] = [];
  textoBusqueda: string = '';
  categoriaSeleccionada: string = 'Todas';
  soloDisponibles: boolean = false;

  constructor(private carritoService: CarritoService, private router: Router) {}

  ngOnInit(): void {
    this.cargarLavadoras();
  }

  cargarLavadoras(): void {
    this.carritoService.obtenerCatalogoLavadoras().subscribe({
      next: (data) => {
        this.lavadoras = data;
        this.aplicarFiltros();
      },
      error: () => {
        // Respaldo en caso de que se abra la vista antes de encender el backend
        this.lavadoras = [
          {
            idLavadora: 1, codigo: 'LAV-001', nombre: 'Lavadora KALLEY Carga Superior 18 Kg',
            modelo: 'Kalley K-LD18G', categoria: 'Carga Superior', capacidadKg: 18,
            precio: 12000, cantidad: 3, disponible: true, estado: 'Disponible',
            caracteristicas: '18kg | Vapor | Wi-Fi', barrioUbicacion: 'Barrio San José, Itagüí',
            imagen: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80'
          },
          {
            idLavadora: 2, codigo: 'LAV-002', nombre: 'Lavadora Black MY 19 Kilogramos',
            modelo: 'Whirlpool Black 19Kg', categoria: 'Carga Superior', capacidadKg: 19,
            precio: 15000, cantidad: 2, disponible: true, estado: 'Disponible',
            caracteristicas: '19kg | Ciclo Intenso | Turbo', barrioUbicacion: 'La Gloria, Itagüí',
            imagen: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80'
          },
          {
            idLavadora: 3, codigo: 'LAV-003', nombre: 'Lavadora Whirlpool Carga Superior 12 Kg',
            modelo: 'Whirlpool 12Kg', categoria: 'Carga Superior', capacidadKg: 12,
            precio: 10000, cantidad: 4, disponible: true, estado: 'Disponible',
            caracteristicas: '12kg | Ahorro Agua', barrioUbicacion: 'San Pío X, Itagüí',
            imagen: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80'
          },
          {
            idLavadora: 4, codigo: 'LAV-004', nombre: 'Lavadora LG Carga Frontal 22 Kg',
            modelo: 'LG ThinQ Frontal 22Kg', categoria: 'Carga Frontal', capacidadKg: 22,
            precio: 18000, cantidad: 2, disponible: true, estado: 'Disponible',
            caracteristicas: '22kg | Vapor | Wi-Fi', barrioUbicacion: 'Playas de María, Itagüí',
            imagen: 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?auto=format&fit=crop&w=600&q=80'
          }
        ];
        this.aplicarFiltros();
      }
    });
  }

  aplicarFiltros(): void {
    this.lavadorasFiltradas = this.lavadoras.filter(lav => {
      const coincideTexto = !this.textoBusqueda ||
        lav.nombre.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        lav.modelo.toLowerCase().includes(this.textoBusqueda.toLowerCase()) ||
        (lav.barrioUbicacion && lav.barrioUbicacion.toLowerCase().includes(this.textoBusqueda.toLowerCase()));

      const coincideCategoria = this.categoriaSeleccionada === 'Todas' || lav.categoria === this.categoriaSeleccionada;
      const coincideDisponible = !this.soloDisponibles || lav.disponible;

      return coincideTexto && coincideCategoria && coincideDisponible;
    });
  }

  reservarLavadora(lav: Lavadora): void {
    if (!lav.disponible) {
      Swal.fire('No disponible', 'Esta lavadora se encuentra alquilada en este momento.', 'info');
      return;
    }

    this.carritoService.agregarProducto(lav.nombre, lav.precio, lav.imagen, lav.idLavadora, 4, lav.modelo);
    Swal.fire({
      icon: 'success',
      title: '¡Lavadora agregada a tu solicitud!',
      text: `${lav.nombre} ($${lav.precio.toLocaleString()} COP/hora)`,
      showCancelButton: true,
      confirmButtonText: 'Ir a Pagar / Confirmar Alquiler',
      cancelButtonText: 'Seguir viendo catálogo'
    }).then((res) => {
      if (res.isConfirmed) {
        this.router.navigate(['/compras']);
      }
    });
  }
}