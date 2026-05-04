import { Controller, Get, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @HttpCode(200)
  serveRoot(@Res() res: Response) {
    res.redirect('/login.html');
  }
}


