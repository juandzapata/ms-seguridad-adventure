import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
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
  response
} from '@loopback/rest';
import fetch from 'node-fetch';
import {Keys} from '../config/keys';
import {
  CredencialesLogin,
  CredencialesRecuperarClave,
  Usuario
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
  ) { }

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
  ): Promise<Usuario | null> {
    let claveGenerada = this.servicioSeguridad.crearClaveAleatoria();
    let claveCifrada = this.servicioSeguridad.cifrarCadena(claveGenerada);
    usuario.clave = claveCifrada;
    console.log(claveGenerada);

    let peticionUsuario = await this.usuarioRepository.findOne({
      where: {
        correo: usuario.correo
      }
    });

    if (!peticionUsuario) {
      // Notificar al usuario de que se ha creado en el sistema
      const usuarioCreado = await this.usuarioRepository.create(usuario);
      await this.servicioSeguridad.correoPrimerContraseña(usuario.correo, claveGenerada);
      return usuarioCreado;

    } else {
      return null
    }


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
  ): Promise<object | null> {
    try {
      let mensaje = await this.servicioSeguridad.identificarUsuario(
        credenciales,
      );
      return mensaje;
    } catch (err) {
      throw new HttpErrors[400](
        `Se ha generado un error en la validación de las credenciales para el usuario: ${credenciales.correo}`,
      );
    }
  }

  @get('/enviarSMS/{username}')
  @response(200, {
    description: 'Enviar SMS',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Object),
      },
    },
  })
  async enviarSMS(
    @param.path.string('username') username: string,
  ): Promise<boolean> {
    return this.servicioSeguridad.enviarSMS(username);
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
  ): Promise<Object | null> {
    return this.servicioSeguridad.validarCodigo(codigo);
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
  ): Promise<Boolean> {
    try {
      return await this.servicioSeguridad.recuperarClave(credenciales);
    } catch (err) {
      throw new HttpErrors[400](
        `Se ha generado un error en la recuperaciónde la clave para el correo: ${credenciales.correo}`,
      );
    }
  }

  @post('/validate-password-singup')
  @response(200, {
    description: 'Validar clave inicio de sesión',
    content: {
      'application/json': {schema: getModelSchemaRef(CredencialesLogin)},
    },
  })
  async ConfirmarClave(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CredencialesLogin),
        },
      },
    })
    credenciales: CredencialesLogin,
  ): Promise<Boolean> {
    return this.servicioSeguridad.claveValida(credenciales);
  }

  @post('/validate-password/{newPassword}')
  @response(200, {
    description: 'Cambio de la clave',
    content: {
      'application/json': {schema: getModelSchemaRef(CredencialesLogin)},
    },
  })
  async CambiarClave(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CredencialesLogin),
        },
      },
    })
    @param.path.string('newPassword')
    newPassword: string,
    credenciales: CredencialesLogin,
  ): Promise<Boolean> {
    try {
      const params = new URLSearchParams();
      let respuesta = false;
      let user = await this.servicioSeguridad.validarClave(credenciales);
      if (user) {
        let newPasswordCifrada =
          this.servicioSeguridad.cifrarCadena(newPassword);
        user.clave = newPasswordCifrada;
        this.usuarioRepository.updateById(user._id, user);

        let texto = 'Tu contraseña ha sido actualizada satisfactoriamente ';
        let asunto = 'Cambio de contraseña';

        params.append('hash_validator', 'Admin12345@notificaciones.sender');
        params.append('nombre', user.nombres);
        params.append('correo', credenciales.correo);
        params.append('asunto', asunto);
        params.append('clave', newPassword);
        params.append('texto', texto);

        let r = '';

        await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(
          async (res: any) => {
            r = await res.text();
          },
        );

        respuesta = true;
      }

      return respuesta;
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
