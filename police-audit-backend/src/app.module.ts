import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComplaintsModule } from './complaints/complaints.module';
import { CaseEventsModule } from './case-events/case-events.module';

@Module({
  imports: [ComplaintsModule, CaseEventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
