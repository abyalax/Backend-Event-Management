import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { UserPayload } from '~/common/types/global';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { UserDto } from '../user/dto/user.dto';
import { UserService } from '../user/user.service';
import { PermissionsDto } from './dto/permission/get-permission.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(CONFIG_SERVICE)
    private readonly configService: ConfigService,
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

    // Extract permissions from all roles
    const permissions: string[] = [];
    userEntity.roles?.forEach((role) => {
      role.permissions?.forEach((permission) => {
        if (permission.key) permissions.push(permission.key);
      });
    });

    const payload: UserPayload = {
      name: user.name,
      email: user.email,
      id: user.id,
      permissions,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '30m', secret: this.configService.get('JWT_SECRET') }),
      this.jwtService.signAsync(payload, { expiresIn: '1d', secret: this.configService.get('JWT_REFRESH_SECRET') }),
    ]);

    return { access_token, refresh_token, user };
  }

  async refreshToken(refresh_token?: string): Promise<{ access_token: string }> {
    if (refresh_token === undefined) throw new UnauthorizedException();
    const verifyToken = this.jwtService.verify(refresh_token, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
    if (!verifyToken) throw new UnauthorizedException();
    const payload = { email: verifyToken.email, sub: verifyToken.sub };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '2h',
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
