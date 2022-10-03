import { /* inject, */ BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {CredencialesLogin} from '../models';
import {UsuarioRepository} from '../repositories';
import {JwtService} from './jwt.service';

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    private usuarioRepository: UsuarioRepository,
    @service(JwtService)
    private servicioJwt: JwtService,
  ) {}

  /**
   * Método para la autenticación de usuarios
   * @param credenciales credenciales de acceso
   * @returns una cadena con el token cuando todo está bien, o una cadena vacia cuando no coinciden las credenciales
   */
  async identificarUsuario(credenciales: CredencialesLogin): Promise<string> {
    let respuesta = '';

    const usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
        clave: credenciales.clave,
      },
    });

    if (usuario) {
      // Creación del token y asignación a respuesta
      const datos = {
        nombre: `${usuario.nombres} ${usuario.apellidos}`,
        correo: usuario.email,
        rol: usuario.rolId,
      };
      try {
        respuesta = this.servicioJwt.crearToken(datos);
        console.log(respuesta);
      } catch (err) {
        throw err;
      }
    }
    return respuesta;
  }
}
