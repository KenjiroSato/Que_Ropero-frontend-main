import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
const ErrorSchema = z.object({ mensaje: z.string() });
export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const parsed = ErrorSchema.safeParse(error.error);
    if (parsed.success) return parsed.data.mensaje;
    if (error.status === 0)
      return 'No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.';
  }
  return 'No pudimos completar la operación. Inténtalo nuevamente.';
}
