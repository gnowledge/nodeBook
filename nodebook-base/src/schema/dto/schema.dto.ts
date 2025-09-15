import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateRelationTypeDto {
  @ApiProperty({ description: 'Relation type name', example: 'relates_to' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Relation type description', required: false, example: 'Indicates a relationship between two entities' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRelationTypeDto {
  @ApiProperty({ description: 'Relation type description', example: 'Updated description' })
  @IsString()
  description: string;
}

export class CreateAttributeTypeDto {
  @ApiProperty({ description: 'Attribute type name', example: 'color' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Attribute type description', required: false, example: 'Color attribute for nodes' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAttributeTypeDto {
  @ApiProperty({ description: 'Attribute type description', example: 'Updated description' })
  @IsString()
  description: string;
}

export class CreateNodeTypeDto {
  @ApiProperty({ description: 'Node type name', example: 'person' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Node type description', required: false, example: 'Represents a person entity' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateNodeTypeDto {
  @ApiProperty({ description: 'Node type description', example: 'Updated description' })
  @IsString()
  description: string;
}

export class CreateFunctionTypeDto {
  @ApiProperty({ description: 'Function type name', example: 'calculate_sum' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Function expression', example: 'a + b' })
  @IsString()
  expression: string;

  @ApiProperty({ description: 'Function scope variables', required: false, example: ['a', 'b'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @ApiProperty({ description: 'Function description', required: false, example: 'Calculates the sum of two numbers' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Required attributes', required: false, example: ['value1', 'value2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_attributes?: string[];
}

export class UpdateFunctionTypeDto {
  @ApiProperty({ description: 'Function expression', example: 'a + b + c' })
  @IsString()
  expression: string;

  @ApiProperty({ description: 'Function scope variables', example: ['a', 'b', 'c'] })
  @IsArray()
  @IsString({ each: true })
  scope: string[];

  @ApiProperty({ description: 'Function description', example: 'Updated description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Required attributes', example: ['value1', 'value2', 'value3'] })
  @IsArray()
  @IsString({ each: true })
  required_attributes: string[];
}

