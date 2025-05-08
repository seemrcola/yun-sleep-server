import { Provide, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { User } from '../entity/user.entity';
import { UserExistsError, UserOrPasswordError } from '../error/user.error';
import { InjectDataSource } from '@midwayjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthUtil } from '../util/auth.util';
import { Context } from '@midwayjs/koa';

@Provide()
@Scope(ScopeEnum.Singleton)
export class UserService {
  @InjectDataSource()
  dataSource: DataSource;

  @Inject()
  authUtil: AuthUtil;

  @Inject()
  ctx: Context;

  async register(data: { username: string; password: string; nickname?: string }) {
    const userRepository = this.dataSource.getRepository(User);

    // 检查用户是否已存在
    const existUser = await userRepository.findOne({
      where: { username: data.username }
    });

    if (existUser) {
      throw new UserExistsError();
    }

    // 密码加密
    const hashedPassword = await this.authUtil.hashPassword(data.password);

    // 创建新用户
    const user = userRepository.create({
      ...data,
      password: hashedPassword
    });
    await userRepository.save(user);

    // 返回用户信息和 token
    const { password, ...userInfo } = user;
    return { ...userInfo };
  }

  async login(username: string, password: string) {
    const userRepository = this.dataSource.getRepository(User);

    // 查找用户
    const user = await userRepository.findOne({
      where: { username }
    });

    if (!user) {
      throw new UserOrPasswordError();
    }

    // 验证密码
    const isPasswordValid = await this.authUtil.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UserOrPasswordError();
    }

    // 生成 token
    const token = this.authUtil.generateToken({ userId: user.id, username: user.username });

    // 返回用户信息和 token
    const { password: _, ...userInfo } = user;
    return { ...userInfo, token };
  }

  async refreshToken(user: { userId: number; username: string }) {
    // 生成新的 token
    return this.authUtil.generateToken({ userId: user.userId, username: user.username });
  }

  async getUserInfo() {
    const userRepository = this.dataSource.getRepository(User);
    console.log(this.ctx.state, '---------');
    const user = await userRepository.findOne({
      where: { id: this.ctx.user.userId }
    });

    return user;
  }
}
