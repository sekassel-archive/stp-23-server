import {HttpStatus, Injectable, OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {createSocket, RemoteInfo, Socket} from 'node:dgram';
import {environment} from '../environment';
import {SentryService} from "@ntegral/nestjs-sentry";
import {Transaction} from "@sentry/node";

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

interface Message {
  event: string;
  data?: any;
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
    let message: Message = {event: 'unknown'};
    let tx: Transaction | undefined;
    try {
      message = JSON.parse(msg.toString());
      tx = this.sentryService.instance().startTransaction({
        op: 'udp',
        name: message.event.replace(/[a-f0-9]{24}/g, '*'),
        data: {
          event: message.event,
        },
      });
      await this.onEvent(info, message);
    } catch (e: any) {
      if (e.response && tx) {
        tx.setStatus(HttpStatus[e.response.status]);
        tx.setHttpStatus(e.response.status);
      } else {
        this.sentryService.error(e.message, e.stack, 'udp:' + message.event);
      }
      this.socket.send(JSON.stringify({event: 'error', data: e.response || e.message}), info.port, info.address);
    } finally {
      tx?.finish();
    }
  }

  private async onEvent(info: RemoteInfo, message: Message): Promise<unknown> {
    switch (message.event) {
      case 'subscribe':
        return this.subscribe(info, message.data);
      case 'unsubscribe':
        return this.unsubscribe(info, message.data);
      default:
        return this.eventEmitter.emitAsync('udp:' + message.event, message.data);
    }
  }

  private subscribe(info: RemoteInfo, pattern: string) {
    const remoteKey = key(info);
    const remote = this.remotes.get(remoteKey);
    const regExp = regex(pattern);
    if (remote) {
      remote.subscribed.set(pattern, regExp);
    } else {
      const subscribed = new Map<string, RegExp>;
      subscribed.set(pattern, regExp);
      this.remotes.set(remoteKey, {info, subscribed});
    }
  }

  private unsubscribe(info: RemoteInfo, pattern: string) {
    const remoteKey = key(info);
    const remote = this.remotes.get(remoteKey);
    if (remote) {
      remote.subscribed.delete(pattern);
      if (!remote.subscribed.size) {
        this.remotes.delete(remoteKey);
      }
    }
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
