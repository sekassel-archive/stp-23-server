import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {Auth, AuthUser} from '../auth/auth.decorator';
import {RegionService} from '../region/region.service';
import {User} from '../user/user.schema';
import {NotFound} from '../util/not-found.decorator';
import {ParseObjectIdPipe} from '../util/parse-object-id.pipe';
import {Throttled} from '../util/throttled.decorator';
import {Validated} from '../util/validated.decorator';
import {CreateMemberDto, UpdateMemberDto} from './member.dto';
import {Member} from './member.schema';
import {MemberService} from './member.service';

@Controller('regions/:regionId/members')
@ApiTags('Region Members')
@Validated()
@Auth()
@Throttled()
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly regionService: RegionService,
  ) {
  }

  @Post()
  @ApiOperation({description: 'Join a region with the current user.'})
  @ApiCreatedResponse({type: Member})
  @ApiNotFoundResponse({description: 'Region not found.'})
  async create(
    @AuthUser() user: User,
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Body() member: CreateMemberDto,
  ): Promise<Member | null> {
    const region = await this.regionService.findOne(regionId);
    if (!region) {
      throw new NotFoundException(regionId);
    }

    const existing = await this.memberService.findOne(regionId, user._id.toString());
    if (existing) {
      throw new ConflictException('User already joined');
    }

    return this.memberService.create(regionId, user._id.toString(), member);
  }

  @Get()
  @ApiOkResponse({type: [Member]})
  async findAll(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
  ): Promise<Member[]> {
    return this.memberService.findAll(regionId);
  }

  @Get(':userId')
  @ApiOkResponse({type: Member})
  @NotFound()
  async findOne(
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
  ): Promise<Member | null> {
    return this.memberService.findOne(regionId, userId);
  }

  @Patch(':userId')
  @ApiOperation({description: 'Change region membership for the current user.'})
  @ApiOkResponse({type: Member})
  @ApiForbiddenResponse({description: 'Attempt to change membership of someone else without being owner.'})
  @NotFound('Region or membership not found.')
  async update(
    @AuthUser() user: User,
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<Member | null> {
    const region = await this.regionService.findOne(regionId);
    if (!region) {
      throw new NotFoundException(regionId);
    }
    if (user._id.toString() !== userId) {
      throw new ForbiddenException('Cannot change membership of another user.');
    }
    return this.memberService.update(regionId, userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({description: 'Leave a region with the current user.'})
  @ApiOkResponse({type: Member})
  @ApiForbiddenResponse({description: 'Attempt to kick someone else without being owner.'})
  @NotFound('Region or membership not found.')
  async delete(
    @AuthUser() user: User,
    @Param('regionId', ParseObjectIdPipe) regionId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
  ): Promise<Member | null> {
    const region = await this.regionService.findOne(regionId);
    if (!region) {
      throw new NotFoundException(regionId);
    }

    const actorId = user._id.toString();
    if (actorId !== userId) {
      throw new ForbiddenException('Cannot kick another user.');
    }
    return this.memberService.delete(regionId, userId);
  }
}
