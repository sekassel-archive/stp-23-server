import {Injectable, OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {createSocket, RemoteInfo, Socket} from 'node:dgram';
import {environment} from '../environment';

function key(rinfo: RemoteInfo) {
  return `${rinfo.address}:${rinfo.port}`;
}

function regex(pattern: string): RegExp {
  if (!/^[\w.*]+$/g.test(pattern)) {
    throw new Error(`Invalid event pattern: ${pattern}`);
  }
  return new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+')}$`);
}

interface Remote {
  info: RemoteInfo;
  subscribed: RegExp[];
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
        const regExp = regex(message.data);
        if (remote) {
          remote.subscribed.push(regExp);
        } else {
          this.remotes.set(key(rinfo), {info: rinfo, subscribed: [regExp]});
        }
        break;
      }
      case 'unsubscribe': {
        const remote = this.remotes.get(key(rinfo));
        if (remote) {
          remote.subscribed.splice(remote.subscribed.indexOf(regex(message.data)), 1);
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
    const message = JSON.stringify({event, data});
    for (const remote of this.remotes.values()) {
      if (remote.subscribed.some(regExp => regExp.test(event))) {
        this.socket.send(message, remote.info.port, remote.info.address);
      }
    }
  }
}
