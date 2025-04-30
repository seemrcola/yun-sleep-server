import { MidwayError } from '@midwayjs/core';

export class UserExistsError extends MidwayError {
  constructor() {
    super('用户已存在', 'USER_EXISTS');
  }
}

export class UserNotFoundError extends MidwayError {
  constructor() {
    super('用户不存在', 'USER_NOT_FOUND');
  }
}

export class UserOrPasswordError extends MidwayError {
  constructor() {
    super('用户名或密码错误', 'USER_OR_PASSWORD_ERROR');
  }
}

export class InvalidTokenError extends MidwayError {
  constructor() {
    super('无效的token', 'INVALID_TOKEN');
  }
} 
