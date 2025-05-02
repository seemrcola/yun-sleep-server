import { Inject, Controller, Post, Body, Get } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { UserService } from '../service/user.service';
import { RegisterDTO, LoginDTO } from '../dto/user.dto';
import { Validate } from '@midwayjs/validate';
import { JwtMiddleware } from '../middleware/jwt.middleware';

@Controller('/api/user')
export class UserController {
  @Inject()
  ctx: Context;

  @Inject()
  userService: UserService;

  @Post('/register')
  @Validate()
  async register(@Body() body: RegisterDTO) {
    const user = await this.userService.register(body);
    return { success: true, message: '注册成功', data: user };
  }

  @Post('/login')
  @Validate()
  async login(@Body() body: LoginDTO) {
    const user = await this.userService.login(body.username, body.password);
    return { success: true, message: '登录成功', data: user };
  }

  @Get('/refresh-token')
  async refreshToken() {
    const user = this.ctx.state.user;
    const newToken = await this.userService.refreshToken(user);
    return { success: true, message: 'Token刷新成功', data: { token: newToken } };
  }

  @Post('/logout')
  async logout() {
    // 由于使用的是 JWT，服务端不需要维护会话状态
    // 客户端需要自行删除 token
    return { success: true, message: '登出成功' };
  }

  @Post('/getUserInfo', { middleware: [JwtMiddleware] })
  async getUserInfo() {
    const user = await this.userService.getUserInfo();
    return { success: true, message: '获取用户信息成功', data: user };
  }
}
