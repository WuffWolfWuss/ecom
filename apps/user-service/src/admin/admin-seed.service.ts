import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EUserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, only when no
 * admin exists yet. After that, admins are created via POST /users/admins
 * and these env vars are ignored (remove them once the first admin exists).
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;

    if (await this.users.existsByRole(EUserRole.ADMIN)) return;

    if (password.length < 12) {
      this.logger.error(
        'ADMIN_PASSWORD must be at least 12 characters; first admin not created',
      );
      return;
    }

    const admin = await this.users.create({
      email,
      password,
      firstName: 'Admin',
      lastName: 'Admin',
      role: EUserRole.ADMIN,
    });
    this.logger.warn(
      `First admin created: ${admin.email}. Remove ADMIN_PASSWORD from .env.`,
    );
  }
}
