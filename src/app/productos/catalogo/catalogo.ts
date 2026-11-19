import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CarritoService } from '../../servicios/carrito-service';
import { Lavadora } from '../../models/usuario';
import { mensajeError } from '../../servicios/api-error';
@Component({
  selector: 'app-catalogo',
  standalone: false,
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  lavadoras: Lavadora[] = [];
  lavadorasFiltradas: Lavadora[] = [];
  textoBusqueda = '';
  categoriaSeleccionada = 'Todas';
  soloDisponibles = false;
  cargando = true;
  error = '';
  anuncio = '';
  constructor(
    public carrito: CarritoService,
    private route: ActivatedRoute,
  ) {}
  ngOnInit(): void {
    this.textoBusqueda = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.cargarLavadoras();
  }
  cargarLavadoras(): void {
    this.cargando = true;
    this.error = '';
    this.carrito.obtenerCatalogoLavadoras().subscribe({
      next: (data) => {
        this.lavadoras = data;
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (error) => {
        this.error = mensajeError(error);
        this.cargando = false;
      },
    });
  }
  aplicarFiltros(): void {
    const search = this.textoBusqueda.trim().toLocaleLowerCase('es');
    this.lavadorasFiltradas = this.lavadoras.filter(
      (lav) =>
        `${lav.nombre} ${lav.modelo} ${lav.capacidadKg} ${lav.barrioUbicacion}`
          .toLocaleLowerCase('es')
          .includes(search) &&
        (this.categoriaSeleccionada === 'Todas' || lav.categoria === this.categoriaSeleccionada) &&
        (!this.soloDisponibles || lav.disponible),
    );
  }
  agregado(id: number): boolean {
    return this.carrito.items().some((item) => item.idLavadora === id);
  }
  reservarLavadora(lav: Lavadora): void {
    if (!lav.disponible) return;
    this.carrito.agregarProducto(lav);
    this.anuncio = `${lav.nombre} está en tu reserva.`;
  }
  imagenError(event: Event): void {
    if (event.target instanceof HTMLImageElement) {
      event.target.onerror = null;
      event.target.src = '/assets/lavadora-placeholder.svg';
    }
  }
  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.categoriaSeleccionada = 'Todas';
    this.soloDisponibles = false;
    this.aplicarFiltros();
  }
}
