import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScientificService } from './scientific.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('scientific')
@Controller('api/scientific')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScientificController {
  constructor(private readonly scientificService: ScientificService) {}

  @Get('libraries')
  @ApiOperation({ summary: 'Get available scientific libraries' })
  @ApiResponse({ status: 200, description: 'List of scientific libraries' })
  async getLibraries() {
    return this.scientificService.getLibraries();
  }

  @Get('libraries/:library')
  @ApiOperation({ summary: 'Get library information' })
  @ApiResponse({ status: 200, description: 'Library information' })
  @ApiResponse({ status: 404, description: 'Library not found' })
  async getLibraryInfo(@Param('library') library: string) {
    return this.scientificService.getLibraryInfo(library);
  }

  @Get('functions')
  @ApiOperation({ summary: 'Get scientific functions' })
  @ApiResponse({ status: 200, description: 'List of scientific functions' })
  async getFunctions(@Query('library') library?: string, @Query('category') category?: string, @Query('search') search?: string) {
    return this.scientificService.getFunctions(library, category, search);
  }

  @Get('functions/:library/:name')
  @ApiOperation({ summary: 'Get function information' })
  @ApiResponse({ status: 200, description: 'Function information' })
  @ApiResponse({ status: 404, description: 'Function not found' })
  async getFunctionInfo(@Param('library') library: string, @Param('name') name: string) {
    return this.scientificService.getFunctionInfo(library, name);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate mathematical expression' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateExpression(@Body() body: { expression: string }) {
    return this.scientificService.validateExpression(body.expression);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate mathematical expression' })
  @ApiResponse({ status: 200, description: 'Evaluation result' })
  async evaluateExpression(@Body() body: { expression: string; scope?: any }) {
    return this.scientificService.evaluateExpression(body.expression, body.scope);
  }
}
