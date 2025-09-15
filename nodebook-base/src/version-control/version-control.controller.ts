import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VersionControlService } from './version-control.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('version-control')
@Controller('api/graphs/:graphId/versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VersionControlController {
  constructor(private readonly versionControlService: VersionControlService) {}

  @Get()
  @ApiOperation({ summary: 'Get version history for a graph' })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getVersionHistory(@Request() req, @Param('graphId') graphId: string, @Query('limit') limit?: number) {
    return this.versionControlService.getVersionHistory(req.user.id, graphId, limit);
  }

  @Get(':commitId')
  @ApiOperation({ summary: 'Get specific version by commit ID' })
  @ApiResponse({ status: 200, description: 'Version details' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getVersion(@Request() req, @Param('graphId') graphId: string, @Param('commitId') commitId: string) {
    return this.versionControlService.getVersion(req.user.id, graphId, commitId);
  }

  @Post(':commitId/revert')
  @ApiOperation({ summary: 'Revert to specific version' })
  @ApiResponse({ status: 200, description: 'Reverted successfully' })
  @ApiResponse({ status: 400, description: 'Revert failed' })
  async revertToVersion(@Request() req, @Param('graphId') graphId: string, @Param('commitId') commitId: string) {
    return this.versionControlService.revertToVersion(req.user.id, graphId, commitId);
  }

  @Post('commit')
  @ApiOperation({ summary: 'Commit current changes' })
  @ApiResponse({ status: 200, description: 'Committed successfully' })
  async commitVersion(@Request() req, @Param('graphId') graphId: string, @Body() commitData: any) {
    return this.versionControlService.commitVersion(req.user.id, graphId, commitData);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiResponse({ status: 200, description: 'Comparison result' })
  async compareVersions(@Request() req, @Param('graphId') graphId: string, @Query('commit1') commit1: string, @Query('commit2') commit2: string) {
    return this.versionControlService.compareVersions(req.user.id, graphId, commit1, commit2);
  }
}

