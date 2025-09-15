import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CollaborationService } from './collaboration.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('collaboration')
@Controller('api/collab')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post(':graphId/invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create collaboration invite' })
  @ApiResponse({ status: 201, description: 'Invite created successfully' })
  async createInvite(@Request() req, @Param('graphId') graphId: string, @Body() inviteData: any) {
    return this.collaborationService.createInvite(req.user.id, graphId, inviteData);
  }

  @Get('resolve/:token')
  @ApiOperation({ summary: 'Resolve collaboration invite token' })
  @ApiResponse({ status: 200, description: 'Invite details' })
  @ApiResponse({ status: 404, description: 'Invalid or expired invite' })
  async resolveInvite(@Param('token') token: string) {
    return this.collaborationService.resolveInvite(token);
  }

  @Get(':token/graphs/:graphId/graph')
  @ApiOperation({ summary: 'Get graph via collaboration invite' })
  @ApiResponse({ status: 200, description: 'Graph data' })
  @ApiResponse({ status: 403, description: 'Invalid invite' })
  @ApiResponse({ status: 404, description: 'Graph not found' })
  async getGraphViaInvite(@Param('token') token: string, @Param('graphId') graphId: string) {
    return this.collaborationService.getGraphViaInvite(token, graphId);
  }

  @Get(':token/graphs/:graphId/cnl')
  @ApiOperation({ summary: 'Get CNL via collaboration invite' })
  @ApiResponse({ status: 200, description: 'CNL content' })
  @ApiResponse({ status: 403, description: 'Invalid invite' })
  async getCNLViaInvite(@Param('token') token: string, @Param('graphId') graphId: string) {
    return this.collaborationService.getCNLViaInvite(token, graphId);
  }

  @Post(':token/graphs/:graphId/cnl')
  @ApiOperation({ summary: 'Submit CNL via collaboration invite' })
  @ApiResponse({ status: 200, description: 'CNL processed successfully' })
  @ApiResponse({ status: 403, description: 'Invalid invite or insufficient permissions' })
  async submitCNLViaInvite(@Param('token') token: string, @Param('graphId') graphId: string, @Body() cnlData: any) {
    return this.collaborationService.submitCNLViaInvite(token, graphId, cnlData);
  }
}

