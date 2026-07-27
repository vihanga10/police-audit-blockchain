import { Body, Controller, Get, Query, Post } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post()
  create(@Body() dto: CreateComplaintDto) {
    return this.complaints.create(dto);
  }

  // GET /complaints?complaintNumber=MG%2F2026%2F0007
  //
  // Same fix as case-events: complaint numbers contain slashes
  // (MG/2026/0007), which breaks URL path routing unless every client
  // remembers to URL-encode them correctly. A query parameter sidesteps
  // the gotcha entirely rather than relying on untested path-decoding
  // behaviour.
  @Get()
  findOne(@Query('complaintNumber') complaintNumber: string) {
    return this.complaints.findOne(complaintNumber);
  }
}
