import { Middleware, Inject } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/koa';
import { AuthUtil } from '../util/auth.util';
import { InvalidTokenError } from '../error/user.error';

@Middleware()
export class JwtMiddleware {
  @Inject()
  authUtil: AuthUtil;

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      // 从请求头中获取 token
      const token = ctx.get('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        throw new InvalidTokenError();
      }

      // 验证 token
      const payload = this.authUtil.verifyToken(token);
      if (!payload) {
        throw new InvalidTokenError();
      }

      // 将用户信息添加到上下文
      ctx.state.user = payload;

      // 继续处理请求
      await next();
    };
  }
} 
