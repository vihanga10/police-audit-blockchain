import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { DatabaseModule } from '../database/database.module';
import { FabricModule } from '../fabric/fabric.module';

@Module({
  imports: [DatabaseModule, FabricModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
