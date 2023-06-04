import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {FilterQuery, Types} from 'mongoose';
import {Auth, AuthUser} from '../auth/auth.decorator';
import {Namespace} from '../member-resolver/member-resolver.service';
import {User} from '../user/user.schema';
import {NotFound} from '../util/not-found.decorator';
import {Throttled} from '../util/throttled.decorator';
import {Validated} from '../util/validated.decorator';
import {CreateMessageDto, QueryMessagesDto, UpdateMessageDto} from './message.dto';
import {Message} from './message.schema';
import {MessageService} from './message.service';
import {ObjectIdPipe} from "@mean-stream/nestx";

@Controller(':namespace/:parent/messages')
@ApiTags('Messages')
@Validated()
@Auth()
@Throttled()
export class MessageController {
  constructor(
    private messageService: MessageService,
  ) {
  }

  @Post()
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiCreatedResponse({ type: Message })
  @ApiNotFoundResponse({ description: 'Namespace or parent not found.' })
  @ApiForbiddenResponse({ description: 'Attempt to create messages in an inaccessible parent.' })
  async create(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ObjectIdPipe) parent: Types.ObjectId,
    @Body() message: CreateMessageDto,
  ): Promise<Message> {
    await this.messageService.checkParent(namespace, parent, user);
    return this.messageService.create({
      ...message,
      namespace,
      parent: parent.toString(),
      sender: user._id.toString(),
    });
  }

  @Get()
  @ApiOperation({ description: 'Lists the last (limit) messages sent before (createdBefore).' })
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: [Message] })
  @ApiNotFoundResponse({ description: 'Namespace or parent not found.' })
  @ApiForbiddenResponse({ description: 'Attempt to read messages in an inaccessible parent.' })
  async getAll(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ObjectIdPipe) parent: Types.ObjectId,
    @Query() { createdAfter, createdBefore, limit }: QueryMessagesDto,
  ): Promise<Message[]> {
    await this.messageService.checkParent(namespace, parent, user);
    const filter: FilterQuery<Message> = {namespace, parent: parent.toString()};
    if (createdBefore || createdAfter) {
      filter.createdAt = {};
      createdAfter && (filter.createdAt.$gte = createdAfter);
      createdBefore && (filter.createdAt.$lt = createdBefore);
    }
    const messages = await this.messageService.findAll(filter, {limit, sort: '-createdAt'});
    return messages.reverse();
  }

  @Get(':id')
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: Message })
  @ApiForbiddenResponse({ description: 'Attempt to read messages in an inaccessible parent.' })
  @NotFound()
  async get(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ObjectIdPipe) parent: Types.ObjectId,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
  ): Promise<Message | null> {
    await this.messageService.checkParent(namespace, parent, user);
    return this.messageService.find(id);
  }

  @Patch(':id')
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: Message })
  @ApiForbiddenResponse({ description: 'Attempt to change messages in an inaccessible parent, or to change someone else\'s message.' })
  @NotFound()
  async update(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ObjectIdPipe) parent: Types.ObjectId,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateMessageDto,
  ): Promise<Message | null> {
    await this.messageService.checkParent(namespace, parent, user);
    const existing = await this.messageService.find(id);
    if (!existing) {
      return null;
    }
    if (existing.sender !== user._id.toString()) {
      throw new ForbiddenException('Only the sender can change the message.');
    }
    return this.messageService.update(id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: Message })
  @ApiForbiddenResponse({ description: 'Attempt to delete messages in an inaccessible parent, or to delete someone else\'s message.' })
  @NotFound()
  async delete(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ObjectIdPipe) parent: Types.ObjectId,
    @Param('id', ObjectIdPipe) id: Types.ObjectId,
  ): Promise<Message | null> {
    await this.messageService.checkParent(namespace, parent, user);
    const existing = await this.messageService.find(id);
    if (!existing) {
      return null;
    }
    if (existing.sender !== user._id.toString()) {
      throw new ForbiddenException('Only the sender can delete the message.');
    }
    return this.messageService.delete(id);
  }
}
