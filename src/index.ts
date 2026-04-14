import { dataSource } from '../typeorm.config';

dataSource
  .initialize()
  .then(() => console.log('Connected into database...'))
  .catch((error) => console.log(error));
