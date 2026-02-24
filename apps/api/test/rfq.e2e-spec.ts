import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RFQController (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let token: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    pool = app.get<Pool>('PG_POOL');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/dev-login');
    token = Array.isArray(loginResponse.headers['set-cookie'])
      ? loginResponse.headers['set-cookie']
      : [loginResponse.headers['set-cookie']];
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  describe('/api/rfqs (GET)', () => {
    it('should return RFQs for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/rfqs')
        .set('Cookie', token)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/rfqs')
        .expect(401);
    });
  });

  describe('/api/rfqs (POST)', () => {
    it('should create RFQ with items', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/rfqs')
        .set('Cookie', token)
        .send({
          projectName: 'Test RFQ E2E',
          deliveryCity: 'Bucuresti',
          desiredDate: new Date().toISOString(),
          items: [
            { materialId: 'test-id', qty: 100 }
          ]
        })
        .expect(201);

      expect(response.body.projectName).toBe('Test RFQ E2E');
    });
  });

  describe('/api/materials (GET)', () => {
    it('should return materials', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/materials')
        .set('Cookie', token)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/suppliers (GET)', () => {
    it('should return suppliers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/suppliers')
        .set('Cookie', token)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
