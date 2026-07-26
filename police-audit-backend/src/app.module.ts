import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComplaintsModule } from './complaints/complaints.module';

@Module({
  imports: [ComplaintsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
