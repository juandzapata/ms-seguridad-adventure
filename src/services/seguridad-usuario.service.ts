import {/* inject, */ BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import fetch from 'node-fetch';
import {Keys} from '../config/keys';
import {CredencialesLogin, CredencialesRecuperarClave} from '../models';
import {UsuarioRepository} from '../repositories';
import {VerificacionCodigoRepository} from '../repositories/verificacion-codigo.repository';
import {JwtService} from './jwt.service';
var generator = require('generate-password');
var md5 = require('crypto-js/md5');

const params = new URLSearchParams();
const paramsSMS = new URLSearchParams();


@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    private usuarioRepository: UsuarioRepository,
    @service(JwtService)
    private servicioJwt: JwtService,
    @repository(VerificacionCodigoRepository)
    private codigoRepository: VerificacionCodigoRepository
  ) { }

  /**
   * Metodo para la autenticacion de usuarios
   * @param credenciales credenciales de acceso
   * @returns cadena con el token cuando todo esta bien, o una cadena vacia cuando no coinciden las credenciales.
   */

  async identificarUsuario(credenciales: CredencialesLogin): Promise<object> {
    let respuesta = {
      token: '',
      user: {
        nombre: '',
        correo: '',
        rol: '',
        id: '',
      },
    };

    //Para que el usuario pueda ingresar la clave sin cifrar
    let clave = credenciales.clave;
    //let claveCifrada = this.cifrarCadena(clave); //Se omite este paso porque el frontend envia la clave cifrada
  async identificarUsuario(credenciales: CredencialesLogin): Promise<string> {
    let respuesta = "";

    const usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
        clave: clave,
      },
        clave: credenciales.clave
      }
    });

    console.log(usuario);


    if (usuario) {
      // Creación del token y asignación a respuesta
      let datos = {
        nombre: `${usuario.nombres} ${usuario.apellidos}`,
        correo: usuario.correo,
        rol: usuario.rolId,
        id: usuario._id ? usuario._id : '',
      };
      try {
        let tk = this.servicioJwt.crearToken(datos);
        respuesta.token = tk;
        respuesta.user = datos;
        console.log(respuesta);
      try {
        let codigo = this.crearCodigoAleatorio();
        let mensaje = `¡Hola ${usuario.nombres}! <br /> Tu código de verificación es: ${codigo}`

        params.append('hash_validator', 'Admin12345@notificaciones.sender');
        params.append('destination', usuario.correo);
        params.append('subject', Keys.mensajeAsuntoVerificacion);
        params.append('message', mensaje);

        let r = "";

        //console.log(params);
        //console.log(Keys.urlEnviarCorreo);

        await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(async (res: any) => {
          r = await res.text();
        });

        console.log("aqui");


        mensaje = `¡Hola ${usuario.nombres}! Tu código de verificación es: ${codigo}`
        paramsSMS.append('hash_validator', 'Admin12345@notificaciones.sender');
        paramsSMS.append('message', mensaje);
        paramsSMS.append('destination', usuario.celular);

        //console.log("soy tu puto problema");

        await fetch(Keys.urlEnviarSMS, {method: 'POST', body: paramsSMS}).then(async (res: any) => {
          r = await res.text();
        });

        console.log("estoy aqui");

        const codigoVerificacion = await this.codigoRepository.create({
          usuarioId: usuario.correo,
          codigo: codigo,
          estado: false
        });

        //console.log(codigoVerificacion);
        respuesta = 'Código enviado.'


      } catch (err) {
        throw err;
      }
    } else {
      return "Las credenciales no coinciden."
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
   * Genera un codigo aleatorio
   * @returns codigo generado
   */
  crearCodigoAleatorio(): string {
    let codigo = generator.generate({
      length: 4,
      numbers: true,
    });

    console.log(codigo);
    return codigo;
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
   * Se recupera una clave generandola aleatoriamente y enviandola por correo
   * @param credenciales credenciales del usuario a recuperar la clave
   */
   
  async recuperarClave(
    credenciales: CredencialesRecuperarClave,
  ): Promise<boolean> {
    const params = new URLSearchParams();
    
  async recuperarClave(credenciales: CredencialesRecuperarClave): Promise<boolean> {
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

      let mensaje = `Hola ${usuario.nombres} <br /> Su contraseña ha sido actualizada satisfactoriamente. La nueva contraseña es: ${nuevaClave}.<br /> Si no ha sido usted o no logra acceder a la cuenta, comuníquese con +573136824950. <br /><br /> Equipo de soporte Adventure Park.`;

      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('destination', usuario.correo);
      params.append('subject', Keys.mensajeAsuntoRecuperacion);
      params.append('message', mensaje);

      let r = '';

      console.log(params);
      console.log(Keys.urlEnviarCorreo);

      console.log('1');

      await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(
        async (res: any) => {
          console.log('2');
          r = await res.text();
        },
      );

      return r == 'OK';
    } else {
      throw new HttpErrors[400](
        'El correo ingresado no esta asociado a un usuario',
      );
    }
  }

  async correoPrimerContraseña(
    correo: string,
    claveGenerada: string,
  ): Promise<Boolean> {
    const params = new URLSearchParams();
    let usuario = await this.usuarioRepository.findOne({
      where: {
        correo: correo,
      },
  async correoPrimerContraseña(correo: string, claveGenerada: string): Promise<Boolean> {
    let usuario = await this.usuarioRepository.findOne({
      where: {
        correo: correo
      }
    });

    if (usuario) {
      let mensaje = `Hola ${usuario.nombres} <br /> Su usuario ha sido creado satisfactoriamente con el correo: ${correo} y contraseña: ${claveGenerada} <br /> Para modificar la contraseña ingrese al sistema. Si posee problemas para acceder a la cuenta comuníquese con +573136824950. <br /><br /> Equipo de soporte Adventure park.`;

      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('destination', correo);
      params.append('subject', Keys.mensajeAsuntoRegistro);
      params.append('message', mensaje);

      let r = '';

      console.log(params);
      console.log(Keys.urlEnviarCorreo);

      console.log('1');

      await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(
        async (res: any) => {
          console.log('2');
          r = await res.text();
        },
      );

      return r == 'OK';
    } else {
      throw new HttpErrors[400](
        'Error con la confirmación de la creación del usuario',
      );
    }
  }

  /**
   * Funcion para validar el codigo de usuario
   * @param codigo tiene el codigo generado y el usuario al que pertenece
   * @returns un JWT si el codigo es valido, si no retorna una cadena vacia
   */
  async validarCodigo(codigo: string): Promise<string> {
    let respuesta = "";
    let verificar = await this.codigoRepository.findOne({
      where: {
        codigo: codigo
      }
    });

    if (verificar) {

      if (verificar.estado == false) {
        verificar.estado = true;
        this.codigoRepository.updateById(verificar._id, verificar);
        let usuario = await this.usuarioRepository.findOne({
          where: {
            correo: verificar.usuarioId
          }
        });

        if (usuario) {

          const datos = {
            nombre: `${usuario.nombres} ${usuario.apellidos}`,
            correo: usuario.correo,
            rol: usuario.rolId
          };

          try {
            respuesta = this.servicioJwt.crearToken(datos);
          } catch (error) {
            throw error;
          }
        }
      } else {
        respuesta = 'Código inválido.'
      }
    }
    return respuesta;
  }
}
