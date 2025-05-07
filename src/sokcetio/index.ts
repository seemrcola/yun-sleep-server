// socektio 主要负责进入房间的人物管理

/**
 * 进入房间的人物管理
 * 1. 人物的name和id 用于识别人物
 * 2. 人物的坐标x y 用于确定人物在房间中的位置
 * 3. 人物的房间号 用于确定人物在哪个房间
 * 4. 人物是否睡觉 用于确定人物是否睡觉
 * 5. 人物的床位号 用于确定睡觉中的人物所处的床位
 */

/**
 * 房间管理
 * 1. 房间的id 用于确定房间
 * 2. 房间的用户列表
 */

import { Provide, App, Inject } from '@midwayjs/core';
import { Application } from '@midwayjs/socketio';
import { Socket } from 'socket.io';
import { RoomService } from '../service/room.service';
import { UserService } from '../service/user.service';
import { AuthUtil } from '../util/auth.util';

interface Person {
  name: string;
  id: number;
  x: number;
  y: number;
  room: number;
  isSleeping: boolean;
  bed: number;
}

interface Room {
  id: number;
  name: string;
  people: Person[];
  messages: Message[];
}

interface Message {
  type: 'bot' | 'user' | 'system';
  userId?: number;
  username?: string;
  data: string;
  timestamp: number;
}

// 存储所有房间信息
const rooms: Map<number, Room> = new Map();

// 存储socket与用户的映射
const socketUserMap: Map<string, { userId: number, roomId: number, username: string }> = new Map();

// 最大历史消息数量
const MAX_MESSAGES_HISTORY = 50;

@Provide()
export class SocketIoService {
  @App('socketIO')
  socketApp: Application;

  @Inject()
  roomService: RoomService;

  @Inject()
  userService: UserService;

  @Inject()
  authUtil: AuthUtil;

  // 初始化房间数据
  async init() {
    console.log('初始化 Socket.IO 服务');
    
    // 设置连接监听
    this.socketApp.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
    
    // 获取所有房间
    const roomList = await this.roomService.list();
    
    // 初始化房间数据结构
    for (const room of roomList) {
      rooms.set(room.id, {
        id: room.id,
        name: room.name,
        people: [],
        messages: []
      });
    }

    console.log('房间数据初始化完成，共加载', roomList.length, '个房间');
  }

  // 处理新连接
  private handleConnection(socket: Socket) {
    console.log(`用户连接: ${socket.id}`);

    // 处理授权 - 从查询参数获取token
    const token = socket.handshake.query.token as string;
    if (!token) {
      console.log('未提供token，断开连接');
      socket.disconnect(true);
      return;
    }

    // 验证token
    const payload = this.authUtil.verifyToken(token);
    if (!payload) {
      console.log('无效token，断开连接');
      socket.disconnect(true);
      return;
    }

    // 监听加入房间事件
    socket.on('joinRoom', async (data) => {
      await this.handleJoinRoom(socket, data, payload);
    });

    // 监听更新位置事件
    socket.on('updatePosition', (data) => {
      this.handleUpdatePosition(socket, data);
    });

    // 监听睡觉状态变更
    socket.on('updateSleepState', (data) => {
      this.handleUpdateSleepState(socket, data);
    });

    // 监听发送消息
    socket.on('sendMessage', (data) => {
      this.handleSendMessage(socket, data);
    });

    // 监听离开房间
    socket.on('leaveRoom', async () => {
      await this.handleLeaveRoom(socket);
    });

    // 监听断开连接
    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });
  }

  // 处理加入房间
  async handleJoinRoom(socket: Socket, data: { roomId: number }, payload: any) {
    const { roomId } = data;
    const { userId, username } = payload;

    // 检查房间是否存在
    if (!rooms.has(roomId)) {
      const roomInfo = await this.roomService.getRoomById(roomId);
      if (!roomInfo) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }
      
      // 初始化新房间
      rooms.set(roomId, {
        id: roomId,
        name: roomInfo.name,
        people: [],
        messages: []
      });
    }

    // 获取房间
    const room = rooms.get(roomId);

    // 检查用户是否已在此房间
    const existingPerson = room.people.find(p => p.id === userId);
    if (existingPerson) {
      socket.emit('error', { message: '你已经在该房间中' });
      return;
    }

    // 创建新用户
    const newPerson: Person = {
      id: userId,
      name: username,
      x: 100, // 默认位置
      y: 100, // 默认位置
      room: roomId,
      isSleeping: false,
      bed: -1 // -1表示没有分配床位
    };

    // 加入房间
    room.people.push(newPerson);
    
    // 加入socket.io房间
    socket.join(`room-${roomId}`);
    
    // 保存用户和socket的映射
    socketUserMap.set(socket.id, { userId, roomId, username });

    // 添加系统消息
    this.addSystemMessage(roomId, `${username} 加入了房间`);

    // 发送成功消息给用户
    socket.emit('joinRoomSuccess', { 
      roomId, 
      person: newPerson,
      people: room.people,
      messages: room.messages
    });

    // 广播新用户加入消息给其他用户
    socket.to(`room-${roomId}`).emit('personJoined', { person: newPerson });
  }

  // 处理更新位置
  handleUpdatePosition(socket: Socket, data: { x: number, y: number }) {
    const { x, y } = data;
    const userInfo = socketUserMap.get(socket.id);
    
    if (!userInfo) {
      socket.emit('error', { message: '未找到用户信息' });
      return;
    }

    const { userId, roomId } = userInfo;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    // 更新用户位置
    const person = room.people.find(p => p.id === userId);
    if (person) {
      person.x = x;
      person.y = y;

      // 广播位置更新
      socket.to(`room-${roomId}`).emit('positionUpdated', {
        userId,
        x,
        y
      });
    }
  }

  // 处理睡觉状态更新
  handleUpdateSleepState(socket: Socket, data: { isSleeping: boolean, bed?: number }) {
    const { isSleeping, bed } = data;
    const userInfo = socketUserMap.get(socket.id);
    
    if (!userInfo) {
      socket.emit('error', { message: '未找到用户信息' });
      return;
    }

    const { userId, roomId, username } = userInfo;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    // 更新用户睡觉状态
    const person = room.people.find(p => p.id === userId);
    if (person) {
      person.isSleeping = isSleeping;
      
      // 如果提供了床位号且正在睡觉，更新床位
      if (isSleeping && bed !== undefined) {
        // 检查床位是否已被占用
        const bedOccupied = room.people.some(p => 
          p.id !== userId && p.isSleeping && p.bed === bed
        );
        
        if (bedOccupied) {
          socket.emit('error', { message: '该床位已被占用' });
          return;
        }
        
        person.bed = bed;
        
        // 添加系统消息
        this.addSystemMessage(roomId, `${username} 开始在床位 ${bed} 上睡觉`);
      } else if (!isSleeping) {
        // 如果不睡觉了，释放床位
        const oldBed = person.bed;
        person.bed = -1;
        
        // 添加系统消息
        if (oldBed !== -1) {
          this.addSystemMessage(roomId, `${username} 从床位 ${oldBed} 起床了`);
        }
      }

      // 广播睡觉状态更新
      socket.to(`room-${roomId}`).emit('sleepStateUpdated', {
        userId,
        isSleeping,
        bed: person.bed
      });
    }
  }

  // 处理发送消息
  handleSendMessage(socket: Socket, data: { message: string }) {
    const { message } = data;
    const userInfo = socketUserMap.get(socket.id);
    
    if (!userInfo) {
      socket.emit('error', { message: '未找到用户信息' });
      return;
    }

    const { userId, roomId, username } = userInfo;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    // 创建用户消息
    const newMessage: Message = {
      type: 'user',
      userId,
      username,
      data: message,
      timestamp: Date.now()
    };

    // 添加消息到房间
    this.addMessageToRoom(room, newMessage);

    // 广播消息给所有房间成员
    this.socketApp.of('/').to(`room-${roomId}`).emit('newMessage', newMessage);

    // 如果消息包含关键词，生成机器人回复
    if (message.includes('睡觉') || message.includes('晚安')) {
      setTimeout(() => {
        const botMessage: Message = {
          type: 'bot',
          data: `${username}，祝你有个好梦！`,
          timestamp: Date.now()
        };
        this.addMessageToRoom(room, botMessage);
        this.socketApp.of('/').to(`room-${roomId}`).emit('newMessage', botMessage);
      }, 1000);
    }
  }

  // 添加消息到房间
  private addMessageToRoom(room: Room, message: Message) {
    room.messages.push(message);
    
    // 限制消息历史数量
    if (room.messages.length > MAX_MESSAGES_HISTORY) {
      room.messages = room.messages.slice(room.messages.length - MAX_MESSAGES_HISTORY);
    }
  }

  // 添加系统消息
  private addSystemMessage(roomId: number, content: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const systemMessage: Message = {
      type: 'system',
      data: content,
      timestamp: Date.now()
    };

    this.addMessageToRoom(room, systemMessage);
    this.socketApp.of('/').to(`room-${roomId}`).emit('newMessage', systemMessage);
  }

  // 处理离开房间
  async handleLeaveRoom(socket: Socket) {
    const userInfo = socketUserMap.get(socket.id);
    if (!userInfo) return;

    const { userId, roomId, username } = userInfo;
    await this.removePersonFromRoom(socket, userId, roomId, username);
  }

  // 处理断开连接
  async handleDisconnect(socket: Socket) {
    console.log(`用户断开: ${socket.id}`);
    const userInfo = socketUserMap.get(socket.id);
    if (!userInfo) return;

    const { userId, roomId, username } = userInfo;
    await this.removePersonFromRoom(socket, userId, roomId, username);
    
    // 删除socket映射
    socketUserMap.delete(socket.id);
  }

  // 从房间移除用户
  async removePersonFromRoom(socket: Socket, userId: number, roomId: number, username: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    // 从房间中移除用户
    const personIndex = room.people.findIndex(p => p.id === userId);
    if (personIndex !== -1) {
      room.people.splice(personIndex, 1);
      
      // 离开socket.io房间
      socket.leave(`room-${roomId}`);
      
      // 添加系统消息
      this.addSystemMessage(roomId, `${username} 离开了房间`);
      
      // 广播用户离开消息
      socket.to(`room-${roomId}`).emit('personLeft', { userId });
      
      console.log(`用户 ${userId} 离开房间 ${roomId}`);
    }
  }
}
