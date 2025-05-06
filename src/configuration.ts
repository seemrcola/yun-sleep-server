import { Configuration, App, Inject } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as validate from '@midwayjs/validate';
import * as typeorm from '@midwayjs/typeorm';
import * as info from '@midwayjs/info';
import { join } from 'path';
import { DefaultErrorFilter } from './filter/default.filter';
import { ReportMiddleware } from './middleware/report.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { SocketIoService } from './sokcetio';
import * as http from 'http';

@Configuration({
  imports: [
    koa,
    validate,
    typeorm,
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

  @Inject()
  socketIoService: SocketIoService;

  private server: http.Server;

  async onReady() {
    // add middleware
    this.app.useMiddleware([CorsMiddleware, ReportMiddleware]);
    // add filter
    this.app.useFilter(DefaultErrorFilter);

    // 创建 HTTP 服务器
    this.server = this.app.getApplicationContext().get('httpServer');

    // 初始化 Socket.IO
    this.socketIoService.setupSocketServer(this.server);

    // 初始化房间数据
    await this.socketIoService.init();
  }
}
