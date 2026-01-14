import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Adresse email',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email requis' })
  email: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'Password123!',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mot de passe requis' })
  password: string;

  @ApiPropertyOptional({
    description: 'Device ID pour session',
    example: 'device123',
  })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'User Agent', example: 'Mozilla/5.0 …' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
