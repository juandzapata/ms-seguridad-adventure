import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongodbDataSource} from '../datasources';
import {VerificacionCodigo, VerificacionCodigoRelations} from '../models/verificacion-codigo.model';

export class VerificacionCodigoRepository extends DefaultCrudRepository<
  VerificacionCodigo,
  typeof VerificacionCodigo.prototype._id,
  VerificacionCodigoRelations
> {
  constructor(
    @inject('datasources.mongodb') dataSource: MongodbDataSource,
  ) {
    super(VerificacionCodigo, dataSource);
  }
}
