import {Injectable, OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {createSocket, RemoteInfo, Socket} from 'node:dgram';
import {environment} from '../environment';

function key(rinfo: RemoteInfo) {
  return `${rinfo.address}:${rinfo.port}`;
}

interface Remote {
  info: RemoteInfo;
  subscribed: string[];
}

@Injectable()
export class SocketService implements OnModuleInit {
  remotes = new Map<string, Remote>;
  socket: Socket;

  constructor(
    private eventEmitter: EventEmitter2,
  ) {
  }

  onModuleInit() {
    this.socket = createSocket('udp4');
    this.socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
    this.socket.bind(environment.udpPort);
  }

  onMessage(msg: Buffer, rinfo: RemoteInfo) {
    const message = JSON.parse(msg.toString());
    switch (message.event) {
      case 'subscribe': {
        const remote = this.remotes.get(key(rinfo));
        if (remote) {
          remote.subscribed.push(message.data);
        } else {
          this.remotes.set(key(rinfo), {info: rinfo, subscribed: [message.data]});
        }
        break;
      }
      case 'unsubscribe': {
        const remote = this.remotes.get(key(rinfo));
        if (remote) {
          remote.subscribed.splice(remote.subscribed.indexOf(message.data), 1);
          if (!remote.subscribed.length) {
            this.remotes.delete(key(rinfo));
          }
        }
        break;
      }
      default:
        this.eventEmitter.emit(message.event, message.data);
        break;
    }
  }

  broadcast(event: string, data?: any): void {
    for (const remote of this.remotes.values()) {
      this.socket.send(JSON.stringify({event, data}), remote.info.port, remote.info.address);
    }
  }
}
