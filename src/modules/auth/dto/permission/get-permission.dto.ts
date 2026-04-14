import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PermissionsDto {
  @Expose()
  id: number;

  @Expose()
  key: string;

  @Expose()
  name: string;
}
