import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PriceEngineController (e2e)', () => {
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

  describe('/api/materials (GET)', () => {
    it('should return materials', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/materials')
        .set('Cookie', token)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/price/stats (GET)', () => {
    it('should return stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/price/stats')
        .set('Cookie', token)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/price/history (GET)', () => {
    it('should return price history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/price/history')
        .set('Cookie', token)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('/api/price/history (POST)', () => {
    it('should add price entry', async () => {
      const materialsRes = await request(app.getHttpServer())
        .get('/api/materials')
        .set('Cookie', token);
      
      const materialId = materialsRes.body[0]?.id;

      if (materialId) {
        const response = await request(app.getHttpServer())
          .post('/api/price/history')
          .set('Cookie', token)
          .send({
            materialId,
            unitPrice: 100,
            city: 'Bucuresti',
            observedAt: new Date().toISOString(),
            source: 'manual'
          })
          .expect(201);

        expect(response.body.id).toBeDefined();
      }
    });
  });
});
