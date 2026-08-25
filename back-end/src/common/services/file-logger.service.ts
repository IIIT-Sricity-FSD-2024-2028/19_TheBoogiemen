import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'AUDIT';
  message: string;
  context?: string;
  details?: any;
}

@Injectable()
export class FileLoggerService implements OnModuleInit, OnModuleDestroy {
  private logDir = path.resolve(process.cwd(), 'logs');
  private accessLogPath = path.join(this.logDir, 'access.log');
  private appLogPath = path.join(this.logDir, 'app.log');
  private errorLogPath = path.join(this.logDir, 'error.log');
  private auditLogPath = path.join(this.logDir, 'audit.log');

  private buffer: { path: string; line: string }[] = [];
  private flushIntervalTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.ensureLogDir();
    // Flush buffered logs to files every 2 seconds at regular intervals
    this.flushIntervalTimer = setInterval(() => this.flush(), 2000);
    this.logApp('INFO', 'FileLoggerService initialized. Disk log management active.', 'LoggerInit');
  }

  onModuleDestroy() {
    if (this.flushIntervalTimer) {
      clearInterval(this.flushIntervalTimer);
    }
    this.flush();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private append(filePath: string, line: string, immediate = false) {
    this.ensureLogDir();
    const formattedLine = line.endsWith('\n') ? line : line + '\n';
    if (immediate) {
      try {
        fs.appendFileSync(filePath, formattedLine, 'utf8');
      } catch (err) {
        console.error(`[FileLogger] Failed to write immediately to ${filePath}:`, err);
      }
    } else {
      this.buffer.push({ path: filePath, line: formattedLine });
      if (this.buffer.length >= 25) {
        this.flush();
      }
    }
  }

  public flush() {
    if (this.buffer.length === 0) return;
    this.ensureLogDir();
    const items = [...this.buffer];
    this.buffer = [];

    const grouped: Record<string, string[]> = {};
    for (const item of items) {
      if (!grouped[item.path]) grouped[item.path] = [];
      grouped[item.path].push(item.line);
    }

    for (const [targetPath, lines] of Object.entries(grouped)) {
      try {
        fs.appendFileSync(targetPath, lines.join(''), 'utf8');
      } catch (err) {
        console.error(`[FileLogger] Failed to flush to ${targetPath}:`, err);
      }
    }
  }

  public logAccess(entry: {
    method: string;
    url: string;
    status: number;
    durationMs: number;
    ip: string;
    userAgent?: string;
    userId?: string;
    tenantId?: string;
  }) {
    const timestamp = new Date().toISOString();
    const record = `[${timestamp}] [ACCESS] ${entry.method} ${entry.url} status=${entry.status} duration=${entry.durationMs}ms ip=${entry.ip} user=${entry.userId || 'guest'} tenant=${entry.tenantId || 'global'}\n`;
    this.append(this.accessLogPath, record);
    this.append(this.appLogPath, record);
  }

  public logApp(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, context = 'App', details?: any) {
    const timestamp = new Date().toISOString();
    const detStr = details ? ` | details=${JSON.stringify(details)}` : '';
    const record = `[${timestamp}] [${level}] [${context}] ${message}${detStr}\n`;
    this.append(this.appLogPath, record);
  }

  public logError(error: {
    message: string;
    statusCode?: number;
    path?: string;
    method?: string;
    stack?: string;
    userId?: string;
    details?: any;
  }) {
    const timestamp = new Date().toISOString();
    const stackStr = error.stack ? `\n  Stack: ${error.stack}` : '';
    const detStr = error.details ? `\n  Details: ${JSON.stringify(error.details)}` : '';
    const record = `[${timestamp}] [ERROR] ${error.method || 'GET'} ${error.path || '/'} status=${error.statusCode || 500} user=${error.userId || 'unknown'} - ${error.message}${detStr}${stackStr}\n`;
    
    // Write errors immediately to ensure data persistence during unexpected exits
    this.append(this.errorLogPath, record, true);
    this.append(this.appLogPath, record, true);
  }

  public logAudit(action: string, actor: string, target: string, details?: any) {
    const timestamp = new Date().toISOString();
    const detStr = details ? ` details=${JSON.stringify(details)}` : '';
    const record = `[${timestamp}] [AUDIT] actor=${actor} action="${action}" target="${target}"${detStr}\n`;
    this.append(this.auditLogPath, record, true);
    this.append(this.appLogPath, record);
  }

  public getRecentLogs(type: 'access' | 'app' | 'error' | 'audit' = 'app', limit = 100): string[] {
    this.flush();
    const map = {
      access: this.accessLogPath,
      app: this.appLogPath,
      error: this.errorLogPath,
      audit: this.auditLogPath,
    };
    const targetFile = map[type] || this.appLogPath;
    if (!fs.existsSync(targetFile)) return [];
    try {
      const content = fs.readFileSync(targetFile, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      return lines.slice(-limit);
    } catch (e) {
      return [`Failed to read logs: ${(e as Error).message}`];
    }
  }
}
