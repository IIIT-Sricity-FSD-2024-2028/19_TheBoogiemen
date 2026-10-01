import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { generatePdfBuffer } from '../common/pdf-generator';
import { RequiresModule } from '../common/guards/requires-module.guard';
import { campusScope } from '../core/scope';
import { FeesService } from './fees.service';

const FINANCE = ['FINANCE_ADMIN'] as const;
const READERS = ['FINANCE_ADMIN', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN', 'head', 'DEPARTMENT_ADMIN_HOD'] as const;

@ApiTags('Fees')
@ApiBearerAuth()
@RequiresModule('fees')
@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService, private readonly db: InMemoryDbService) {}

  private s(u: AuthenticatedUser) {
    return campusScope(this.db, u);
  }

  @Get('structures')
  @Roles(...FINANCE, 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  structures(@CurrentUser() u: AuthenticatedUser) {
    return this.fees.structures(this.s(u));
  }

  @Post('structures')
  @Roles(...FINANCE)
  createStructure(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.fees.createStructure(this.s(u), body);
  }

  @Delete('structures/:id')
  @Roles(...FINANCE)
  deleteStructure(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.fees.deleteStructure(this.s(u), id);
  }

  @Post('structures/:id/generate')
  @Roles(...FINANCE)
  @HttpCode(200)
  generate(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.fees.generate(this.s(u), id);
  }

  @Get('summary')
  @Roles(...READERS)
  summary(@CurrentUser() u: AuthenticatedUser) {
    return this.fees.summary(this.s(u));
  }

  @Get('payments')
  @Roles(...FINANCE, 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  payments(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.fees.payments(this.s(u), q);
  }

  @Get('payments/:id/receipt')
  @Roles('student', ...FINANCE, 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  receipt(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Query('format') format: string, @Res() res: Response) {
    const r = this.fees.receipt(this.s(u), id);
    if (format !== 'pdf') return res.json(r);
    const rupees = (n: number) => `Rs. ${Number(n).toLocaleString('en-IN')}`;
    const pdf = generatePdfBuffer(
      `${r.college?.name ?? 'College'} - Fee receipt`,
      `Receipt ${r.payment.receipt_no} | ${r.student.name} (${r.student.roll_no ?? '-'}) | Paid ${r.payment.paid_at.slice(0, 10)}`,
      ['Item', 'Amount'],
      [
        ...(r.fee?.components || []).map((c: any) => [c.name, rupees(c.amount)]),
        ['Total fee', rupees(r.fee?.amount ?? 0)],
        [`Paid now (${r.payment.mode.replace('_', ' ')}${r.payment.reference ? `, ref ${r.payment.reference}` : ''})`, rupees(r.payment.amount)],
        ['Balance after this payment', rupees(Math.max(0, (r.fee?.amount ?? 0) - (r.fee?.paid_amount ?? 0)))],
      ],
    );
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${r.payment.receipt_no}.pdf"`, 'Content-Length': String(pdf.length) });
    return res.end(pdf);
  }

  @Post('reminders')
  @Roles(...FINANCE)
  @HttpCode(200)
  remind(@CurrentUser() u: AuthenticatedUser, @Body() body: { fee_ids: string[] }) {
    return this.fees.remind(this.s(u), body?.fee_ids);
  }

  @Get('me')
  @Roles('student')
  mine(@CurrentUser() u: AuthenticatedUser) {
    return this.fees.mine(this.s(u));
  }

  @Post('me/:id/pay')
  @Roles('student')
  @HttpCode(200)
  pay(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.fees.payOnline(this.s(u), id, body);
  }

  @Get()
  @Roles(...READERS)
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.fees.list(this.s(u), q);
  }

  @Post()
  @Roles(...FINANCE)
  create(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.fees.create(this.s(u), body);
  }

  @Post(':id/payments')
  @Roles(...FINANCE)
  record(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.fees.recordPayment(this.s(u), id, body);
  }
}
