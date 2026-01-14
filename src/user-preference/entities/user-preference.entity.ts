// entities/user-preference.entity.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserPreferenceEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty({ type: [String] })
  organizations: string[];

  @ApiProperty({ type: [String] })
  cities: string[];

  @ApiProperty({ type: [String] })
  regions: string[];

  @ApiProperty()
  notificationsEnabled: boolean;

  @ApiProperty()
  emailNotifications: boolean;

  @ApiProperty()
  pushNotifications: boolean;

  @ApiProperty()
  language: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<UserPreferenceEntity>) {
    Object.assign(this, partial);
  }
}
