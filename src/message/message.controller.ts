import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
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
import { FilterQuery } from 'mongoose';
import { Auth, AuthUser } from '../auth/auth.decorator';
import { MemberResolverService, Namespace, UserFilter } from '../member-resolver/member-resolver.service';
import { User } from '../user/user.schema';
import { NotFound } from '../util/not-found.decorator';
import { ParseObjectIdPipe } from '../util/parse-object-id.pipe';
import { Throttled } from '../util/throttled.decorator';
import { Validated } from '../util/validated.decorator';
import { CreateMessageDto, QueryMessagesDto, UpdateMessageDto } from './message.dto';
import { Message } from './message.schema';
import { MessageService } from './message.service';

@Controller(':namespace/:parent/messages')
@ApiTags('Messages')
@Validated()
@Auth()
@Throttled()
export class MessageController {
  constructor(
    private messageService: MessageService,
    private memberResolver: MemberResolverService,
  ) {
  }

  private async checkParentAndGetMembers(namespace: Namespace, parent: string, user: User): Promise<UserFilter> {
    const users = await this.memberResolver.resolve(namespace, parent);
    if (users === 'global') {
      return users;
    }
    if (users.length === 0) {
      throw new NotFoundException(`${namespace}/${parent}`);
    }
    if (!users.includes(user._id.toString())) {
      throw new ForbiddenException('Cannot access messages within inaccessible parent.');
    }
    return users;
  }

  @Post()
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiCreatedResponse({ type: Message })
  @ApiNotFoundResponse({ description: 'Namespace or parent not found.' })
  @ApiForbiddenResponse({ description: 'Attempt to create messages in an inaccessible parent.' })
  async create(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ParseObjectIdPipe) parent: string,
    @Body() message: CreateMessageDto,
  ): Promise<Message> {
    const users = await this.checkParentAndGetMembers(namespace, parent, user);
    return this.messageService.create(namespace, parent, user._id.toString(), message, users);
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
    @Param('parent') parent: string,
    @Query() { createdAfter, createdBefore, limit }: QueryMessagesDto,
  ): Promise<Message[]> {
    await this.checkParentAndGetMembers(namespace, parent, user);
    const filter: FilterQuery<Message> = {};
    if (createdBefore || createdAfter) {
      filter.createdAt = {};
      createdAfter && (filter.createdAt.$gte = createdAfter);
      createdBefore && (filter.createdAt.$lt = createdBefore);
    }
    return this.messageService.findAll(namespace, parent, filter, limit);
  }

  @Get(':id')
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: Message })
  @ApiForbiddenResponse({ description: 'Attempt to read messages in an inaccessible parent.' })
  @NotFound()
  async get(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ParseObjectIdPipe) parent: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Message | null> {
    await this.checkParentAndGetMembers(namespace, parent, user);
    return this.messageService.find(namespace, parent, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: Message })
  @ApiForbiddenResponse({ description: 'Attempt to change messages in an inaccessible parent, or to change someone else\'s message.' })
  @NotFound()
  async update(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ParseObjectIdPipe) parent: string,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateMessageDto,
  ): Promise<Message | null> {
    const users = await this.checkParentAndGetMembers(namespace, parent, user);
    const existing = await this.messageService.find(namespace, parent, id);
    if (!existing) {
      return null;
    }
    if (existing.sender !== user._id.toString()) {
      throw new ForbiddenException('Only the sender can change the message.');
    }
    return this.messageService.update(namespace, parent, id, dto, users);
  }

  @Delete(':id')
  @ApiParam({ name: 'namespace', enum: Namespace })
  @ApiOkResponse({ type: Message })
  @ApiForbiddenResponse({ description: 'Attempt to delete messages in an inaccessible parent, or to delete someone else\'s message.' })
  @NotFound()
  async delete(
    @AuthUser() user: User,
    @Param('namespace', new ParseEnumPipe(Namespace)) namespace: Namespace,
    @Param('parent', ParseObjectIdPipe) parent: string,
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<Message | null> {
    const users = await this.checkParentAndGetMembers(namespace, parent, user);
    const existing = await this.messageService.find(namespace, parent, id);
    if (!existing) {
      return null;
    }
    if (existing.sender !== user._id.toString()) {
      throw new ForbiddenException('Only the sender can delete the message.');
    }
    return this.messageService.delete(namespace, parent, id, users);
  }
}
