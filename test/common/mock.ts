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

// Infrastructure Service Mocks
export const mockConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
};

export const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  clear: jest.fn(),
};

export const mockRedisService = {
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

export const mockQueueService = {
  add: jest.fn(),
  addBulk: jest.fn(),
  getJob: jest.fn(),
  getJobs: jest.fn(),
  process: jest.fn(),
  close: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
};

export const mockEmailService = {
  sendEmail: jest.fn(),
  sendTemplateEmail: jest.fn(),
  sendTicketEmail: jest.fn(),
};

export const mockStorageService = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileUrl: jest.fn(),
  uploadBuffer: jest.fn(),
};

export const mockStorageHealthIndicator = {
  checkHealth: jest.fn(),
};

export const mockMailPitHealthIndicator = {
  checkHealth: jest.fn(),
};

export const mockMinioProvider = {
  client: {
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
    presignedGetObject: jest.fn(),
    listBuckets: jest.fn(),
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
  },
  getBucket: jest.fn(),
  getEndpoint: jest.fn(),
};
