import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1776937633605 implements MigrationInterface {
    name = 'Generated1776937633605'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2b7b8d6f6ebcd65da777932b84" ON "event_media" ("eventId", "type") WHERE type = 'banner'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2b7b8d6f6ebcd65da777932b84"`);
    }

}
