import { IsArray, IsOptional, IsString } from 'class-validator'

export class UserDataDTO {
  @IsString()
  id!: string

  @IsString()
  username!: string

  @IsOptional()
  @IsString()
  avatarUrl?: string | null

  @IsArray()
  @IsString({ each: true })
  chatMemberships!: string[]
}