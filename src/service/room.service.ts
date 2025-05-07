import { Provide, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { Room } from '../entity/room.entity';
import { User } from '../entity/user.entity';
import { InjectDataSource } from '@midwayjs/typeorm';
import { DataSource } from 'typeorm';
import { Context } from '@midwayjs/koa';
import { AuthUtil } from '../util/auth.util';
import { UserAlreadyInRoomError, RoomNotFoundError } from '../error/room.error';

@Provide()
@Scope(ScopeEnum.Singleton)
export class RoomService {
  @InjectDataSource()
  dataSource: DataSource;

  @Inject()
  ctx: Context;

  @Inject()
  authUtil: AuthUtil;

  async create(room: {name: string, description: string, capacity: number}) {
    // 获取到payload中的userId
    const payload = this.ctx.state.user;
    const userId = payload.userId;
    const username = payload.username;

    // 获取到用户
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if(user.roomId) {
      throw new UserAlreadyInRoomError();
    }
    
    // 创建房间
    const roomRepository = this.dataSource.getRepository(Room);
    const newRoom = await roomRepository.save({
      current: 0,
      name: room.name,
      description: room.description,
      capacity: room.capacity,
      ownerId: userId,
      ownerName: username
    });

    // 更新用户的房间关联
    user.roomId = newRoom.id;
    await userRepository.save(user);

    return { ...newRoom, id: newRoom.id };
  }

  async list() {
    const roomRepository = this.dataSource.getRepository(Room);
    return await roomRepository.find();
  }

  async getRoomById(id: number) {
    const roomRepository = this.dataSource.getRepository(Room);
    const room = await roomRepository.findOne({
      where: { id },
      // relations: ['users']
    });

    if(!room) {
      throw new RoomNotFoundError();
    }

    return room;
  }

  async leaveRoom(roomId: number) {
    const roomRepository = this.dataSource.getRepository(Room);
    const room = await roomRepository.findOne({
      where: { id: roomId }
    });

    if(!room) {
      throw new RoomNotFoundError();
    } 

    if(room.ownerId === this.ctx.state.user.userId) {
      // 如果房间主人离开，则删除房间
      return this.deleteRoom(roomId);
    }
    
    // 更新房间人数
    room.current--;
    await roomRepository.save(room);

    // 更新用户关联
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: this.ctx.state.user.userId }
    });
    user.roomId = null;
    await userRepository.save(user);

    return room;
  }

  async deleteRoom(roomId: number) {
    const roomRepository = this.dataSource.getRepository(Room);
    const room = await roomRepository.findOne({
      where: { id: roomId }
    });

    if(!room) {
      throw new RoomNotFoundError();
    } 

    // 删除房间
    await roomRepository.delete(roomId);
    // 删除房间关联
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: room.ownerId }
    });
    user.roomId = null;
    await userRepository.save(user);

    return {
      success: true,
      message: '房间删除成功'
    }
  }
}
