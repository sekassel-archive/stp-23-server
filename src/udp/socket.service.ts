import {Injectable, OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {createSocket, RemoteInfo, Socket} from 'node:dgram';
import {environment} from '../environment';
import {SentryService} from "@ntegral/nestjs-sentry";

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
  subscribed: Map<string, RegExp>;
}

@Injectable()
export class SocketService implements OnModuleInit {
  remotes = new Map<string, Remote>;
  socket: Socket;

  constructor(
    private eventEmitter: EventEmitter2,
    private sentryService: SentryService,
  ) {
  }

  onModuleInit() {
    this.socket = createSocket('udp4');
    this.socket.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
    this.socket.bind(environment.udpPort);
  }

  async onMessage(msg: Buffer, info: RemoteInfo) {
    const message = JSON.parse(msg.toString());
    const tx = this.sentryService.instance().startTransaction({
      op: 'udp',
      name: message.event.replace(/[a-f0-9]{24}/g, '*'),
      data: {
        event: message.event,
      },
    });
    switch (message.event) {
      case 'subscribe': {
        const remoteKey = key(info);
        const remote = this.remotes.get(remoteKey);
        const regExp = regex(message.data);
        if (remote) {
          remote.subscribed.set(message.data, regExp);
        } else {
          const subscribed = new Map<string, RegExp>;
          subscribed.set(message.data, regExp);
          this.remotes.set(remoteKey, {info, subscribed});
        }
        break;
      }
      case 'unsubscribe': {
        const remoteKey = key(info);
        const remote = this.remotes.get(remoteKey);
        if (remote) {
          remote.subscribed.delete(message.data);
          if (!remote.subscribed.size) {
            this.remotes.delete(remoteKey);
          }
        }
        break;
      }
      default:
        try {
          await this.eventEmitter.emitAsync('udp:' + message.event, message.data);
        } catch (e: any) {
          if (!e.response) {
            this.sentryService.error(e.message, e.stack, 'udp:' + message.event);
          }
          this.socket.send(JSON.stringify({event: 'error', data: e.response || e.message}), info.port, info.address);
        }
        break;
    }
    tx.finish();
  }

  broadcast(event: string, data?: any): void {
    const message = JSON.stringify({event, data});
    for (const remote of this.remotes.values()) {
      for (const value of remote.subscribed.values()) {
        if (value.test(event)) {
          this.socket.send(message, remote.info.port, remote.info.address);
          break;
        }
      }
    }
  }
}
