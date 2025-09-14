import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateGraphDto {
  @ApiProperty({ description: 'Graph name', example: 'My New Graph' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Author name', required: false, example: 'John Doe' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: 'Author email', required: false, example: 'john@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ 
    description: 'Graph mode', 
    enum: ['markdown', 'mindmap', 'richgraph', 'strictgraph'],
    default: 'richgraph',
    example: 'richgraph'
  })
  @IsOptional()
  @IsEnum(['markdown', 'mindmap', 'richgraph', 'strictgraph'])
  mode?: string;
}

export class UpdateGraphModeDto {
  @ApiProperty({ 
    description: 'Graph mode', 
    enum: ['markdown', 'mindmap', 'richgraph', 'strictgraph'],
    example: 'strictgraph'
  })
  @IsEnum(['markdown', 'mindmap', 'richgraph', 'strictgraph'])
  mode: string;
}

export class UpdateGraphPreviewDto {
  @ApiProperty({ description: 'Preview URL', example: 'https://example.com/preview.svg' })
  @IsString()
  preview_url: string;

  @ApiProperty({ description: 'Node ID for preview', required: false, example: 'node-123' })
  @IsOptional()
  @IsString()
  node_id?: string;
}

export class UpdateGraphPublicationDto {
  @ApiProperty({ 
    description: 'Publication state', 
    enum: ['Private', 'P2P', 'Public'],
    example: 'Public'
  })
  @IsEnum(['Private', 'P2P', 'Public'])
  publication_state: string;
}

export class ProcessCNLDto {
  @ApiProperty({ description: 'CNL text content', example: '# My Graph\n\nNode A relates to Node B' })
  @IsString()
  cnlText: string;

  @ApiProperty({ description: 'Strict mode validation', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  strictMode?: boolean;
}

export class SaveCNLDto {
  @ApiProperty({ description: 'CNL text content', example: '# My Graph\n\nNode A relates to Node B' })
  @IsString()
  cnlText: string;
}

export class CNLSuggestDto {
  @ApiProperty({ description: 'Text to generate suggestions for', example: 'Node A' })
  @IsString()
  text: string;
}

export class CNLValidateDto {
  @ApiProperty({ description: 'CNL text to validate', example: '# My Graph\n\nNode A relates to Node B' })
  @IsString()
  cnlText: string;
}
