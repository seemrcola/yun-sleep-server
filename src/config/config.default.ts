import { MidwayConfig } from '@midwayjs/core';
import { User } from '../entity/user.entity';
import { Room } from '../entity/room.entity';

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
        url: 'postgresql://neondb_owner:npg_je3DKtcEk5Or@ep-solitary-sky-a4dj7izq-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
        entities: [User, Room],
        synchronize: true, // 自动同步数据库结构，生产环境建议关闭
        logging: true, // 打印数据库查询日志
      },
    },
  },
  jwt: {
    secret: 'your-jwt-secret-key', // 在实际应用中应该使用环境变量
    expiresIn: '24h',
  },
} as MidwayConfig;
