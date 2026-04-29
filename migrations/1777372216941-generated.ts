import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1777372216941 implements MigrationInterface {
    name = 'Generated1777372216941'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" ADD "pdf_url" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "pdf_url"`);
    }

}
