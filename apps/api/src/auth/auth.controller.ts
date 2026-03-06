import { Controller, Post, Get, Put, Delete, Req, Res, HttpCode, HttpStatus, UnauthorizedException, ForbiddenException, BadRequestException, Body, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { PG_POOL } from '../database/database.module';
import { RequestContext } from '../common/request-context';
import * as bcrypt from 'bcrypt';
import { validatePassword } from '@buildex/shared';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_DAYS = 7;

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required');
    }

    // Find user by email
    const userResult = await this.pool.query(
      'SELECT id, tenant_id, email, password_hash, name, role FROM users WHERE email = $1',
      [body.email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      throw new UnauthorizedException('Account not configured for password login');
    }

    // Verify password
    const isValid = await bcrypt.compare(body.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const session = await this.authService.createSession(user.id, user.tenant_id, expiresAt);

    // Set HTTP-only cookie
    const isSecure = this.configService.get('COOKIE_SECURE', 'false') === 'true';
    res.cookie(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async signup(
    @Body() body: { companyName: string; email: string; password: string; name: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.companyName || !body.email || !body.password || !body.name) {
      throw new BadRequestException('All fields are required');
    }

    const passwordErrors = validatePassword(body.password);
    if (passwordErrors.length > 0) {
      throw new BadRequestException(passwordErrors[0]);
    }

    // Check if tenant or email already exists (generic error to prevent enumeration)
    const [existingTenant, existingUser] = await Promise.all([
      this.pool.query('SELECT id FROM tenants WHERE name = $1', [body.companyName]),
      this.pool.query('SELECT id FROM users WHERE email = $1', [body.email.toLowerCase()]),
    ]);

    if (existingTenant.rows.length > 0 || existingUser.rows.length > 0) {
      throw new BadRequestException('An account with these details already exists');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create tenant
      const tenantResult = await client.query(
        'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
        [body.companyName]
      );
      const tenantId = tenantResult.rows[0].id;

      // Hash password
      const passwordHash = await bcrypt.hash(body.password, 10);

      // Create user
      const userResult = await client.query(
        'INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tenantId, body.email.toLowerCase(), passwordHash, body.name, 'admin']
      );
      const userId = userResult.rows[0].id;

      // Create session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

      const sessionId = await client.query(
        'INSERT INTO sessions (user_id, tenant_id, expires_at) VALUES ($1, $2, $3) RETURNING id',
        [userId, tenantId, expiresAt]
      );

      await client.query('COMMIT');

      // Set HTTP-only cookie
      const isSecure = this.configService.get('COOKIE_SECURE', 'false') === 'true';
      res.cookie(SESSION_COOKIE_NAME, sessionId.rows[0].id, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });

      return {
        success: true,
        user: {
          id: userId,
          tenantId,
          email: body.email.toLowerCase(),
          name: body.name,
          role: 'admin',
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Get('me')
  async me(@Req() req: Request & { context: RequestContext }) {
    if (!req.context.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.authService.findUserById(req.context.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(@Res({ passthrough: true }) res: Response) {
    if (this.configService.get('DEV_LOGIN_ENABLED') !== 'true') {
      throw new ForbiddenException('Dev login is not enabled');
    }

    const DEMO_TENANT_NAME = 'Demo Buildex';
    const DEMO_USER_EMAIL = 'demo@buildex.ro';
    const DEMO_USER_NAME = 'Demo User';

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Find or create demo tenant
      let tenantResult = await client.query(
        'SELECT id FROM tenants WHERE name = $1',
        [DEMO_TENANT_NAME]
      );
      if (tenantResult.rows.length === 0) {
        tenantResult = await client.query(
          'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
          [DEMO_TENANT_NAME]
        );
        this.logger.log('Created demo tenant');
      }
      const tenantId = tenantResult.rows[0].id;

      // Find or create demo user (no password — only accessible via dev-login)
      let userResult = await client.query(
        'SELECT id, email, name, role FROM users WHERE tenant_id = $1 AND email = $2',
        [tenantId, DEMO_USER_EMAIL]
      );
      if (userResult.rows.length === 0) {
        userResult = await client.query(
          'INSERT INTO users (tenant_id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
          [tenantId, DEMO_USER_EMAIL, DEMO_USER_NAME, 'admin']
        );
        this.logger.log('Created demo user');
      }
      const user = userResult.rows[0];

      // Create session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

      const sessionResult = await client.query(
        'INSERT INTO sessions (user_id, tenant_id, expires_at) VALUES ($1, $2, $3) RETURNING id',
        [user.id, tenantId, expiresAt]
      );

      await client.query('COMMIT');

      const isSecure = this.configService.get('COOKIE_SECURE', 'false') === 'true';
      res.cookie(SESSION_COOKIE_NAME, sessionResult.rows[0].id, {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      });

      return {
        success: true,
        user: {
          id: user.id,
          tenantId,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() body: { name: string },
    @Req() req: Request & { context: RequestContext },
  ) {
    if (!req.context.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    if (!body.name || body.name.trim().length === 0) {
      throw new BadRequestException('Numele este obligatoriu');
    }

    if (body.name.trim().length > 100) {
      throw new BadRequestException('Numele nu poate depăși 100 de caractere');
    }

    const result = await this.pool.query(
      'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, tenant_id, email, name, role',
      [body.name.trim(), req.context.userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = result.rows[0];
    return {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: Request & { context: RequestContext },
  ) {
    if (!req.context.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Parola curentă și parola nouă sunt obligatorii');
    }

    const passwordErrors = validatePassword(body.newPassword);
    if (passwordErrors.length > 0) {
      throw new BadRequestException(passwordErrors[0]);
    }

    // Fetch current password hash
    const userResult = await this.pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.context.userId],
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      throw new BadRequestException('Contul nu are parolă configurată');
    }

    // Verify current password
    const isValid = await bcrypt.compare(body.currentPassword, user.password_hash);
    if (!isValid) {
      throw new BadRequestException('Parola curentă este incorectă');
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(body.newPassword, 10);
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, req.context.userId],
    );

    return { success: true, message: 'Parola a fost schimbată cu succes' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    
    if (sessionId) {
      await this.authService.deleteSession(sessionId);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    
    return { success: true };
  }
}
