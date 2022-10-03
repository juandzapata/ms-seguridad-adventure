import {inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor, HasManyRepositoryFactory} from '@loopback/repository';
import {MongodbDataSource} from '../datasources';
import {Usuario, UsuarioRelations, Rol, AuditoriaLogin} from '../models';
import {RolRepository} from './rol.repository';
import {AuditoriaLoginRepository} from './auditoria-login.repository';

export class UsuarioRepository extends DefaultCrudRepository<
  Usuario,
  typeof Usuario.prototype._id,
  UsuarioRelations
> {

  public readonly rol: BelongsToAccessor<Rol, typeof Usuario.prototype._id>;

  public readonly auditoriaLogins: HasManyRepositoryFactory<AuditoriaLogin, typeof Usuario.prototype._id>;

  constructor(
    @inject('datasources.mongodb') dataSource: MongodbDataSource, @repository.getter('RolRepository') protected rolRepositoryGetter: Getter<RolRepository>, @repository.getter('AuditoriaLoginRepository') protected auditoriaLoginRepositoryGetter: Getter<AuditoriaLoginRepository>,
  ) {
    super(Usuario, dataSource);
    this.auditoriaLogins = this.createHasManyRepositoryFactoryFor('auditoriaLogins', auditoriaLoginRepositoryGetter,);
    this.registerInclusionResolver('auditoriaLogins', this.auditoriaLogins.inclusionResolver);
    this.rol = this.createBelongsToAccessorFor('rol', rolRepositoryGetter,);
    this.registerInclusionResolver('rol', this.rol.inclusionResolver);
  }
}
