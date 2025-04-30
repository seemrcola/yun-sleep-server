import { Middleware } from '@midwayjs/core';
import * as cors from '@koa/cors';

@Middleware()
export class CorsMiddleware {
  resolve() {
    return cors({
      origin: '*', // 允许所有域名访问，生产环境建议配置具体的域名
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposeHeaders: ['Content-Length', 'Content-Type'],
      maxAge: 86400, // 预检请求结果缓存时间，单位秒
      credentials: true, // 允许发送 cookie
    });
  }
} 
