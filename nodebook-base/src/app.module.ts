import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { GraphModule } from './graph/graph.module.js';
import { SchemaModule } from './schema/schema.module.js';
import { ScientificModule } from './scientific/scientific.module.js';
import { MediaModule } from './media/media.module.js';
import { CollaborationModule } from './collaboration/collaboration.module.js';
import { VersionControlModule } from './version-control/version-control.module.js';
import { HealthModule } from './health/health.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    GraphModule,
    SchemaModule,
    ScientificModule,
    MediaModule,
    CollaborationModule,
    VersionControlModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

