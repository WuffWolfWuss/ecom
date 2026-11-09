import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '@app/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ClientMeta } from './decorators/client-meta.decorator';
import type { IClientMeta } from './interfaces/client-meta.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @ClientMeta() meta: IClientMeta) {
    return this.authService.register(dto, meta);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @ClientMeta() meta: IClientMeta) {
    return this.authService.login(dto, meta);
  }

  /** Exchanges a refresh token for a new access + refresh token (rotation). */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto, @ClientMeta() meta: IClientMeta) {
    return this.authService.refresh(dto.refreshToken, meta);
  }

  /** Ends the current session. */
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(204)
  logout(@CurrentUser('sid') sid: string) {
    return this.authService.logout(sid);
  }

  /** Ends every session of the current user and invalidates all their tokens. */
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(204)
  logoutAll(@CurrentUser() userId: string) {
    return this.authService.logoutAll(userId);
  }

  @ApiBearerAuth()
  @Get('sessions')
  listSessions(@CurrentUser() userId: string, @CurrentUser('sid') sid: string) {
    return this.authService.listSessions(userId, sid);
  }

  @ApiBearerAuth()
  @Delete('sessions/:sid')
  @HttpCode(204)
  revokeSession(
    @CurrentUser() userId: string,
    @Param('sid', ParseUUIDPipe) sid: string,
  ) {
    return this.authService.revokeOwnSession(userId, sid);
  }
}
