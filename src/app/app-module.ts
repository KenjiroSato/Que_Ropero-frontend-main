import { NgModule, provideAppInitializer, inject, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-CO';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Header } from './template/header/header';
import { Footer } from './template/footer/footer';
import { Home } from './home/home';
import { Login } from './login/login';
import { UsuarioService } from './servicios/usuario';
import { apiInterceptor } from './servicios/api-interceptor';
registerLocaleData(localeEs);
@NgModule({
  declarations: [App, Header, Footer, Home, Login],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([apiInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    provideAppInitializer(() => firstValueFrom(inject(UsuarioService).restaurarSesion()))],
  bootstrap: [App],
})
export class AppModule {}
