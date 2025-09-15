import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SchemaService } from './schema.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { 
  CreateRelationTypeDto, 
  UpdateRelationTypeDto,
  CreateAttributeTypeDto,
  UpdateAttributeTypeDto,
  CreateNodeTypeDto,
  UpdateNodeTypeDto,
  CreateFunctionTypeDto,
  UpdateFunctionTypeDto
} from './dto/schema.dto.js';

@ApiTags('schemas')
@Controller('api/schema')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  // Relation Types
  @Get('relations')
  @ApiOperation({ summary: 'Get all relation types' })
  @ApiResponse({ status: 200, description: 'List of relation types' })
  async getRelationTypes() {
    return this.schemaService.getRelationTypes();
  }

  @Get('relations/:name')
  @ApiOperation({ summary: 'Get relation type by name' })
  @ApiParam({ name: 'name', description: 'Relation type name' })
  @ApiResponse({ status: 200, description: 'Relation type details' })
  @ApiResponse({ status: 404, description: 'Relation type not found' })
  async getRelationType(@Param('name') name: string) {
    return this.schemaService.getRelationType(name);
  }

  @Post('relations')
  @ApiOperation({ summary: 'Create new relation type' })
  @ApiResponse({ status: 201, description: 'Relation type created' })
  @ApiResponse({ status: 409, description: 'Relation type already exists' })
  async createRelationType(@Body() createRelationTypeDto: CreateRelationTypeDto) {
    return this.schemaService.createRelationType(createRelationTypeDto);
  }

  @Put('relations/:name')
  @ApiOperation({ summary: 'Update relation type' })
  @ApiParam({ name: 'name', description: 'Relation type name' })
  @ApiResponse({ status: 200, description: 'Relation type updated' })
  @ApiResponse({ status: 404, description: 'Relation type not found' })
  async updateRelationType(@Param('name') name: string, @Body() updateRelationTypeDto: UpdateRelationTypeDto) {
    return this.schemaService.updateRelationType(name, updateRelationTypeDto);
  }

  @Delete('relations/:name')
  @ApiOperation({ summary: 'Delete relation type' })
  @ApiParam({ name: 'name', description: 'Relation type name' })
  @ApiResponse({ status: 204, description: 'Relation type deleted' })
  @ApiResponse({ status: 404, description: 'Relation type not found' })
  async deleteRelationType(@Param('name') name: string) {
    return this.schemaService.deleteRelationType(name);
  }

  // Attribute Types
  @Get('attributes')
  @ApiOperation({ summary: 'Get all attribute types' })
  @ApiResponse({ status: 200, description: 'List of attribute types' })
  async getAttributeTypes() {
    return this.schemaService.getAttributeTypes();
  }

  @Get('attributes/:name')
  @ApiOperation({ summary: 'Get attribute type by name' })
  @ApiParam({ name: 'name', description: 'Attribute type name' })
  @ApiResponse({ status: 200, description: 'Attribute type details' })
  @ApiResponse({ status: 404, description: 'Attribute type not found' })
  async getAttributeType(@Param('name') name: string) {
    return this.schemaService.getAttributeType(name);
  }

  @Post('attributes')
  @ApiOperation({ summary: 'Create new attribute type' })
  @ApiResponse({ status: 201, description: 'Attribute type created' })
  @ApiResponse({ status: 409, description: 'Attribute type already exists' })
  async createAttributeType(@Body() createAttributeTypeDto: CreateAttributeTypeDto) {
    return this.schemaService.createAttributeType(createAttributeTypeDto);
  }

  @Put('attributes/:name')
  @ApiOperation({ summary: 'Update attribute type' })
  @ApiParam({ name: 'name', description: 'Attribute type name' })
  @ApiResponse({ status: 200, description: 'Attribute type updated' })
  @ApiResponse({ status: 404, description: 'Attribute type not found' })
  async updateAttributeType(@Param('name') name: string, @Body() updateAttributeTypeDto: UpdateAttributeTypeDto) {
    return this.schemaService.updateAttributeType(name, updateAttributeTypeDto);
  }

  @Delete('attributes/:name')
  @ApiOperation({ summary: 'Delete attribute type' })
  @ApiParam({ name: 'name', description: 'Attribute type name' })
  @ApiResponse({ status: 204, description: 'Attribute type deleted' })
  @ApiResponse({ status: 404, description: 'Attribute type not found' })
  async deleteAttributeType(@Param('name') name: string) {
    return this.schemaService.deleteAttributeType(name);
  }

  // Node Types
  @Get('nodetypes')
  @ApiOperation({ summary: 'Get all node types' })
  @ApiResponse({ status: 200, description: 'List of node types' })
  async getNodeTypes() {
    return this.schemaService.getNodeTypes();
  }

  @Get('nodetypes/:name')
  @ApiOperation({ summary: 'Get node type by name' })
  @ApiParam({ name: 'name', description: 'Node type name' })
  @ApiResponse({ status: 200, description: 'Node type details' })
  @ApiResponse({ status: 404, description: 'Node type not found' })
  async getNodeType(@Param('name') name: string) {
    return this.schemaService.getNodeType(name);
  }

  @Post('nodetypes')
  @ApiOperation({ summary: 'Create new node type' })
  @ApiResponse({ status: 201, description: 'Node type created' })
  @ApiResponse({ status: 409, description: 'Node type already exists' })
  async createNodeType(@Body() createNodeTypeDto: CreateNodeTypeDto) {
    return this.schemaService.createNodeType(createNodeTypeDto);
  }

  @Put('nodetypes/:name')
  @ApiOperation({ summary: 'Update node type' })
  @ApiParam({ name: 'name', description: 'Node type name' })
  @ApiResponse({ status: 200, description: 'Node type updated' })
  @ApiResponse({ status: 404, description: 'Node type not found' })
  async updateNodeType(@Param('name') name: string, @Body() updateNodeTypeDto: UpdateNodeTypeDto) {
    return this.schemaService.updateNodeType(name, updateNodeTypeDto);
  }

  @Delete('nodetypes/:name')
  @ApiOperation({ summary: 'Delete node type' })
  @ApiParam({ name: 'name', description: 'Node type name' })
  @ApiResponse({ status: 204, description: 'Node type deleted' })
  @ApiResponse({ status: 404, description: 'Node type not found' })
  async deleteNodeType(@Param('name') name: string) {
    return this.schemaService.deleteNodeType(name);
  }

  // Function Types
  @Get('functions')
  @ApiOperation({ summary: 'Get all function types' })
  @ApiResponse({ status: 200, description: 'List of function types' })
  async getFunctionTypes() {
    return this.schemaService.getFunctionTypes();
  }

  @Get('functions/:name')
  @ApiOperation({ summary: 'Get function type by name' })
  @ApiParam({ name: 'name', description: 'Function type name' })
  @ApiResponse({ status: 200, description: 'Function type details' })
  @ApiResponse({ status: 404, description: 'Function type not found' })
  async getFunctionType(@Param('name') name: string) {
    return this.schemaService.getFunctionType(name);
  }

  @Post('functions')
  @ApiOperation({ summary: 'Create new function type' })
  @ApiResponse({ status: 201, description: 'Function type created' })
  @ApiResponse({ status: 409, description: 'Function type already exists' })
  async createFunctionType(@Body() createFunctionTypeDto: CreateFunctionTypeDto) {
    return this.schemaService.createFunctionType(createFunctionTypeDto);
  }

  @Put('functions/:name')
  @ApiOperation({ summary: 'Update function type' })
  @ApiParam({ name: 'name', description: 'Function type name' })
  @ApiResponse({ status: 200, description: 'Function type updated' })
  @ApiResponse({ status: 404, description: 'Function type not found' })
  async updateFunctionType(@Param('name') name: string, @Body() updateFunctionTypeDto: UpdateFunctionTypeDto) {
    return this.schemaService.updateFunctionType(name, updateFunctionTypeDto);
  }

  @Delete('functions/:name')
  @ApiOperation({ summary: 'Delete function type' })
  @ApiParam({ name: 'name', description: 'Function type name' })
  @ApiResponse({ status: 204, description: 'Function type deleted' })
  @ApiResponse({ status: 404, description: 'Function type not found' })
  async deleteFunctionType(@Param('name') name: string) {
    return this.schemaService.deleteFunctionType(name);
  }
}

