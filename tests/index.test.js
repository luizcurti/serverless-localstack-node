const { mockClient } = require('aws-sdk-client-mock');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { handle } = require('../src/index');

// Mock S3Client
const s3Mock = mockClient(S3Client);

// Mock Sharp
jest.mock('sharp');

describe('Lambda Handler', () => {
  beforeEach(() => {
    s3Mock.reset();
    jest.clearAllMocks();
    process.env.BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    delete process.env.BUCKET_NAME;
  });

  test('should process S3 event and compress image', async () => {
    // Mock image data
    const mockImageBuffer = Buffer.from('fake-image-data');
    const mockCompressedBuffer = Buffer.from('compressed-image-data');

    // Mock S3 GetObject response
    const mockReadableStream = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(mockImageBuffer);
        }
        if (event === 'end') {
          callback();
        }
        return mockReadableStream;
      })
    };

    s3Mock.on(GetObjectCommand).resolves({
      Body: mockReadableStream
    });

    s3Mock.on(PutObjectCommand).resolves({});

    // Mock Sharp
    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(mockCompressedBuffer)
    };

    sharp.mockReturnValue(mockSharpInstance);

    // Test event
    const event = {
      Records: [
        {
          s3: {
            object: {
              key: 'uploads/test-image.jpg'
            }
          }
        }
      ]
    };

    // Execute handler
    await handle(event);

    // Verify S3 calls
    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(1);
    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);

    // Verify Sharp calls
    expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
    expect(mockSharpInstance.resize).toHaveBeenCalledWith({
      width: 1280,
      height: 720,
      fit: 'inside'
    });
    expect(mockSharpInstance.toFormat).toHaveBeenCalledWith('jpeg', {
      progressive: true,
      quality: 50
    });

    // Verify PutObject was called with correct parameters
    const putObjectCall = s3Mock.commandCalls(PutObjectCommand)[0];
    expect(putObjectCall.args[0].input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'compressed/test-image.jpg',
      ContentType: 'image/jpeg',
      Body: mockCompressedBuffer
    });
  });

  test('should handle missing bucket environment variable', async () => {
    delete process.env.BUCKET_NAME;

    const event = {
      Records: [
        {
          s3: {
            object: {
              key: 'uploads/test-image.jpg'
            }
          }
        }
      ]
    };

    // Bug fix: handler agora lança o erro diretamente (sem engolir)
    await expect(handle(event)).rejects.toThrow('Bucket not defined in environment variables.');
  });

  test('should handle S3 GetObject error', async () => {
    s3Mock.on(GetObjectCommand).rejects(new Error('S3 Error'));

    const event = {
      Records: [
        {
          s3: {
            object: {
              key: 'uploads/test-image.jpg'
            }
          }
        }
      ]
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Bug fix: handler agora lança erro agregado (não engole mais)
    await expect(handle(event)).rejects.toThrow('Failed to process 1 of 1 image(s)');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error processing image:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  test('should handle multiple images in single event', async () => {
    const mockImageBuffer = Buffer.from('fake-image-data');
    const mockCompressedBuffer = Buffer.from('compressed-image-data');

    const mockReadableStream = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(mockImageBuffer);
        }
        if (event === 'end') {
          callback();
        }
        return mockReadableStream;
      })
    };

    s3Mock.on(GetObjectCommand).resolves({
      Body: mockReadableStream
    });
    s3Mock.on(PutObjectCommand).resolves({});

    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(mockCompressedBuffer)
    };

    sharp.mockReturnValue(mockSharpInstance);

    const event = {
      Records: [
        {
          s3: {
            object: {
              key: 'uploads/test-image1.jpg'
            }
          }
        },
        {
          s3: {
            object: {
              key: 'uploads/test-image2.png'
            }
          }
        }
      ]
    };

    await handle(event);

    // Should process both images
    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(2);
    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(2);
  });

  test('should throw when data.Body is null (object empty)', async () => {
    s3Mock.on(GetObjectCommand).resolves({ Body: null });

    const event = {
      Records: [{ s3: { object: { key: 'uploads/empty.jpg' } } }]
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    await expect(handle(event)).rejects.toThrow('Failed to process 1 of 1 image(s)');
    expect(consoleSpy).toHaveBeenCalledWith('Error processing image:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('should decode URL-encoded key (+ as space)', async () => {
    const mockImageBuffer = Buffer.from('fake-image-data');
    const mockCompressedBuffer = Buffer.from('compressed-image-data');

    const mockReadableStream = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') callback(mockImageBuffer);
        if (event === 'end') callback();
        return mockReadableStream;
      })
    };

    s3Mock.on(GetObjectCommand).resolves({ Body: mockReadableStream });
    s3Mock.on(PutObjectCommand).resolves({});

    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(mockCompressedBuffer)
    };
    sharp.mockReturnValue(mockSharpInstance);

    // Chave com '+' (espaço URL-encoded)
    await handle({ Records: [{ s3: { object: { key: 'uploads/my+image.jpg' } } }] });

    // GetObject deve ser chamado com a chave decodificada (espaço real)
    const getCall = s3Mock.commandCalls(GetObjectCommand)[0];
    expect(getCall.args[0].input.Key).toBe('uploads/my image.jpg');
  });

  test('should save PNG as .jpg in compressed/ prefix', async () => {
    const mockImageBuffer = Buffer.from('fake-image-data');
    const mockCompressedBuffer = Buffer.from('compressed-image-data');

    const mockReadableStream = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') callback(mockImageBuffer);
        if (event === 'end') callback();
        return mockReadableStream;
      })
    };

    s3Mock.on(GetObjectCommand).resolves({ Body: mockReadableStream });
    s3Mock.on(PutObjectCommand).resolves({});

    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(mockCompressedBuffer)
    };
    sharp.mockReturnValue(mockSharpInstance);

    await handle({ Records: [{ s3: { object: { key: 'uploads/photo.png' } } }] });

    // PNG de entrada deve gerar compressed/photo.jpg (não .png)
    const putCall = s3Mock.commandCalls(PutObjectCommand)[0];
    expect(putCall.args[0].input.Key).toBe('compressed/photo.jpg');
    expect(putCall.args[0].input.ContentType).toBe('image/jpeg');
  });
});
