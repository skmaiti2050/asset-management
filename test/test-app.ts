import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

export interface TestApp {
  app: INestApplication;
  server: Server;
  dataSource: DataSource;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.listen(0);

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();
  await dataSource.query('TRUNCATE users, assets, claims CASCADE');

  return { app, server: app.getHttpServer() as Server, dataSource };
}

export async function promoteToAdmin(
  dataSource: DataSource,
  email: string,
): Promise<void> {
  await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
    email,
  ]);
}
