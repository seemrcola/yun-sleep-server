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

import { Provide, App, Inject, Scope, ScopeEnum } from '@midwayjs/core';
import { Application } from '@midwayjs/socketio';
import { Socket } from 'socket.io';
import { RoomService } from '../service/room.service';
import { UserService } from '../service/user.service';
import { AuthUtil } from '../util/auth.util';

enum ListenerEvent { 
  JOIN_ROOM = 'joinRoom',
  CHARACTER_UPDATE = 'characterUpdate',
  SEND_MESSAGE = 'sendMessage',
  LEAVE_ROOM = 'leaveRoom',
}

enum SocketEvent { 
  JOIN_ROOM_SUCCESS = 'joinRoomSuccess',
  PERSON_JOINED = 'personJoined',
  CHARACTER_UPDATED = 'characterUpdated',
  NEW_MESSAGE = 'newMessage',
  PERSON_LEFT = 'personLeft',
  ERROR = 'error'
}

interface Character {
  id: number; // 人物id
  username: string; // 人物名称
  room: number; // 人物所在房间id
  x: number; // 坐标x
  y: number; // 坐标y
  width: number; // 角色宽度
  height: number; // 角色高度
  speed: number; // 移动速度
  isSleeping: boolean; // 是否睡觉
  currentBedIndex: number; // 当前床位号
  direction: 'down' | 'up' | 'left' | 'right'; // 方向
  isMoving: boolean; // 是否移动
  bubbleMessage: string | null; // 气泡消息
}

interface Room {
  id: number; // 房间id
  name: string; // 房间名称
  characters: Character[]; // 房间内的人物列表
  messages: Message[]; // 房间内的人物消息列表
}

interface Message {
  sender: 'bot' | 'user';
  userId?: number;
  username?: string;
  content: string;
  timestamp: number;
}

// 存储所有房间信息
const rooms: Map<number, Room> = new Map();

// 存储socket与用户的映射
const socketUserMap: Map<string, { userId: number, roomId: number, username: string }> = new Map();

// 最大历史消息数量
const MAX_MESSAGES_HISTORY = 50;

@Provide()
@Scope(ScopeEnum.Singleton)
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
        characters: [],
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
    socket.on(ListenerEvent.JOIN_ROOM, async (data) => {
      await this.handleJoinRoom(socket, data, payload);
    });

    // 监听 更新位置/睡觉状态等 事件 统一是修改用户信息
    socket.on(ListenerEvent.CHARACTER_UPDATE, (data) => {
      this.handleUpdateCharacter(socket, data);
    });

    // 监听发送消息
    socket.on(ListenerEvent.SEND_MESSAGE, (data) => {
      this.handleSendMessage(socket, data);
    });

    // 监听离开房间
    socket.on(ListenerEvent.LEAVE_ROOM, async () => {
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
        characters: [],
        messages: []
      });
    }

    // 获取房间
    const room = rooms.get(roomId);

    // 检查用户是否已在此房间
    const existingCharacter = room.characters.find(p => p.id === userId);
    if (existingCharacter) {
      socket.emit('error', { message: '你已经在该房间中' });
      return;
    }

    // 创建新用户
    const newCharacter: Character = {
      id: userId,
      username: username,
      room: roomId,
      x: 100, // 默认位置
      y: 100, // 默认位置
      width: 30, // 角色宽度
      height: 30, // 角色高度
      speed: 1, // 移动速度
      isSleeping: false, // 是否睡觉
      currentBedIndex: -1, // 当前床位号
      direction: 'down', // 方向
      isMoving: false, // 是否移动
      bubbleMessage: null // 气泡消息
    };

    // 加入房间
    room.characters.push(newCharacter);

    // 加入socket.io房间
    socket.join(`room-${roomId}`);
    
    // 保存用户和socket的映射
    socketUserMap.set(socket.id, { userId, roomId, username });

    // 添加系统消息
    this.addSystemMessage(roomId, `${username} 加入了房间`);

    // 发送成功消息给用户
    socket.emit(SocketEvent.JOIN_ROOM_SUCCESS, { 
      roomId, 
      character: newCharacter,
      characters: room.characters,
      messages: room.messages
    });

    // 广播给房间所有用户
    this.socketApp
    .of('/')
    .to(`room-${roomId}`)
    .emit(SocketEvent.PERSON_JOINED, { 
      character: newCharacter,
      characters: room.characters,
      messages: room.messages
    });
  }

  // 处理更新位置/睡觉状态等
  handleUpdateCharacter(socket: Socket, data: Partial<Character>) {
    const userInfo = socketUserMap.get(socket.id);
    
    if (!userInfo) {
      socket.emit(SocketEvent.ERROR, { message: '未找到用户信息' });
      return;
    }

    const { userId, roomId } = userInfo;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit(SocketEvent.ERROR, { message: '房间不存在' });
      return;
    }

    // 更新用户信息
    const character = room.characters.find(p => p.id === userId);
    if (character) {
      Object.assign(character, data);
    }

    // 广播给房间所有用户
    this.socketApp
    .of('/')
    .to(`room-${roomId}`)
    .emit(SocketEvent.CHARACTER_UPDATED, {
      character: character,
      characters: room.characters,
      messages: room.messages
    });
  }

  // 处理发送消息
  handleSendMessage(socket: Socket, data: { content: string }) {
    const { content } = data;
    const userInfo = socketUserMap.get(socket.id);
    
    if (!userInfo) {
      socket.emit(SocketEvent.ERROR, { message: '未找到用户信息' });
      return;
    }

    const { userId, roomId, username } = userInfo;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit(SocketEvent.ERROR, { message: '房间不存在' });
      return;
    }

    // 创建用户消息
    const newMessage: Message = {
      sender: 'user',
      userId,
      username,
      content,
      timestamp: Date.now()
    };

    // 添加消息到房间
    this.addMessageToRoom(room, newMessage);

    // 广播消息给所有房间成员
    this.socketApp.of('/').to(`room-${roomId}`).emit('newMessage', newMessage);
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

    const botMessage: Message = {
      sender: 'bot',
      content,
      timestamp: Date.now()
    };

    this.addMessageToRoom(room, botMessage);
    console.log('添加系统消息', botMessage, room);
    this.socketApp
      .of('/')
      .to(`room-${roomId}`)
      .emit(SocketEvent.NEW_MESSAGE, botMessage);
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
    const characterIndex = room.characters.findIndex(p => p.id === userId);
    if (characterIndex !== -1) {
      room.characters.splice(characterIndex, 1);
      
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
