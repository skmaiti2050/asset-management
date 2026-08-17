import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
    findByIdOrFail: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue(12),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates the user with a hashed password and returns a safe profile', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(
        (email: string, passwordHash: string): User => ({
          id: 'u1',
          email,
          passwordHash,
          role: UserRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const profile = await service.register({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        'a@b.com',
        expect.not.stringMatching('password123'),
      );
      expect(profile).toEqual(
        expect.objectContaining({
          id: 'u1',
          email: 'a@b.com',
          role: UserRole.MEMBER,
        }),
      );
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('stores a bcrypt hash that verifies against the raw password', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(
        (email: string, passwordHash: string): User => ({
          id: 'u1',
          email,
          passwordHash,
          role: UserRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      await service.register({ email: 'a@b.com', password: 'password123' });

      const storedHash = usersService.create.mock.calls[0][1] as string;
      expect(await bcrypt.compare('password123', storedHash)).toBe(true);
    });

    it('rejects a duplicate email', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1' });

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues a JWT for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        role: UserRole.MEMBER,
      });
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.login({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        id: 'u1',
        email: 'a@b.com',
        role: UserRole.MEMBER,
      });
      expect(result.accessToken).toBe('signed-token');
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      usersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
        role: UserRole.MEMBER,
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@b.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns the profile for a known user', async () => {
      usersService.findByIdOrFail.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        role: UserRole.MEMBER,
        createdAt: new Date('2026-01-01'),
      });

      const profile = await service.getProfile('u1');

      expect(profile).toMatchObject({ id: 'u1', email: 'a@b.com' });
      expect(profile).not.toHaveProperty('passwordHash');
    });
  });
});
