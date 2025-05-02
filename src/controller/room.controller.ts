import { Controller, Inject, Post, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { RoomService } from '../service/room.service';
import { CreateRoomDTO } from '../dto/room.dto';
import { JwtMiddleware } from '../middleware/jwt.middleware';

@Controller('/api/room')
export class RoomController {
  @Inject()
  ctx: Context;

  @Inject()
  roomService: RoomService;

  @Post('/create', { middleware: [JwtMiddleware] })
  async create(@Body() body: CreateRoomDTO) {
     const room = await this.roomService.create(body);
     return {
      success: true,
      message: '创建房间成功',
      data: room
     }
  }

  @Post('/list', { middleware: [JwtMiddleware] })
  async list() {
    const rooms = await this.roomService.list();
    return {
      success: true,
      message: '获取房间列表成功',
      data: rooms
    }
  }

  @Post('/getRoomById', { middleware: [JwtMiddleware] })
  async getRoomById(@Body() body: { roomId: number }) {
    const room = await this.roomService.getRoomById(body.roomId);
    return {
      success: true,
      message: '获取房间详情成功',
      data: room
    }
  }

  @Post('/leave', { middleware: [JwtMiddleware] })
  async leave(@Body() body: { roomId: number }) {
    const room = await this.roomService.leaveRoom(body.roomId);
    return {
      success: true,
      message: '离开房间成功',
      data: room
    }
  }
}
