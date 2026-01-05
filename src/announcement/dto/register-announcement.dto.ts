import { IsString, IsOptional, IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAnnouncementDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  visitorName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  visitorPhone?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  visitorEmail?: string;

  // ✅ AJOUT : ID de l'appareil généré côté client (UUID)
  @ApiProperty({
    required: true,
    description: "UUID de l'appareil pour garantir l'unicité de l'inscription",
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
