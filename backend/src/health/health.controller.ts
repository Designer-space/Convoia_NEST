import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectConnection } from '@nestjs/mongoose';
import { DataSource } from 'typeorm';
import { Connection } from 'mongoose';

@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongo: Connection,
  ) {}

  /** Liveness: is the process up? */
  @Get('health')
  health() {
    return { status: 'ok', uptime: process.uptime() };
  }

  /** Readiness: are the datastores reachable? */
  @Get('ready')
  async ready() {
    const checks: Record<string, boolean> = { postgres: false, mongo: false };
    try {
      await this.dataSource.query('SELECT 1');
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }
    checks.mongo = Number(this.mongo?.readyState) === 1;

    if (!checks.postgres || !checks.mongo) {
      throw new ServiceUnavailableException({ status: 'unavailable', checks });
    }
    return { status: 'ok', checks };
  }
}
