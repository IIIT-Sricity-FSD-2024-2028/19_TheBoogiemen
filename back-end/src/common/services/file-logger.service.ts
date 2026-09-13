import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AccessLogEntry {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  userId?: string;
  tenantId?: string;
}

export interface AuditLogEntry {
  actorId: string;
  actorRole: string;
  action: string;
  resource: string;
  method: string;
  status: number;
  ip: string;
  timestamp: string;
  payload?: any;
}

@Injectable()
export class FileLoggerService implements OnModuleInit, OnModuleDestroy {
  private logDir = path.resolve(process.cwd(), 'logs');
  private accessBuffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    // Flush buffered access logs every 2 seconds
    this.flushTimer = setInterval(() => this.flushAccessLogs(), 2000);
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushAccessLogs();
  }

  public logAccess(entry: AccessLogEntry) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${entry.method} ${entry.url} ${entry.status} ${entry.durationMs}ms - IP: ${entry.ip} - User: ${entry.userId || 'anonymous'} - Tenant: ${entry.tenantId || 'none'}\n`;
    this.accessBuffer.push(line);
    if (this.accessBuffer.length >= 20) {
      this.flushAccessLogs();
    }
  }

  public logError(errorData: any) {
    const timestamp = new Date().toISOString();
    const filePath = path.join(this.logDir, 'error.log');
    const logLine = `[${timestamp}] [ERROR] ${JSON.stringify(errorData)}\n`;
    try {
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (err) {
      console.error('Failed to append to error.log:', err);
    }
  }

  public logAudit(entry: AuditLogEntry) {
    const filePath = path.join(this.logDir, 'audit.log');
    const logLine = `[${entry.timestamp}] [AUDIT] Actor: ${entry.actorId} (${entry.actorRole}) - ${entry.method} ${entry.resource} -> Status: ${entry.status} - IP: ${entry.ip} - Payload: ${JSON.stringify(entry.payload || {})}\n`;
    try {
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (err) {
      console.error('Failed to append to audit.log:', err);
    }
  }

  private flushAccessLogs() {
    if (this.accessBuffer.length === 0) return;
    const filePath = path.join(this.logDir, 'access.log');
    const toWrite = this.accessBuffer.join('');
    this.accessBuffer = [];
    try {
      fs.appendFileSync(filePath, toWrite, 'utf8');
    } catch (err) {
      console.error('Failed to flush access logs:', err);
    }
  }
}
