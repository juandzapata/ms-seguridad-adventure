import {/* inject, */ BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import fetch from 'node-fetch';
import {Keys} from '../config/keys';
import {
  CredencialesLogin,
  CredencialesRecuperarClave,
  Usuario,
} from '../models';
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
    
    private codigoRepository: VerificacionCodigoRepository,
  ) {}

  /**
   * Metodo para la autenticacion de usuarios
   * @param credenciales credenciales de acceso
   * @returns cadena con el token cuando todo esta bien, o una cadena vacia cuando no coinciden las credenciales.
   */

  async identificarUsuario(
    credenciales: CredencialesLogin,
  ): Promise<object | null> {
    const paramsSMS = new URLSearchParams();
    const params = new URLSearchParams();

    let respuesta = {
      nombre: '',
      correo: '',
      rol: '',
      id: '',
      imagenPerfil: '',
    };

    //Para que el usuario pueda ingresar la clave sin cifrar
    let clave = credenciales.clave;
    //let claveCifrada = this.cifrarCadena(clave); //Se omite este paso porque el frontend envia la clave cifrada
  async identificarUsuario(credenciales: CredencialesLogin): Promise<string> {
    let respuesta = "";

    const usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
        clave: credenciales.clave,
      },
        clave: credenciales.clave
      }
    });

    if (usuario) {
      try {
        let codigo = this.crearCodigoAleatorio();
        let mensaje = `¡Hola ${usuario.nombres}! <br /> Tu código de verificación es: ${codigo}`;
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


        let r = '';

        console.log(params);
        console.log(Keys.urlEnviarCorreoCodigo);

        await fetch(Keys.urlEnviarCorreoCodigo, {
          method: 'POST',
          body: params,
        }).then(async (res: any) => {
          r = await res.text();
        });

        mensaje = `¡Hola ${usuario.nombres}! Tu código de verificación es: ${codigo}`;

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

        await fetch(Keys.urlEnviarSMS, {method: 'POST', body: paramsSMS}).then(
          async (res: any) => {
            r = await res.text();
          },
        );


        const codigoVerificacion = await this.codigoRepository.create({
          usuarioId: usuario.correo,
          codigo: codigo,
          estado: false,
        });

        console.log(codigoVerificacion);
        respuesta = {
          nombre: `${usuario.nombres} ${usuario.apellidos}`,
          correo: usuario.correo,
          rol: usuario.rolId,
          id: usuario._id ? usuario._id : '',
          imagenPerfil: usuario.imagenPerfil ? usuario.imagenPerfil : '',
        };
        });

        //console.log(codigoVerificacion);
        respuesta = 'Código enviado.'


      } catch (err) {
        throw err;
      }
      return respuesta;
    } else {

      return null;
    }
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

      let texto = 'Tu contraseña ha sido actualizada satisfactoriamente ';

      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('correo', usuario.correo);
      params.append('nombre', usuario.nombres);
      params.append('texto', texto);
      params.append('clave', nuevaClave);

      let r = '';

      //console.log(params);
      //console.log(Keys.urlEnviarCorreo);

      await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(
        async (res: any) => {
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
      let texto = 'Tu usuario ha sido creado satisfactoriamente ';

      params.append('hash_validator', 'Admin12345@notificaciones.sender');
      params.append('nombre', usuario.nombres);
      params.append('correo', correo);
      params.append('clave', claveGenerada);
      params.append('texto', texto);

      let r = '';

      await fetch(Keys.urlEnviarCorreo, {method: 'POST', body: params}).then(
        async (res: any) => {
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
  async validarCodigo(codigo: string): Promise<Object | null> {
    let respuesta = {
      token: '',
      user: {
        nombre: '',
        correo: '',
        rol: '',
        id: '',
        imagenPerfil: '',
      },
    };

    let verificar = await this.codigoRepository.findOne({
      where: {
        codigo: codigo,
      },
    });

    if (verificar) {
      if (verificar.estado == false) {
        verificar.estado = true;
        this.codigoRepository.updateById(verificar._id, verificar);
        let usuario = await this.usuarioRepository.findOne({
          where: {
            correo: verificar.usuarioId,
          },
        });

        if (usuario) {
          const datos = {
            nombre: `${usuario.nombres} ${usuario.apellidos}`,
            correo: usuario.correo,
            rol: usuario.rolId,
            id: usuario._id ? usuario._id : '',
            imagenPerfil: usuario.imagenPerfil ? usuario.imagenPerfil : '',
          };

          try {
            let token = this.servicioJwt.crearToken(datos);
            respuesta.token = token;
            respuesta.user = datos;
           
          } catch (error) {
            throw error;
          }
        }
      } else {

        console.log('No se esta retornando ningun token');
      }
      return respuesta;
    } else {
      return null;
    }
  }

  async claveValida(credenciales: CredencialesLogin): Promise<Boolean> {
    let respuesta = false;
    let claveCifrada = this.cifrarCadena(credenciales.clave);
    let verificar = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
        clave: claveCifrada,
      },
    });

    if (verificar) {
      respuesta = true;
    } else {
      respuesta = false;
    }

    return respuesta;
  }

  async validarClave(credenciales: CredencialesLogin): Promise<Usuario | null> {
    let claveCifrada = this.cifrarCadena(credenciales.clave);
    let verificar = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
        clave: claveCifrada,
      },
    });

    if (verificar) {
      console.log('Clave correcta, puede ingresar una clave nueva');
    } else {
      console.log('El usuario no existe');
    }

    return verificar;
  }

}
