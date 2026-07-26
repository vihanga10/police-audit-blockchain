import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post()
  create(@Body() dto: CreateComplaintDto) {
    return this.complaints.create(dto);
  }

  // complaintNumber contains slashes (MG/2026/0001), so it is passed as
  // a query-style path segment with the slashes URL-encoded by the client
  // (MG%2F2026%2F0001), which Express decodes back to the real value here.
  @Get(':complaintNumber')
  findOne(@Param('complaintNumber') complaintNumber: string) {
    return this.complaints.findOne(complaintNumber);
  }
}
