import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, promoteToAdmin, TestApp } from './test-app';

describe('Asset Management API (e2e)', () => {
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

  it('health check reports database up', async () => {
    const res = await request(server).get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.details.database.status).toBe('up');
  });

  describe('authentication', () => {
    it('rejects unauthenticated access', async () => {
      const res = await request(server).get(`${base}/auth/me`);
      expect(res.status).toBe(401);
    });

    it('registers, logs in and returns the profile without the hash', async () => {
      const token = await registerAndLogin('flow@example.com', 'Password123!');
      const me = await request(server)
        .get(`${base}/auth/me`)
        .set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      expect(me.body.email).toBe('flow@example.com');
      expect(me.body.passwordHash).toBeUndefined();
    });

    it('rejects duplicate registration', async () => {
      const res = await request(server)
        .post(`${base}/auth/register`)
        .send({ email: 'flow@example.com', password: 'Password123!' });
      expect(res.status).toBe(409);
    });

    it('rejects invalid credentials', async () => {
      const res = await request(server)
        .post(`${base}/auth/login`)
        .send({ email: 'flow@example.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('rejects unexpected fields', async () => {
      const res = await request(server).post(`${base}/auth/register`).send({
        email: 'x@example.com',
        password: 'Password123!',
        admin: true,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('assets', () => {
    let adminToken: string;
    let memberToken: string;

    beforeAll(async () => {
      adminToken = await registerAdminAndLogin(
        'admin-flow@example.com',
        'Password123!',
      );
      memberToken = await registerAndLogin(
        'member-flow@example.com',
        'Password123!',
      );
    });

    it('forbids non-admins from creating assets', async () => {
      const res = await request(server)
        .post(`${base}/assets`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ codes: ['NOPE-001'] });
      expect(res.status).toBe(403);
    });

    it('creates assets and reports the pool state', async () => {
      const create = await request(server)
        .post(`${base}/assets`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ codes: ['E2E-001', 'E2E-002', 'E2E-003'] });
      expect(create.status).toBe(201);
      expect(create.body.created).toBe(3);

      const pool = await request(server)
        .get(`${base}/assets/pool`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pool.body).toMatchObject({ total: 3, available: 3, claimed: 0 });
    });

    it('claims a specific asset exactly once', async () => {
      const list = await request(server)
        .get(`${base}/assets`)
        .set('Authorization', `Bearer ${memberToken}`);
      const asset = list.body.items.find(
        (a: { code: string }) => a.code === 'E2E-001',
      );

      const claim = await request(server)
        .post(`${base}/assets/${asset.id}/claim`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(claim.status).toBe(201);
      expect(claim.body.status).toBe('claimed');
      expect(claim.body.claimedAt).toBeDefined();

      const again = await request(server)
        .post(`${base}/assets/${asset.id}/claim`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(again.status).toBe(409);

      const otherUser = await registerAndLogin(
        'other-flow@example.com',
        'Password123!',
      );
      const theirs = await request(server)
        .post(`${base}/assets/${asset.id}/claim`)
        .set('Authorization', `Bearer ${otherUser}`);
      expect(theirs.status).toBe(409);
    });

    it('releases a claimed asset back to the pool', async () => {
      const list = await request(server)
        .get(`${base}/assets?status=claimed`)
        .set('Authorization', `Bearer ${memberToken}`);
      const claimed = list.body.items.find(
        (a: { code: string }) => a.code === 'E2E-001',
      );

      const release = await request(server)
        .post(`${base}/assets/${claimed.id}/release`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(release.status).toBe(201);
      expect(release.body.status).toBe('available');

      const pool = await request(server)
        .get(`${base}/assets/pool`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(pool.body.available).toBe(3);
    });

    it('claims any available asset', async () => {
      const claim = await request(server)
        .post(`${base}/assets/claim-any`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(claim.status).toBe(201);
      expect(['E2E-001', 'E2E-002', 'E2E-003']).toContain(claim.body.code);
    });

    it('returns claim history and current assets', async () => {
      const history = await request(server)
        .get(`${base}/me/history`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(history.status).toBe(200);
      expect(history.body.items.length).toBeGreaterThanOrEqual(3);
      expect(history.body.items[0]).toHaveProperty('assetCode');
      expect(history.body.items[0]).toHaveProperty('userEmail');

      const mine = await request(server)
        .get(`${base}/me/assets`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(mine.status).toBe(200);
      expect(mine.body.total).toBe(1);
    });

    it('updates an asset with optimistic locking', async () => {
      const list = await request(server)
        .get(`${base}/assets`)
        .set('Authorization', `Bearer ${adminToken}`);
      const asset = list.body.items.find(
        (a: { code: string }) => a.code === 'E2E-003',
      );

      const updated = await request(server)
        .patch(`${base}/assets/${asset.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ version: asset.version, expiresAt: '2030-01-01T00:00:00Z' });
      expect(updated.status).toBe(200);
      expect(updated.body.expiresAt).toBeDefined();

      const stale = await request(server)
        .patch(`${base}/assets/${asset.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ version: 1, expiresAt: '2031-01-01T00:00:00Z' });
      expect(stale.status).toBe(409);
    });
  });
});
