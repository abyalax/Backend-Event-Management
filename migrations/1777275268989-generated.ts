import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1777275268989 implements MigrationInterface {
    name = 'Generated1777275268989'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_orders_status"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "generated_event_tickets" DROP CONSTRAINT "FK_c9296233357aa16bffd2d74ee1a"`);
        await queryRunner.query(`ALTER TABLE "generated_event_tickets" ALTER COLUMN "ticket_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_orders_status" ON "orders" ("status") `);
        await queryRunner.query(`ALTER TABLE "generated_event_tickets" ADD CONSTRAINT "FK_c9296233357aa16bffd2d74ee1a" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "generated_event_tickets" DROP CONSTRAINT "FK_c9296233357aa16bffd2d74ee1a"`);
        await queryRunner.query(`DROP INDEX "public"."idx_orders_status"`);
        await queryRunner.query(`ALTER TABLE "generated_event_tickets" ALTER COLUMN "ticket_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "generated_event_tickets" ADD CONSTRAINT "FK_c9296233357aa16bffd2d74ee1a" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "status" character varying(20) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_orders_status" ON "orders" ("status") `);
    }

}
