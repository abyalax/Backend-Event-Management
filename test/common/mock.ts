export const mockRepository = {
  find: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  eval: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  status: 'ready',
  quit: jest.fn().mockResolvedValue(true),
  on: jest.fn(),
};
