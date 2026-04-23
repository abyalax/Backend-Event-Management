import { MigrationInterface, QueryRunner } from "typeorm";

export class Generated1776935461265 implements MigrationInterface {
    name = 'Generated1776935461265'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "media_objects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bucket" character varying NOT NULL, "objectKey" character varying NOT NULL, "mimeType" character varying, "size" integer, "originalName" character varying, "uploadedBy" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6f25a90e781d66ee0c2515c11f7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "event_media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventId" character varying NOT NULL, "mediaId" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'banner', "order" integer NOT NULL DEFAULT '0', "event_id" uuid, "media_id" uuid, CONSTRAINT "PK_4e5f0c8c1718c8c2026c15296af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "event_media" ADD CONSTRAINT "FK_16a84aef47c794ac3d01f39830c" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_media" ADD CONSTRAINT "FK_e17d233df9a7600e7fdf6e30d77" FOREIGN KEY ("media_id") REFERENCES "media_objects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event_media" DROP CONSTRAINT "FK_e17d233df9a7600e7fdf6e30d77"`);
        await queryRunner.query(`ALTER TABLE "event_media" DROP CONSTRAINT "FK_16a84aef47c794ac3d01f39830c"`);
        await queryRunner.query(`DROP TABLE "event_media"`);
        await queryRunner.query(`DROP TABLE "media_objects"`);
    }

}
