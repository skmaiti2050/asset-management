import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { UserProfile } from './dto/user-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiOkResponse({
    description: 'The created user profile',
    type: UserProfile,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto): Promise<UserProfile> {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login and obtain an access token' })
  @ApiOkResponse({ description: 'JWT access token', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'The authenticated user profile',
    type: UserProfile,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.authService.getProfile(user.id);
  }

  @Patch('role')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change own role using the shared secret',
    description:
      'Returns a fresh access token carrying the new role (use it for subsequent requests).',
  })
  @ApiOkResponse({
    description: 'Fresh access token with the updated role',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid token or wrong secret',
  })
  changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeRoleDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.changeRole(user.id, dto);
  }
}
