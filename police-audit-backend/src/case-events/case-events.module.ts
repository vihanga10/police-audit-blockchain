import { Module } from '@nestjs/common';
import { CaseEventsController } from './case-events.controller';
import { CaseEventsService } from './case-events.service';
import { DatabaseModule } from '../database/database.module';
import { FabricModule } from '../fabric/fabric.module';

@Module({
  imports: [DatabaseModule, FabricModule],
  controllers: [CaseEventsController],
  providers: [CaseEventsService],
})
export class CaseEventsModule {}
