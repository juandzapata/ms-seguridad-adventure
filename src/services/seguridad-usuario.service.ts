import { /* inject, */ BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import fetch from 'node-fetch';
import {Keys} from '../config/keys';
import {CredencialesLogin, CredencialesRecuperarClave} from '../models';
import {UsuarioRepository} from '../repositories';
import {JwtService} from './jwt.service';
var generator = require('generate-password');
var md5 = require('crypto-js/md5');
const params = new URLSearchParams();

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

    console.log(credenciales.correo);
    console.log(credenciales.clave);
    console.log(usuario);

    if (usuario) {
      // Creación del token y asignación a respuesta
      const datos = {
        nombre: `${usuario.nombres} ${usuario.apellidos}`,
        correo: usuario.correo,
        rol: usuario.rolId,
      };
      try {
        respuesta = this.servicioJwt.crearToken(datos);
        console.log(respuesta);
      } catch (err) {
        throw err;
      }
    } else {
      console.log('No se está retornando ningún token');
    }
    return respuesta;
  }

  /**
   * Genera una clave aleatoria
   * @returns Retorna la clave aleatoria
   */
  crearClaveAleatoria(): string {
    let password = generator.generate({
      length: 10,
      numbers: true,
      symbols: true,
      uppercase: true,
    });
    console.log(password);
    return password;
  }

  /**
   * Cifra una cadena
   * @param cadena Una cadena para cifrar
   * @returns la cadena cifrada
   */
  cifrarCadena(cadena: string): string {
    let cadenaCifrada = md5(cadena).toString();
    return cadenaCifrada;
  }

  /**
   * Se recupera la clave generandola aleatoriamente y enviandola por correo
   * @param credenciales credenciales del usuario a recuperar la contraseña
   */
  async recuperarClave(
    credenciales: CredencialesRecuperarClave,
  ): Promise<Boolean> {
    let usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
      },
    });

    if (usuario) {

      let nuevaClave = this.crearClaveAleatoria();
      let nuevaClaveCifrada = this.cifrarCadena(nuevaClave);
      usuario.clave = nuevaClaveCifrada;
      this.usuarioRepository.updateById(usuario._id, usuario);

      let mensaje = `Hola ${usuario.nombres} <br /> Su contraseña ha sido actualizada satisfactoriamente y la nueva es ${nuevaClave}. <br /> <br /> Si no ha sido usted o no logra acceder a la cuenta, comuníquese al +573104572663 <br /><br /> Equipo de soporte Adventure Park.`;
      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('destination', usuario.correo)
      params.append('subject', Keys.mensajeAsuntoRecuperaClave)
      params.append('message', mensaje)


      let r = ''
      await fetch(Keys.urlEnviarCorreo, {
        method: 'POST',
        body: params,
      }).then(async (res: any) => {
        r = await res.text();
        console.log(r);
      });
      console.log('R:' + r);

      return r == "OK";

    } else {
      throw new HttpErrors[400](
        'El correo ingresado no está asociado a ningún usuario.',
      );
    }
  }
}
