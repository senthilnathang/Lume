import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LumeService {
  async getHealth() {
    return {
      success: true,
      message: 'Lume module running',
      status: 'healthy'
    };
  }

  async getVersion() {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return {
        success: true,
        data: {
          version: packageJson.version || '2.0.0',
          name: packageJson.name || 'lume'
        }
      };
    } catch (error) {
      return {
        success: true,
        data: {
          version: '2.0.0',
          name: 'lume'
        }
      };
    }
  }

  async getSystemInfo() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return {
      success: true,
      data: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: Math.floor(uptime),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          process: {
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers
          }
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0]?.model,
          speed: os.cpus()[0]?.speed
        },
        loadAverage: os.loadavg()
      }
    };
  }

  async getStatus() {
    const version = await this.getVersion();
    const systemInfo = await this.getSystemInfo();

    return {
      success: true,
      data: {
        application: version.data,
        system: systemInfo.data,
        timestamp: new Date().toISOString()
      }
    };
  }

  async getDashboardMetrics() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed / 1024 / 1024;
    const heapTotal = memUsage.heapTotal / 1024 / 1024;

    return {
      success: true,
      data: {
        uptime: {
          seconds: Math.floor(uptime),
          formatted: this.formatUptime(uptime)
        },
        memory: {
          heapUsed: Math.round(heapUsed),
          heapTotal: Math.round(heapTotal),
          percentage: Math.round((heapUsed / heapTotal) * 100)
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}
