import { Provide, Config, Scope, ScopeEnum } from '@midwayjs/core';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

@Provide()
@Scope(ScopeEnum.Singleton)
export class AuthUtil {
  @Config('jwt.secret')
  jwtSecret: string;

  @Config('jwt.expiresIn')
  jwtExpiresIn: string;

  private readonly SALT_ROUNDS = 10;

  // 密码加密
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // 密码验证
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // 生成 JWT token
  generateToken(payload: any): string {
    const options: SignOptions = {
      expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn']
    };
    return jwt.sign(payload, this.jwtSecret, options);
  }

  // 验证 JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }
} 
