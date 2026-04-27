import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1777265597760 implements MigrationInterface {
    name = 'Generated1777265597760'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_paymentmethod_enum" AS ENUM('INVOICE', 'VIRTUAL_ACCOUNT', 'QRIS', 'EWALLET')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'SETTLED')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "externalId" character varying NOT NULL, "xenditId" character varying, "paymentMethod" "public"."transactions_paymentmethod_enum" NOT NULL, "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'PENDING', "amount" numeric(15,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'IDR', "payerEmail" character varying, "description" character varying, "paymentUrl" character varying, "paidAt" TIMESTAMP, "expiresAt" TIMESTAMP, "retryCount" integer NOT NULL DEFAULT '0', "xenditResponse" jsonb, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c7677fa092ee0c2659fbf452920" UNIQUE ("externalId"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c7677fa092ee0c2659fbf45292" ON "transactions" ("externalId") `);
        await queryRunner.query(`CREATE INDEX "IDX_03a0dc30ed84a71abbf143b2f8" ON "transactions" ("xenditId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_03a0dc30ed84a71abbf143b2f8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7677fa092ee0c2659fbf45292"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_paymentmethod_enum"`);
    }

}
