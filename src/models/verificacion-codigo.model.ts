import {Entity, model, property} from '@loopback/repository';

@model()
export class VerificacionCodigo extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  _id?: string;

  @property({
    type: 'string',
    required: true,
  })
  usuarioId: string;

  @property({
    type: 'boolean',
    required: true,
  })
  estado: boolean;

  @property({
    type: 'string',
    required: true,
  })
  codigo: string;

  constructor(data?: Partial<VerificacionCodigo>) {
    super(data);
  }
}

export interface VerificacionCodigoRelations {
  // describe navigational properties here
}

export type VerificacionCodigoWithRelations = VerificacionCodigo & VerificacionCodigoRelations;
