import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  Res,
  StreamableFile
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { GraphService } from './graph.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { 
  CreateGraphDto, 
  UpdateGraphModeDto, 
  UpdateGraphPreviewDto, 
  UpdateGraphPublicationDto,
  ProcessCNLDto,
  SaveCNLDto,
  CNLSuggestDto,
  CNLValidateDto
} from './dto/graph.dto';

@ApiTags('graphs')
@Controller('api/graphs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  @ApiOperation({ summary: 'Get all graphs for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of graphs' })
  async getGraphs(@Request() req) {
    return this.graphService.getGraphs(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new graph' })
  @ApiResponse({ status: 201, description: 'Graph created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid graph data' })
  async createGraph(@Request() req, @Body() createGraphDto: CreateGraphDto) {
    return this.graphService.createGraph(req.user.id, createGraphDto);
  }

  @Get(':graphId/graph')
  @ApiOperation({ summary: 'Get graph data by ID' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Graph data' })
  @ApiResponse({ status: 404, description: 'Graph not found' })
  async getGraph(@Request() req, @Param('graphId') graphId: string) {
    return this.graphService.getGraph(req.user.id, graphId);
  }

  @Get(':graphId/cnl')
  @ApiOperation({ summary: 'Get CNL content for a graph' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'CNL content' })
  async getCNL(@Request() req, @Param('graphId') graphId: string) {
    return this.graphService.getCNL(req.user.id, graphId);
  }

  @Put(':graphId/cnl')
  @ApiOperation({ summary: 'Save CNL content without processing' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'CNL saved successfully' })
  async saveCNL(@Request() req, @Param('graphId') graphId: string, @Body() saveCNLDto: SaveCNLDto) {
    return this.graphService.saveCNL(req.user.id, graphId, saveCNLDto);
  }

  @Post(':graphId/cnl')
  @ApiOperation({ summary: 'Process CNL content and update graph' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'CNL processed successfully' })
  @ApiResponse({ status: 400, description: 'CNL processing failed' })
  async processCNL(@Request() req, @Param('graphId') graphId: string, @Body() processCNLDto: ProcessCNLDto) {
    return this.graphService.processCNL(req.user.id, graphId, processCNLDto);
  }

  @Get(':graphId/key')
  @ApiOperation({ summary: 'Get graph key' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Graph key' })
  async getGraphKey(@Request() req, @Param('graphId') graphId: string) {
    return this.graphService.getGraphKey(req.user.id, graphId);
  }

  @Get(':graphId/publication')
  @ApiOperation({ summary: 'Get graph publication state' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Publication state' })
  async getPublicationState(@Request() req, @Param('graphId') graphId: string) {
    return this.graphService.getPublicationState(req.user.id, graphId);
  }

  @Put(':graphId/publication')
  @ApiOperation({ summary: 'Update graph publication state' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Publication state updated' })
  async updatePublicationState(@Request() req, @Param('graphId') graphId: string, @Body() updatePublicationDto: UpdateGraphPublicationDto) {
    return this.graphService.updatePublicationState(req.user.id, graphId, updatePublicationDto);
  }

  @Put(':graphId/mode')
  @ApiOperation({ summary: 'Update graph mode' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Graph mode updated' })
  async updateGraphMode(@Request() req, @Param('graphId') graphId: string, @Body() updateModeDto: UpdateGraphModeDto) {
    return this.graphService.updateGraphMode(req.user.id, graphId, updateModeDto);
  }

  @Put(':graphId/preview')
  @ApiOperation({ summary: 'Set graph preview' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Preview updated' })
  async updateGraphPreview(@Request() req, @Param('graphId') graphId: string, @Body() updatePreviewDto: UpdateGraphPreviewDto) {
    return this.graphService.updateGraphPreview(req.user.id, graphId, updatePreviewDto);
  }

  @Post(':graphId/publish')
  @ApiOperation({ summary: 'Publish graph' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 200, description: 'Graph published successfully' })
  async publishGraph(@Request() req, @Param('graphId') graphId: string) {
    return this.graphService.publishGraph(req.user.id, graphId);
  }

  @Get(':graphId/export')
  @ApiOperation({ summary: 'Export graph as NDF package' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiQuery({ name: 'name', required: false, description: 'Export filename' })
  @ApiResponse({ status: 200, description: 'NDF package file' })
  async exportGraph(@Request() req, @Param('graphId') graphId: string, @Query('name') name?: string, @Res() res?: Response) {
    const stream = await this.graphService.exportGraph(req.user.id, graphId, name);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name || 'graph'}.ndf.zip"`,
    });
    return stream.pipe(res);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import graph from NDF package' })
  @ApiResponse({ status: 201, description: 'Graph imported successfully' })
  async importGraph(@Request() req, @Body() file: any) {
    return this.graphService.importGraph(req.user.id, file);
  }

  @Delete(':graphId')
  @ApiOperation({ summary: 'Delete graph' })
  @ApiParam({ name: 'graphId', description: 'Graph ID' })
  @ApiResponse({ status: 204, description: 'Graph deleted successfully' })
  async deleteGraph(@Request() req, @Param('graphId') graphId: string) {
    return this.graphService.deleteGraph(req.user.id, graphId);
  }

  @Post('cnl/suggest')
  @ApiOperation({ summary: 'Get CNL suggestions' })
  @ApiResponse({ status: 200, description: 'CNL suggestions' })
  async suggestCNL(@Request() req, @Body() suggestDto: CNLSuggestDto) {
    return this.graphService.suggestCNL(req.user.id, suggestDto);
  }

  @Post('cnl/validate')
  @ApiOperation({ summary: 'Validate CNL content' })
  @ApiResponse({ status: 200, description: 'CNL validation result' })
  async validateCNL(@Request() req, @Body() validateDto: CNLValidateDto) {
    return this.graphService.validateCNL(req.user.id, validateDto);
  }
}
