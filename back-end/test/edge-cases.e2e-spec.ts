import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Edge Cases (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Module Edge Cases', () => {
    it('should return 404 for a non-existent user GET /users/:id', () => {
      return request(app.getHttpServer())
        .get('/users/invalid-uuid-1234')
        .set('x-user-role', 'admin')
        .expect(404)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('User not found');
        });
    });

    it('should return 403 when trying to access /users without admin or academic_head role', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('x-user-role', 'student')
        .expect(403);
    });

    it('should return 400 Bad Request for invalid payload in POST /users', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('x-user-role', 'admin')
        .send({
          invalidField: 'should not be here',
          username: '' // possibly invalid if validation is strict, let's just send invalid field
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.statusCode).toBe(400);
        });
    });

    it('should return 403 Forbidden when trying to downgrade an admin', () => {
      // First create an admin or fetch one if we know the mock data
      return request(app.getHttpServer())
        .get('/users')
        .set('x-user-role', 'admin')
        .then((res) => {
          const admins = res.body.data.filter((u: any) => u.role === 'admin');
          if (admins.length > 0) {
            return request(app.getHttpServer())
              .patch(`/users/${admins[0].id}/role`)
              .set('x-user-role', 'academic_head')
              .send({ role: 'student' })
              .expect(403)
              .expect((res2) => {
                expect(res2.body.message).toContain('Cannot downgrade an admin');
              });
          }
        });
    });
  });
});
