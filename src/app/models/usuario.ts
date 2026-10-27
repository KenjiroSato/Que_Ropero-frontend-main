export interface Usuario {
    id: number;
    nombre: string;
    correo?: string;
    celular?: string;
    direccion?: string;
    documento?: string;
    tipoUsuario?: string;
    password?: string;
    fechaRegistro: Date;
}

export interface Lavadora {
    idLavadora: number;
    codigo: string;
    nombre: string;
    modelo: string;
    categoria: string;
    capacidadKg: number;
    precio: number;
    cantidad: number;
    disponible: boolean;
    estado: string;
    proveedor?: string;
    caracteristicas?: string;
    barrioUbicacion?: string;
    imagen: string;
    horasAlquiler?: number;
}