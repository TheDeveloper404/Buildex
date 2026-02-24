import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let authCookie: string[];

  const DEMO_EMAIL = 'admin@democonstruction.ro';
  const DEMO_PASSWORD = 'demo1234';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    pool = app.get<Pool>('PG_POOL');

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/dev-login');
    authCookie = Array.isArray(loginRes.headers['set-cookie']) 
      ? loginRes.headers['set-cookie'] 
      : [loginRes.headers['set-cookie']];
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  describe('/api/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: DEMO_EMAIL, password: 'wrongpassword' })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });

    it('should reject missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('/api/auth/dev-login (POST)', () => {
    it('should login with dev-login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('/api/auth/me (GET)', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return user when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200);

      expect(response.body.email).toBeDefined();
    });
  });

  describe('/api/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });
  });

  describe('/api/healthz (GET)', () => {
    it('should return healthy status', async () => {
      await request(app.getHttpServer())
        .get('/api/healthz')
        .expect(200);
    });
  });
});
