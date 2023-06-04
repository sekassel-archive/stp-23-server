import {ConflictException, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {InjectModel} from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {Model, Types} from 'mongoose';

import {RefreshToken} from '../auth/auth.interface';
import {JwtStrategy} from '../auth/jwt.strategy';
import {environment} from '../environment';
import {EventService} from '../event/event.service';
import {CreateUserDto, LoginDto, LoginResult, RefreshDto, UpdateUserDto} from './user.dto';
import {User, UserDocument} from './user.schema';
import {EventRepository, MongooseRepository} from "@mean-stream/nestx";
import {GlobalSchema} from "../util/schema";

@Injectable()
@EventRepository()
export class UserService extends MongooseRepository<User> {
  constructor(
    @InjectModel('users') model: Model<User>,
    private eventEmitter: EventService,
    private jwtService: JwtService,
    private jwtStrategy: JwtStrategy,
  ) {
    super(model);
  }

  async findByName(name: string): Promise<UserDocument | null> {
    return this.model.findOne({ name }).exec();
  }

  async create(dto: CreateUserDto | Omit<User, keyof GlobalSchema>): Promise<UserDocument> {
    const hashed = await this.hash(dto);
    hashed.status = 'offline';
    try {
      return super.create(hashed as User);
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('Username already taken');
      }
      throw e;
    }
  }

  async update(id: Types.ObjectId, dto: UpdateUserDto): Promise<UserDocument | null> {
    return super.update(id, await this.hash(dto));
  }

  async deleteTempUsers(maxAgeMs: number): Promise<User[]> {
    const users = await this.model.find({
      createdAt: { $lt: new Date(Date.now() - maxAgeMs) },
      name: environment.cleanup.tempUserNamePattern,
    });
    await this.deleteAll(users);
    return users;
  }

  private async hash(dto: UpdateUserDto): Promise<Partial<User>> {
    const { password, ...rest } = dto;
    const result: Partial<User> = rest;
    if (password) {
      const passwordSalt = await bcrypt.genSalt();
      result.passwordHash = await bcrypt.hash(password, passwordSalt);
    }
    return result;
  }

  async login({ name, password }: LoginDto): Promise<LoginResult | undefined> {
    const user = await this.findByName(name);
    if (!user) {
      return undefined;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return undefined;
    }

    let refreshKey = user.refreshKey;
    if (!refreshKey) {
      refreshKey = crypto.randomBytes(64).toString('base64');
      await this.model.findByIdAndUpdate(user._id, { refreshKey }, { new: true }).exec();
    }

    const accessPayload = await this.jwtStrategy.generate(user);
    const refreshPayload: RefreshToken = { sub: user._id.toString(), refreshKey };
    return {
      ...user.toObject(),
      accessToken: this.jwtService.sign(accessPayload),
      refreshToken: this.jwtService.sign(refreshPayload, {
        expiresIn: environment.auth.refreshExpiry,
      }),
    };
  }

  async refresh(dto: RefreshDto): Promise<LoginResult | undefined> {
    const refreshToken = this.jwtService.decode(dto.refreshToken) as RefreshToken | null;
    if (!refreshToken) {
      return undefined;
    }
    const { sub: userId, refreshKey } = refreshToken;
    const user = await this.model.findOne({ _id: userId, refreshKey }).exec();
    if (!user) {
      return undefined;
    }

    const payload = await this.jwtStrategy.generate(user);
    return {
      ...(user as UserDocument).toObject(),
      accessToken: this.jwtService.sign(payload),
      refreshToken: dto.refreshToken,
    };
  }

  async logout(user: User): Promise<UserDocument | null> {
    return this.model.findByIdAndUpdate(user._id, { refreshKey: null }).exec();
  }

  private emit(event: string, user: User) {
    this.eventEmitter.emit(`users.${user._id}.${event}`, user);
  }
}
