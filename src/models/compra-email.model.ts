import {Entity, model, property} from '@loopback/repository';

@model()
export class CompraEmail extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'string',
    required: true,
  })
  nombreUsuario: string;

  @property({
    type: 'string',
    required: true,
  })
  correoUsuario: string;

  @property({
    type: 'string',
    required: true,
  })
  cedulaUsuario: string;

  @property({
    type: 'string',
    required: true,
  })
  compraId: string;

  @property({
    type: 'string',
    required: true,
  })
  fechaCompra: string;

  @property({
    type: 'string',
    required: true,
  })
  totalCompra: string;


  constructor(data?: Partial<CompraEmail>) {
    super(data);
  }
}

export interface CompraEmailRelations {
  // describe navigational properties here
}

export type CompraEmailWithRelations = CompraEmail & CompraEmailRelations;
