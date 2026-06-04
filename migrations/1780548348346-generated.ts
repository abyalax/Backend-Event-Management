import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1780548348346 implements MigrationInterface {
    name = 'Generated1780548348346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "is_used"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_users_email"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "is_used" boolean NOT NULL DEFAULT false`);
    }

}
