import { Controller, Get, Res, Param } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('*.html')
export class StaticFilesController {
  @Get()
  serveStaticFile(@Param('0') filePath: string, @Res() res: Response) {
    const frontendPath = '/Users/gayathridevi/Documents/FFSD/front-end';
    const fullPath = path.join(frontendPath, filePath);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(frontendPath)) {
      return res.status(403).send('Forbidden');
    }

    // Check if file exists
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
      return res.sendFile(normalizedPath);
    }

    res.status(404).send('Not Found');
  }
}

@Controller('*.css')
export class StaticCssController {
  @Get()
  serveStaticFile(@Param('0') filePath: string, @Res() res: Response) {
    const frontendPath = '/Users/gayathridevi/Documents/FFSD/front-end';
    const fullPath = path.join(frontendPath, filePath);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(frontendPath)) {
      return res.status(403).send('Forbidden');
    }

    // Check if file exists
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
      return res.sendFile(normalizedPath);
    }

    res.status(404).send('Not Found');
  }
}

@Controller('*.js')
export class StaticJsController {
  @Get()
  serveStaticFile(@Param('0') filePath: string, @Res() res: Response) {
    const frontendPath = '/Users/gayathridevi/Documents/FFSD/front-end';
    const fullPath = path.join(frontendPath, filePath);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(frontendPath)) {
      return res.status(403).send('Forbidden');
    }

    // Check if file exists
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
      return res.sendFile(normalizedPath);
    }

    res.status(404).send('Not Found');
  }
}
