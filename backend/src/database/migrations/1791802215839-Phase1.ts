import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 schema changes.
 *
 * Hand-edited from the TypeORM-generated diff so that it is safe to run against
 * a populated database:
 *  - `citext` / `uuid-ossp` extensions are created first.
 *  - `email` / `username` are converted in place with ALTER ... TYPE instead of
 *    being dropped and re-added (which would lose data).
 *  - `friendrequest.status` is converted to an enum via USING instead of being
 *    dropped, and the ordered pair is backfilled before being made NOT NULL.
 */
export class Phase11791802215839 implements MigrationInterface {
  name = 'Phase11791802215839';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ---------------------------------------------------------------- tokens
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" integer NOT NULL, "tokenHash" character varying(128) NOT NULL, "familyId" uuid NOT NULL, "deviceInfo" character varying(255), "ip" character varying(64), "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "replacedBy" character varying(128), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c25bc63d248ca90e8dcc1d92d06" UNIQUE ("tokenHash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_40e9a8b923a1b3fb4429a5c624" ON "refresh_tokens" ("familyId") `,
    );

    // ----------------------------------------------------------------- users
    await queryRunner.query(
      `ALTER TABLE "users" ADD "privacy" jsonb NOT NULL DEFAULT '{"showEmailToFriends":true,"showPhoneToFriends":true}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastSeenAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    // Preserve data: change the column type in place instead of drop + add.
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE citext USING ("email"::citext)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "username" TYPE citext USING ("username"::citext)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")`,
    );

    // -------------------------------------------------------- friendrequest
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ADD "respondedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ADD "userLowId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ADD "userHighId" integer`,
    );
    // Backfill the ordered pair before enforcing NOT NULL.
    await queryRunner.query(
      `UPDATE "friendrequest" SET "userLowId" = LEAST("senderId", "receiverId"), "userHighId" = GREATEST("senderId", "receiverId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "userLowId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "userHighId" SET NOT NULL`,
    );

    // Convert status in place (existing values are all valid enum labels).
    await queryRunner.query(
      `CREATE TYPE "public"."friendrequest_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "status" TYPE "public"."friendrequest_status_enum" USING ("status"::text::"public"."friendrequest_status_enum")`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f00bf467976b3dd62ed0a98973" ON "friendrequest" ("userLowId", "userHighId") WHERE "status" IN ('PENDING', 'ACCEPTED')`,
    );

    // --------------------------------------------------- participants/convos
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD "lastReadSeq" bigint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18c4ba3b127461649e5f5039db" ON "conversation_participants" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "dmKey" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD "lastSeq" bigint NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_665075b54bd3c353e030c75cf0" ON "conversations" ("dmKey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_665075b54bd3c353e030c75cf0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP COLUMN "lastSeq"`,
    );
    await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN "dmKey"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18c4ba3b127461649e5f5039db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP COLUMN "lastReadSeq"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_f00bf467976b3dd62ed0a98973"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" ALTER COLUMN "status" TYPE character varying USING ("status"::text)`,
    );
    await queryRunner.query(`DROP TYPE "public"."friendrequest_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "friendrequest" DROP COLUMN "userHighId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" DROP COLUMN "userLowId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendrequest" DROP COLUMN "respondedAt"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "username" TYPE character varying USING ("username"::text)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE character varying USING ("email"::text)`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastSeenAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "privacy"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_40e9a8b923a1b3fb4429a5c624"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
