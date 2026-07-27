import { Body, Controller, Get, Query, Post } from '@nestjs/common';
import { CaseEventsService } from './case-events.service';
import { CreateCaseEventDto } from './dto/create-case-event.dto';

@Controller('case-events')
export class CaseEventsController {
  constructor(private readonly caseEvents: CaseEventsService) {}

  @Post()
  create(@Body() dto: CreateCaseEventDto) {
    return this.caseEvents.create(dto.complaintNumber, dto);
  }

  // GET /case-events?complaintNumber=MG%2F2026%2F0007
  // (query strings handle the slash cleanly without any special routing)
  @Get()
  findAll(@Query('complaintNumber') complaintNumber: string) {
    return this.caseEvents.findAllForComplaint(complaintNumber);
  }
}
