import { Logger } from '@nestjs/common';
import { dataSource } from '../typeorm.config';

const logger = new Logger('Database');

dataSource
  .initialize()
  .then(() => logger.log('Connected into database...'))
  .catch((error) => logger.error('Database connection failed', error));
