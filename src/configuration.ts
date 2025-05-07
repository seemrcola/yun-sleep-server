import { Configuration, App, Inject } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as validate from '@midwayjs/validate';
import * as typeorm from '@midwayjs/typeorm';
import * as socketio from '@midwayjs/socketio';
import * as info from '@midwayjs/info';
import { join } from 'path';
import { DefaultErrorFilter } from './filter/default.filter';
import { ReportMiddleware } from './middleware/report.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { SocketIoService } from './sokcetio';

@Configuration({
  imports: [
    koa,
    validate,
    typeorm,
    socketio,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
  ],
  importConfigs: [join(__dirname, './config')],
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  @App('socketIO')
  socketApp: socketio.Application;

  @Inject()
  socketIoService: SocketIoService;

  async onReady() {
    // add middleware
    this.app.useMiddleware([CorsMiddleware, ReportMiddleware]);
    // add filter
    this.app.useFilter(DefaultErrorFilter);

    // 初始化房间数据
    await this.socketIoService.init();
  }
}
