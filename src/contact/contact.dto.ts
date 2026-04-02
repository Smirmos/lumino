import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class ContactDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  language!: string;

  @IsString()
  interest!: string;

  @IsOptional()
  @IsBoolean()
  dedicatedNumber?: boolean;

  @IsString()
  message!: string;
}
