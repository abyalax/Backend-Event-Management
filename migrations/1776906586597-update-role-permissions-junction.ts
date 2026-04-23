import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRolePermissionsJunction1776906586597 implements MigrationInterface {
    name = 'UpdateRolePermissionsJunction1776906586597'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_c0f5917f07a9e2bfd31ac5fb154"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0f5917f07a9e2bfd31ac5fb15"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e7caee2bb7c1030ab07ad70ec"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "id_role_permission" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_f1d50d1a08901894b08dfa94fb2"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_0119771428853666484659015c1" PRIMARY KEY ("id_role", "id_permission", "id_role_permission")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_5e7caee2bb7c1030ab07ad70ec2"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_0119771428853666484659015c1"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_e5c8be5aae7cf1c8398c3ab6406" PRIMARY KEY ("id_permission", "id_role_permission")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_e5c8be5aae7cf1c8398c3ab6406"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_24a4b96b060d0a0fee0f8702396" PRIMARY KEY ("id_role_permission")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_c0f5917f07a9e2bfd31ac5fb154" FOREIGN KEY ("id_role") REFERENCES "roles"("id_role") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_5e7caee2bb7c1030ab07ad70ec2" FOREIGN KEY ("id_permission") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_5e7caee2bb7c1030ab07ad70ec2"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_c0f5917f07a9e2bfd31ac5fb154"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_24a4b96b060d0a0fee0f8702396"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_e5c8be5aae7cf1c8398c3ab6406" PRIMARY KEY ("id_permission", "id_role_permission")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_e5c8be5aae7cf1c8398c3ab6406"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_0119771428853666484659015c1" PRIMARY KEY ("id_role", "id_permission", "id_role_permission")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_5e7caee2bb7c1030ab07ad70ec2" FOREIGN KEY ("id_permission") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_0119771428853666484659015c1"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_f1d50d1a08901894b08dfa94fb2" PRIMARY KEY ("id_role", "id_permission")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "id_role_permission"`);
        await queryRunner.query(`CREATE INDEX "IDX_5e7caee2bb7c1030ab07ad70ec" ON "role_permissions" ("id_permission") `);
        await queryRunner.query(`CREATE INDEX "IDX_c0f5917f07a9e2bfd31ac5fb15" ON "role_permissions" ("id_role") `);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_c0f5917f07a9e2bfd31ac5fb154" FOREIGN KEY ("id_role") REFERENCES "roles"("id_role") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
