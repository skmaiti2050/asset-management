import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, promoteToAdmin, TestApp } from './test-app';

describe('Concurrency (e2e)', () => {
  let app: INestApplication;
  let server: TestApp['server'];
  let dataSource: DataSource;
  const base = '/api/v1';

  beforeAll(async () => {
    ({ app, server, dataSource } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAdminAndLogin(
    email: string,
    password: string,
  ): Promise<string> {
    await request(server)
      .post(`${base}/auth/register`)
      .send({ email, password })
      .expect(201);
    await promoteToAdmin(dataSource, email);
    const login = await request(server)
      .post(`${base}/auth/login`)
      .send({ email, password });
    expect(login.status).toBe(200);
    return login.body.accessToken as string;
  }

  async function registerAndLogin(
    email: string,
    password: string,
  ): Promise<string> {
    const reg = await request(server)
      .post(`${base}/auth/register`)
      .send({ email, password });
    expect(reg.status).toBe(201);

    const login = await request(server)
      .post(`${base}/auth/login`)
      .send({ email, password });
    expect(login.status).toBe(200);
    return login.body.accessToken as string;
  }

  it('exactly one of 20 concurrent claims succeeds on the same asset', async () => {
    const adminToken = await registerAdminAndLogin(
      'race-admin@example.com',
      'Password123!',
    );

    const create = await request(server)
      .post(`${base}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ codes: ['RACE-001'] });
    expect(create.status).toBe(201);

    const list = await request(server)
      .get(`${base}/assets`)
      .set('Authorization', `Bearer ${adminToken}`);
    const asset = list.body.items.find(
      (a: { code: string }) => a.code === 'RACE-001',
    );

    const tokens = [];
    for (let i = 0; i < 20; i++) {
      tokens.push(
        await registerAndLogin(`race${i}@example.com`, 'Password123!'),
      );
    }

    const results = await Promise.all(
      tokens.map((token) =>
        request(server)
          .post(`${base}/assets/${asset.id}/claim`)
          .set('Authorization', `Bearer ${token}`),
      ),
    );

    const ok = results.filter((r) => r.status === 201).length;
    const conflict = results.filter((r) => r.status === 409).length;

    expect(ok).toBe(1);
    expect(conflict).toBe(19);

    const pool = await request(server)
      .get(`${base}/assets/pool`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pool.body).toMatchObject({ total: 1, available: 0, claimed: 1 });
  });

  it('claim-any hands out distinct assets under parallel load', async () => {
    const adminToken = await registerAdminAndLogin(
      'race-admin2@example.com',
      'Password123!',
    );

    const create = await request(server)
      .post(`${base}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codes: ['RACE-201', 'RACE-202', 'RACE-203', 'RACE-204', 'RACE-205'],
      });
    expect(create.status).toBe(201);

    const tokens = [];
    for (let i = 0; i < 5; i++) {
      tokens.push(
        await registerAndLogin(`raceb${i}@example.com`, 'Password123!'),
      );
    }

    const results = await Promise.all(
      tokens.map((token) =>
        request(server)
          .post(`${base}/assets/claim-any`)
          .set('Authorization', `Bearer ${token}`),
      ),
    );

    const successes = results.filter((r) => r.status === 201);
    expect(successes.length).toBe(5);
    expect(new Set(successes.map((r) => r.body.code)).size).toBe(5);
  });
});
