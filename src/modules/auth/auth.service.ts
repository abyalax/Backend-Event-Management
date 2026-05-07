import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { UserPayload } from '~/common/types/global';
import { UserDto } from '../users/dto/user.dto';
import { UserService } from '../users/user.service';
import { SignUpDto } from './dto/sign-up.dto';
import { PermissionsDto } from '../role-permissions/dto/permission.dto';
import { AuthConfig } from './auth.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,

    @Inject(CONFIG_PROVIDER.AUTH)
    private readonly config: AuthConfig,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<UserDto> {
    const userExist = await this.userService.findByEmail(signUpDto.email);
    if (userExist) throw new BadRequestException('Email already exist');

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);
    const user = await this.userService.create({
      ...signUpDto,
      password: hashedPassword,
    });
    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async signIn(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: UserDto }> {
    // User + Roles + Permissions (via eager)
    const userEntity = await this.userService.findByEmail(email);
    if (!userEntity) throw new NotFoundException('Email not found');

    const isMatch = await bcrypt.compare(password, userEntity.password);
    if (!isMatch) throw new UnauthorizedException('Password does not match');

    const user = plainToInstance(UserDto, userEntity, {
      excludeExtraneousValues: true,
    });

    // Manually set permissions for the API response
    if (user.roles) {
      user.roles.forEach((role) => {
        role.permissions = userEntity.roles?.find((r) => r.id === role.id)?.rolePermissions?.map((rp) => rp.permission) || [];
      });
    }

    // Extract permissions from all roles
    const permissions: string[] = [];
    userEntity.roles?.forEach((role) => {
      role.rolePermissions?.forEach((rolePermission) => {
        if (rolePermission.permission.key) permissions.push(rolePermission.permission.key);
      });
    });

    const payload: UserPayload = {
      name: user.name,
      email: user.email,
      id: user.id,
      permissions,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: this.config.jwtExpiration, secret: this.config.jwtSecret }),
      this.jwtService.signAsync(payload, { expiresIn: this.config.jwtRefreshExpiration, secret: this.config.jwtRefreshSecret }),
    ]);

    return { access_token, refresh_token, user };
  }

  async refreshToken(refresh_token?: string): Promise<{ access_token: string }> {
    if (refresh_token === undefined) throw new UnauthorizedException();
    const verifyToken = this.jwtService.verify(refresh_token, {
      secret: this.config.jwtRefreshSecret,
    });
    if (!verifyToken) throw new UnauthorizedException();

    const payload = {
      name: verifyToken.name,
      email: verifyToken.email,
      id: verifyToken.id,
      permissions: verifyToken.permissions || [],
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.jwtExpiration,
      secret: this.config.jwtSecret,
    });
    return {
      access_token,
    };
  }

  async getFullPermissions(id: string): Promise<PermissionsDto[] | undefined> {
    const permission = await this.userService.getFullPermissions(id);
    return plainToInstance(PermissionsDto, permission, {
      excludeExtraneousValues: true,
    });
  }
}
