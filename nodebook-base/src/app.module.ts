import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GraphModule } from './graph/graph.module';
import { SchemaModule } from './schema/schema.module';
import { ScientificModule } from './scientific/scientific.module';
import { MediaModule } from './media/media.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { VersionControlModule } from './version-control/version-control.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
