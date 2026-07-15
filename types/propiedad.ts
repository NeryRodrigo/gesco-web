export type Propiedad = {
  propiedadId: number;
  empresaId: number;
  agenteId: number;
  titulo: string;
  ciudad: string;
  precioVentaGs: number;
  superficieLoteM2: number;
  areaConstruccionM2: number;
  nroAmbientes: number;
  nroDormitorios: number;
  nroBaños: number;
  tieneJardin: boolean;
  aptoOficina: boolean;
  descripcionRemax: string;
  latitud: number;
  longitud: number;
  fechaFirmaContrato?: string;
  fechaCaducidad?: string;
  fechaCreacion?: string;
  agenteCreadorNombre?: string;
  mlsid: string;
  sync: boolean;
  esAprobada: boolean;
  imagenUrl?: string; // Para la UI y backend
  fotoAgenteUrl?: string;
  documentos?: DocumentoPropiedad[];
  operacion?: string; // Para la UI
};

export type DocumentoPropiedad = {
  documentoPropiedadId?: number;
  propiedadId: number;
  categoria: string;
  tipoDocumento: string;
  url: string;
  fechaSubida?: string;
};
