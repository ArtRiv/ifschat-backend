import { IsArray, IsEnum, IsOptional, IsString, ArrayNotEmpty, ArrayUnique } from 'class-validator'
import { ChatType } from '@prisma/client'

export class CreateChatDTO {
  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  membersIds!: string[]
}