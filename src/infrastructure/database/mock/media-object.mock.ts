import type { MediaObject } from "~/infrastructure/storage/entitiy/media-objects.entity";
import { EAccessType } from "~/infrastructure/storage/dto/presigned-url.dto";
import { ADMIN_ID } from "../const/shared-data";

export const mockMediaObjects: MediaObject[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440200",
    bucket: "events-public",
    objectKey: "banners/tech-conference-2024.png",
    mimeType: "image/png",
    size: 1063132,
    originalName: "tech-conference-2024.png",
    uploadedBy: ADMIN_ID,
    accessType: EAccessType.PUBLIC,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440201",
    bucket: "events-public",
    objectKey: "posters/web-dev-workshop.png",
    mimeType: "image/png",
    size: 809844,
    originalName: "web-dev-workshop.png",
    uploadedBy: ADMIN_ID,
    accessType: EAccessType.PUBLIC,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440202",
    bucket: "events-public",
    objectKey: "banners/data-science-summit.png",
    mimeType: "image/png",
    size: 490921,
    originalName: "data-science-summit.png",
    uploadedBy: ADMIN_ID,
    accessType: EAccessType.PUBLIC,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440203",
    bucket: "events-public",
    objectKey: "thumbnails/startup-pitch-night.png",
    mimeType: "image/png",
    size: 986698,
    originalName: "startup-pitch-night.png",
    uploadedBy: ADMIN_ID,
    accessType: EAccessType.PUBLIC,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440204",
    bucket: "events-public",
    objectKey: "gallery/mobile-app-bootcamp.png",
    mimeType: "image/png",
    size: 960895,
    originalName: "mobile-app-bootcamp.png",
    uploadedBy: ADMIN_ID,
    accessType: EAccessType.PUBLIC,
  },
];
