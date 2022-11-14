import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {
  CredencialesLogin,
  CredencialesRecuperarClave,
  Usuario,
} from '../models';
import {UsuarioRepository} from '../repositories';
import {JwtService, SeguridadUsuarioService} from '../services';

export class UsuarioController {
  constructor(
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,
    @service(SeguridadUsuarioService)
    private servicioSeguridad: SeguridadUsuarioService,
    @service(JwtService)
    private servicioJWT: JwtService,
  ) {}

  @post('/usuarios')
  @response(200, {
    description: 'Usuario model instance',
    content: {'application/json': {schema: getModelSchemaRef(Usuario)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {
            title: 'NewUsuario',
            exclude: ['_id'],
          }),
        },
      },
    })
    usuario: Omit<Usuario, '_id'>,
  ): Promise<Usuario> {
    let claveGenerada = this.servicioSeguridad.crearClaveAleatoria();
    let claveCifrada = this.servicioSeguridad.cifrarCadena(claveGenerada);
    usuario.clave = claveCifrada;
    console.log(claveGenerada);

    // Notificar al usuario de que se ha creado en el sistema
    const usuarioCreado = await this.usuarioRepository.create(usuario);
    await this.servicioSeguridad.correoPrimerContraseña(
      usuario.correo,
      claveGenerada,
    );
    return usuarioCreado;
  }

  @get('/usuarios/count')
  @response(200, {
    description: 'Usuario model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Usuario) where?: Where<Usuario>): Promise<Count> {
    return this.usuarioRepository.count(where);
  }

  @get('/usuarios')
  @response(200, {
    description: 'Array of Usuario model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Usuario, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    //comentario
    @param.filter(Usuario) filter?: Filter<Usuario>,
  ): Promise<Usuario[]> {
    return this.usuarioRepository.find(filter);
  }

  @patch('/usuarios')
  @response(200, {
    description: 'Usuario PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.updateAll(usuario, where);
  }

  @get('/usuarios/{id}')
  @response(200, {
    description: 'Usuario model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Usuario, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Usuario, {exclude: 'where'})
    filter?: FilterExcludingWhere<Usuario>,
  ): Promise<Usuario> {
    return this.usuarioRepository.findById(id, filter);
  }

  @patch('/usuarios/{id}')
  @response(204, {
    description: 'Usuario PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.updateById(id, usuario);
  }

  @put('/usuarios/{id}')
  @response(204, {
    description: 'Usuario PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.replaceById(id, usuario);
  }

  @del('/usuarios/{id}')
  @response(204, {
    description: 'Usuario DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.usuarioRepository.deleteById(id);
  }

  /**
   * El bloque de métodos personalizados para la seguridad del usuario
   */
  @post('/login')
  @response(200, {
    description: 'Identificación de usuarios',
    content: {
      'application/json': {schema: getModelSchemaRef(CredencialesLogin)},
    },
  })
  async identificar(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CredencialesLogin),
        },
      },
    })
    credenciales: CredencialesLogin,
  ): Promise<object> {
    try {
      let obj = await this.servicioSeguridad.identificarUsuario(credenciales);
      return obj;
    } catch (err) {
      throw new HttpErrors[400](
        `Se ha generado un error en la validación de las credenciales para el usuario: ${credenciales.correo}`,
      );
    }
  }

  @get('/validate-token/{jwt}')
  @response(200, {
    description: 'Validar un token JWT',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Object),
      },
    },
  })
  async validateJWT(@param.path.string('jwt') jwt: string): Promise<string> {
    let valido = this.servicioJWT.validarToken(jwt);
    return valido;
  }

  @get('/validate-code/{code}')
  @response(200, {
    description: 'Validar código',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Object),
      },
    },
  })
  async validateCode(
    @param.path.string('code') codigo: string,
  ): Promise<string> {
    let valido = this.servicioSeguridad.validarCodigo(codigo);
    return valido;
  }

  /**
   * El bloque de métodos personalizados para la seguridad del usuario
   */
  @post('/recuperar-clave')
  @response(200, {
    description: 'Identificación de usuarios',
    content: {
      'application/json': {schema: getModelSchemaRef(CredencialesLogin)},
    },
  })

  async RecuperarClave(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CredencialesRecuperarClave),
        },
      },
    })
    credenciales: CredencialesRecuperarClave,
    credenciales: CredencialesRecuperarClave
  ): Promise<Boolean> {
    try {
      return await this.servicioSeguridad.recuperarClave(credenciales);
    } catch (err) {
      throw new HttpErrors[400](
        `Se ha generado un error en la recuperaciónde la clave para el correo: ${credenciales.correo}`,
      );
    }
  }


  /**
   *
   * @param jwt
   * @returns
   */
  @get('check-validate-token/{jwt}')
  @response(200, {
    description: 'Validar un token JWT',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Object),
      },
    },
  })
  async checkSessionJWT(
    @param.path.string('jwt') jwt: string,
  ): Promise<boolean> {
    let rolId = this.servicioJWT.validarToken(jwt);
    return rolId != '';
  }

}
