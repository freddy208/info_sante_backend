import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Refresh token invalide' })
  @IsNotEmpty({ message: 'Refresh token requis' })
  refreshToken: string;

  @ApiProperty({
    description: 'Device ID (optionnel pour sécuriser la session)',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  deviceId?: string;
}
