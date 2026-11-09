import { RegisterDto } from '../../auth/dto/register.dto';

/** Same fields as registration; the role is always ADMIN. */
export class CreateAdminDto extends RegisterDto {}
