import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request as RequestExpress, Response as ResponseExpress } from 'express';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { TResponse } from '~/common/types/response';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UserDto } from '../users/dto/user.dto';
import { AuthService } from './auth.service';
import { PermissionsDto } from './dto/permission/get-permission.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async signUp(@Body() signUpDto: SignUpDto): Promise<TResponse<UserDto>> {
    const user = await this.authService.signUp(signUpDto);
    return {
      message: 'Register account successfully',
      data: user,
    };
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Post('login')
  async signIn(@Body() signInDto: SignInDto, @Res() response: ResponseExpress): Promise<void> {
    const data = await this.authService.signIn(signInDto.email, signInDto.password);
    response.cookie('refresh_token', data.refresh_token, {
      httpOnly: true,
      signed: true,
    });
    response.cookie('access_token', data.access_token, {
      httpOnly: true,
      signed: true,
    });
    const res: TResponse<UserDto> = {
      message: 'Login account successfully',
      data: data.user,
    };
    response.status(HttpStatus.ACCEPTED).json(res);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(@Request() req: RequestExpress, @Res() response: ResponseExpress): Promise<void> {
    const refresh_token: string = req.signedCookies.refresh_token;
    const data = await this.authService.refreshToken(refresh_token);
    response.cookie('access_token', data.access_token, {
      httpOnly: true,
      signed: true,
    });

    response.status(HttpStatus.OK).json({
      message: 'getting new access_token',
    });
  }

  @UseGuards(AuthGuard, JwtGuard, PermissionsGuard)
  @Get('permissions')
  async getFullPermissions(@Request() req: RequestExpress): Promise<TResponse<PermissionsDto[] | undefined>> {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('ID User not found');
    const permission = await this.authService.getFullPermissions(id);
    return {
      message: 'get permission successfully',
      data: permission,
    };
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Get('logout')
  signOut(@Res({ passthrough: true }) response: ResponseExpress): TResponse {
    response.cookie('refresh_token', '', {
      httpOnly: true,
      signed: true,
    });
    response.cookie('access_token', '', {
      httpOnly: true,
      signed: true,
    });
    return {
      message: 'Successfully logout',
    };
  }
}
