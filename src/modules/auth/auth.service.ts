import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { env } from '~/config/env';
import { UserDto } from '../user/dto/user.dto';
import { UserService } from '../user/user.service';
import { PermissionsDto } from './dto/permission/get-permission.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<UserDto> {
    const userExist = await this.userService.findByEmail(signUpDto.email);
    if (userExist) throw new BadRequestException();

    const created = await this.userService.create(signUpDto);
    const user = await this.userService.findOne({ where: { id: created.id }, relations: ['roles'] });
    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async signIn(email: string, password: string): Promise<{ access_token: string; refresh_token: string; user: UserDto }> {
    const isUserExist = await this.userService.findByEmail(email);
    if (isUserExist === null) throw new NotFoundException();

    const comparePassword = await bcrypt.compare(password, isUserExist.password);
    if (!comparePassword) throw new UnauthorizedException();

    const permissions = await this.userService.getFlattenPermissions(isUserExist.id);
    const userDTO = plainToInstance(UserDto, isUserExist, {
      excludeExtraneousValues: true,
    });

    const user: UserDto = {
      id: userDTO.id,
      name: userDTO.name,
      email: userDTO.email,
      permissions: permissions,
      roles: userDTO.roles,
    };
    const payload = { email: isUserExist.email, sub: isUserExist.id };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: 60 * 30, // 30 minutes
      secret: env.JWT_SECRET,
    });
    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: 60 * 60 * 24, // 24 hour
      secret: env.JWT_REFRESH_SECRET,
    });

    return {
      access_token,
      refresh_token,
      user,
    };
  }

  async refreshToken(refresh_token?: string): Promise<{ access_token: string }> {
    if (refresh_token === undefined) throw new UnauthorizedException();
    const verifyToken = this.jwtService.verify(refresh_token, {
      secret: env.JWT_REFRESH_SECRET,
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

  async getFullPermissions(id: number): Promise<PermissionsDto[] | undefined> {
    const permission = await this.userService.getFullPermissions(id);
    return plainToInstance(PermissionsDto, permission, {
      excludeExtraneousValues: true,
    });
  }
}
