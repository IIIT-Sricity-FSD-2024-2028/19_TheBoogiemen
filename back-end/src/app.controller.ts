import { Controller, Get, Res, HttpCode } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  @Get()
  serveRoot(@Res() res: Response) {
    const frontendPath = '/Users/gayathridevi/Documents/FFSD/front-end';
    res.sendFile(path.join(frontendPath, 'login.html'));
  }
}


