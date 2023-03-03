import {Injectable, OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {RemoteInfo, Socket} from 'node:dgram';
import {environment} from '../environment';

@Injectable()
export class SocketService implements OnModuleInit {
  remotes: RemoteInfo[] = [];
  socket: Socket;

  constructor(
    private eventEmitter: EventEmitter2,
  ) {
  }

  onModuleInit() {
    this.socket = new Socket();
    this.socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
    this.socket.bind(environment.udpPort);
  }

  onMessage(msg: Buffer, rinfo: RemoteInfo) {
    const data = JSON.parse(msg.toString());
    switch (data.event) {
      case 'register':
        this.remotes.push(rinfo);
        break;
      case 'unregister':
        this.remotes.splice(this.remotes.indexOf(rinfo), 1);
        break;
      default:
        this.eventEmitter.emit(data.event, data.data);
        break;
    }
  }

  broadcast(event: string, data?: any): void {
    for (const remote of this.remotes) {
      this.socket.send(JSON.stringify({event, data}), remote.port, remote.address);
    }
  }
}
