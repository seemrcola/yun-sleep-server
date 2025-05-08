import { Middleware, Inject } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/koa';
import { AuthUtil } from '../util/auth.util';
import { InvalidTokenError } from '../error/user.error';

@Middleware()
export class JwtMiddleware {
  @Inject()
  authUtil: AuthUtil;

  @Inject()
  ctx: Context;

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      // 从请求头中获取 token
      const token = ctx.get('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        throw new InvalidTokenError();
      }

      // 验证 token
      const payload = this.authUtil.verifyToken(token);
      console.log(payload, 'payload');
      if (!payload) {
        throw new InvalidTokenError();
      }
      // 将用户信息添加到上下文
      console.log(this.ctx, 'this.ctx');
      this.ctx.user = payload;
      console.log(this.ctx.user, 'this.ctx.state');
      // 继续处理请求
      await next();
    };
  }
} 
