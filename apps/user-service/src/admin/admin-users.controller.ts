import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@app/common';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('users')
export class AdminUsersController {
  constructor(private readonly admin: AdminUsersService) {}

  /** Creates another admin account. */
  @Post('admins')
  createAdmin(@Body() dto: CreateAdminDto, @CurrentUser() actorId: string) {
    return this.admin.createAdmin(dto, actorId);
  }

  /** Logs the user out everywhere and invalidates all their tokens at once. */
  @Post(':id/revoke-sessions')
  @HttpCode(204)
  revokeSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actorId: string,
  ) {
    return this.admin.revokeSessions(id, actorId);
  }

  /** Enable or disable an account. Disabling also revokes all its sessions. */
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actorId: string,
  ) {
    return this.admin.setStatus(id, dto.isActive, actorId);
  }
}
