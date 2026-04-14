import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1759646602934 implements MigrationInterface {
    name = 'Generated1759646602934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "key_name" character varying(80) NOT NULL, "name_permission" character varying(80) NOT NULL, CONSTRAINT "UQ_4be56d0cb4f14292b2b5942d3ba" UNIQUE ("key_name"), CONSTRAINT "UQ_e77c25aaad297ba331155532fa9" UNIQUE ("name_permission"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id_role" SERIAL NOT NULL, "name_role" character varying(50) NOT NULL, CONSTRAINT "PK_3ebdb96dd6787bda0e3c8f89d66" PRIMARY KEY ("id_role"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "category_name" ON "categories" ("name") `);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('Available', 'UnAvailable')`);
        await queryRunner.query(`CREATE TABLE "products" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "price" numeric(10,2) NOT NULL, "stock" integer NOT NULL, "status" "public"."products_status_enum" NOT NULL, "category_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "product_name" ON "products" ("name") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(100) NOT NULL, "refresh_token" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("id_role" integer NOT NULL, "id_permission" integer NOT NULL, CONSTRAINT "PK_f1d50d1a08901894b08dfa94fb2" PRIMARY KEY ("id_role", "id_permission"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0f5917f07a9e2bfd31ac5fb15" ON "role_permissions" ("id_role") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e7caee2bb7c1030ab07ad70ec" ON "role_permissions" ("id_permission") `);
        await queryRunner.query(`CREATE TABLE "user_roles" ("id_user" integer NOT NULL, "id_role" integer NOT NULL, CONSTRAINT "PK_dbfb392b1b20247554de529ea7c" PRIMARY KEY ("id_user", "id_role"))`);
        await queryRunner.query(`CREATE INDEX "IDX_37a75bf56b7a6ae65144e0d5c0" ON "user_roles" ("id_user") `);
        await queryRunner.query(`CREATE INDEX "IDX_af69ec5d5bd973309c025e7a62" ON "user_roles" ("id_role") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_c0f5917f07a9e2bfd31ac5fb154" FOREIGN KEY ("id_role") REFERENCES "roles"("id_role") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_5e7caee2bb7c1030ab07ad70ec2" FOREIGN KEY ("id_permission") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_37a75bf56b7a6ae65144e0d5c00" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_roles" ADD CONSTRAINT "FK_af69ec5d5bd973309c025e7a62e" FOREIGN KEY ("id_role") REFERENCES "roles"("id_role") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_af69ec5d5bd973309c025e7a62e"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_37a75bf56b7a6ae65144e0d5c00"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_5e7caee2bb7c1030ab07ad70ec2"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_c0f5917f07a9e2bfd31ac5fb154"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af69ec5d5bd973309c025e7a62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_37a75bf56b7a6ae65144e0d5c0"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e7caee2bb7c1030ab07ad70ec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0f5917f07a9e2bfd31ac5fb15"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."product_name"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."category_name"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
