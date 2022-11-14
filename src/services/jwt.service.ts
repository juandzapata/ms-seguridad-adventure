import {/* inject, */ BindingScope, injectable} from '@loopback/core';
import {Keys} from '../config/keys';
let jwt = require('jsonwebtoken');

@injectable({scope: BindingScope.TRANSIENT})
export class JwtService {
  constructor() {}

  /**
   * Se genera un token con la información en formato de JWT
   * @param info datos que quedarán en el token
   * @returns token firmado con la clave secreta
   */
  crearToken(info: object): string {
    try {
      let token = jwt.sign(info, Keys.jwtSecretKey);
      return token;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Se valida un token si es correcto o no
   * @param tk token a validar
   * @returns String con la respuesta
   */
  validarToken(tk: string): string {
    try {
      let info = jwt.verify(tk, Keys.jwtSecretKey);
      console.log(info.rol);
      return info.rol;
    } catch (err) {
      return '';
    }
  }
}
