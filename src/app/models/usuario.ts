import { z } from 'zod';

export const RolSchema = z.enum(['Cliente', 'Administrador', 'Operador Logistico']);
export const UsuarioSchema = z.object({
  id: z.number().int().positive(), nombre: z.string(), correo: z.string(), celular: z.string(),
  direccion: z.string(), documento: z.string(), tipoUsuario: RolSchema, fechaRegistro: z.string(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;
export const SesionSchema = z.object({ usuario: UsuarioSchema });
export const LavadoraSchema = z.object({
  idLavadora: z.number().int().positive(), codigo: z.string(), nombre: z.string(), modelo: z.string(),
  categoria: z.string(), capacidadKg: z.number().positive(), precio: z.number().positive(),
  cantidad: z.number().int().nonnegative(), disponible: z.boolean(), estado: z.string(),
  caracteristicas: z.string(), barrioUbicacion: z.string(), imagen: z.string(),
});
export type Lavadora = z.infer<typeof LavadoraSchema>;
export const ItemCarritoSchema = LavadoraSchema.pick({ idLavadora: true, nombre: true, modelo: true, precio: true, imagen: true })
  .extend({ horasAlquiler: z.number().int().min(1).max(72) });
export type ItemCarrito = z.infer<typeof ItemCarritoSchema>;
export const ReservaSchema = z.object({
  idReserva: z.number().int().positive(), idLavadora: z.number().int().positive(), horasAlquiler: z.number(),
  direccionEntrega: z.string(), fechaInicio: z.string(), fechaFin: z.string(), total: z.number(),
  estado: z.enum(['Activa', 'Recoleccion solicitada', 'Finalizada']), nombreLavadora: z.string(),
  modelo: z.string(), imagen: z.string(), metodoPago: z.string(), estadoPago: z.string(), nombreCliente: z.string(),
});
export type Reserva = z.infer<typeof ReservaSchema>;
export interface RegistroUsuario { nombre: string; correo: string; celular: string; direccion: string; documento: string; password: string; }
export type EditarUsuario = Pick<Usuario, 'nombre' | 'correo' | 'celular' | 'direccion' | 'tipoUsuario'>;
export interface SolicitudReserva { direccionEntrega: string; metodoPago: 'Efectivo'; items: Pick<ItemCarrito, 'idLavadora' | 'horasAlquiler'>[]; }
