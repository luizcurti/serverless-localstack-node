// Setup file for Jest tests
process.env.NODE_ENV = 'test';
process.env.BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'eu-west-2';

// Mock AWS SDK globally if needed
jest.setTimeout(10000);
