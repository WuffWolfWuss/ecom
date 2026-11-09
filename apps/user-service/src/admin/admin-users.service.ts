import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SessionService } from '../auth/services/session.service';
import { EUserRole } from '../users/enums/user-role.enum';
import { IPublicUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  async createAdmin(
    dto: CreateAdminDto,
    actorId: string,
  ): Promise<IPublicUser> {
    const admin = await this.users.create({ ...dto, role: EUserRole.ADMIN });
    this.logger.warn(
      `Admin ${admin.id} (${admin.email}) created by ${actorId}`,
    );
    return this.users.toPublic(admin);
  }

  async revokeSessions(userId: string, actorId: string): Promise<void> {
    await this.users.findById(userId); // 404 if missing
    await this.sessions.revokeUserAccess(userId);
    this.logger.warn(`All sessions of user ${userId} revoked by ${actorId}`);
  }

  async setStatus(
    userId: string,
    isActive: boolean,
    actorId: string,
  ): Promise<IPublicUser> {
    if (userId === actorId && !isActive) {
      throw new BadRequestException('You cannot disable your own account');
    }
    await this.users.findById(userId);
    await this.users.setActive(userId, isActive);
    if (!isActive) await this.sessions.revokeUserAccess(userId);
    this.logger.warn(
      `User ${userId} ${isActive ? 'enabled' : 'disabled'} by ${actorId}`,
    );
    return this.users.toPublic(await this.users.findById(userId));
  }
}
