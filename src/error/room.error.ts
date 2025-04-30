import { MidwayError } from '@midwayjs/core';

export class UserAlreadyInRoomError extends MidwayError {
  constructor() {
    super('用户已经属于一个房间', 'USER_ALREADY_IN_ROOM');
  }
}

export class RoomNotFoundError extends MidwayError {
  constructor() {
    super('房间不存在', 'ROOM_NOT_FOUND');
  }
}


