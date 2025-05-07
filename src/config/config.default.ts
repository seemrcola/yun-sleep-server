import { MidwayConfig } from '@midwayjs/core';
import { User } from '../entity/user.entity';
import { Room } from '../entity/room.entity';
import 'dotenv/config';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1714347771234_1234',
  koa: {
    port: 7001,
  },
  typeorm: {
    dataSource: {
      default: {
        type: 'postgres',
        url: process.env.POSTGRES_URL,
        entities: [User, Room],
        synchronize: true, // 自动同步数据库结构，生产环境建议关闭
        logging: true, // 打印数据库查询日志
      },
    },
  },
  socketIO: {
    port: 7001, // 使用与 HTTP 服务器相同的端口
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
      credentials: true // 允许携带凭证
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET, // 在实际应用中应该使用环境变量
    expiresIn: '24h',
  },
} as MidwayConfig;
