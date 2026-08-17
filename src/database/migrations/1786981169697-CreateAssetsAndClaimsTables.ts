import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssetsAndClaimsTables1786981169697 implements MigrationInterface {
  name = 'CreateAssetsAndClaimsTables1786981169697';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'available', "claimed_by" uuid, "claimed_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_bff60c1b89bff7edff592d85ea4" UNIQUE ("code"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assets_claimed_by" ON "assets"  ("claimed_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assets_status" ON "assets"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "claims" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "asset_id" uuid NOT NULL, "action" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_96c91970c0dcb2f69fdccd0a698" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_asset" ON "claims"  ("asset_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_claims_user_created" ON "claims"  ("user_id", "created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_claims_asset"`);
    await queryRunner.query(`DROP TABLE "claims"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_assets_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_assets_claimed_by"`);
    await queryRunner.query(`DROP TABLE "assets"`);
  }
}
