import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  busqueda = '';
  readonly notFound: boolean;
  constructor(
    private router: Router,
    route: ActivatedRoute,
  ) {
    this.notFound = route.snapshot.data['notFound'] === true;
  }
  buscar(): void {
    this.router.navigate(['/productos'], {
      queryParams: this.busqueda.trim() ? { q: this.busqueda.trim() } : {},
    });
  }
}
