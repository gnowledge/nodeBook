import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('media')
@Controller('api/media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('files')
  @ApiOperation({ summary: 'Get media files' })
  @ApiResponse({ status: 200, description: 'List of media files' })
  async getFiles(@Request() req, @Body() query: any) {
    return this.mediaService.getFiles(req.user.id, query);
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get media file by ID' })
  @ApiResponse({ status: 200, description: 'Media file' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Request() req, @Param('fileId') fileId: string) {
    return this.mediaService.getFile(req.user.id, fileId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload media file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@Request() req, @Body() file: any) {
    return this.mediaService.uploadFile(req.user.id, file);
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete media file' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Request() req, @Param('fileId') fileId: string) {
    return this.mediaService.deleteFile(req.user.id, fileId);
  }

  @Put('files/:fileId/metadata')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiResponse({ status: 200, description: 'Metadata updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateFileMetadata(@Request() req, @Param('fileId') fileId: string, @Body() metadata: any) {
    return this.mediaService.updateFileMetadata(req.user.id, fileId, metadata);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage statistics' })
  async getStats(@Request() req) {
    return this.mediaService.getStats(req.user.id);
  }
}

