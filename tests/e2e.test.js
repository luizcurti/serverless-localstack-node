process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
process.env.AWS_REGION = 'eu-west-2';
process.env.BUCKET_NAME = 's3-bucket';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';

const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { handle } = require('../src/index');

const ENDPOINT = process.env.AWS_ENDPOINT_URL;
const BUCKET = process.env.BUCKET_NAME;
const REGION = process.env.AWS_REGION;

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

const makeEvent = (key) => ({
  Records: [{ s3: { object: { key } } }]
});

async function uploadTestImage (key) {
  const imageBuffer = fs.readFileSync(
    path.join(__dirname, '../uploads/example-image.jpg')
  );
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/jpeg'
  }));
}

async function objectExists (key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function deleteObjects (keys) {
  await Promise.allSettled(
    keys.map(key => s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })))
  );
}

beforeAll(async () => {
  try {
    await s3.send(new CreateBucketCommand({
      Bucket: BUCKET,
      CreateBucketConfiguration: { LocationConstraint: REGION }
    }));
  } catch (err) {
    const EXPECTED = ['BucketAlreadyOwnedByYou', 'BucketAlreadyExists', 'IllegalLocationConstraintException'];
    if (!EXPECTED.includes(err.name)) {
      throw new Error(
        `LocalStack is not accessible. Start it with:\n  docker compose up -d\n\nOriginal error: ${err.message}`
      );
    }
  }
});

afterEach(async () => {
  await deleteObjects([
    'uploads/e2e-jpg-test.jpg',
    'uploads/e2e-png-test.png',
    'uploads/e2e encoded.jpg',
    'compressed/e2e-jpg-test.jpg',
    'compressed/e2e-png-test.jpg',
    'compressed/e2e encoded.jpg'
  ]);
});

describe('E2E: Lambda Handler with LocalStack', () => {
  test('should compress JPG and save to compressed/', async () => {
    await uploadTestImage('uploads/e2e-jpg-test.jpg');

    await handle(makeEvent('uploads/e2e-jpg-test.jpg'));

    expect(await objectExists('compressed/e2e-jpg-test.jpg')).toBe(true);
  });

  test('should convert PNG to JPG and save to compressed/', async () => {
    await uploadTestImage('uploads/e2e-png-test.png');

    await handle(makeEvent('uploads/e2e-png-test.png'));

    expect(await objectExists('compressed/e2e-png-test.jpg')).toBe(true);
  });

  test('should decode URL-encoded key (+ as space)', async () => {
    await uploadTestImage('uploads/e2e encoded.jpg');

    await handle(makeEvent('uploads/e2e+encoded.jpg'));

    expect(await objectExists('compressed/e2e encoded.jpg')).toBe(true);
  });

  test('should process multiple images in a single event', async () => {
    await Promise.all([
      uploadTestImage('uploads/e2e-jpg-test.jpg'),
      uploadTestImage('uploads/e2e-png-test.png')
    ]);

    await handle({
      Records: [
        { s3: { object: { key: 'uploads/e2e-jpg-test.jpg' } } },
        { s3: { object: { key: 'uploads/e2e-png-test.png' } } }
      ]
    });

    expect(await objectExists('compressed/e2e-jpg-test.jpg')).toBe(true);
    expect(await objectExists('compressed/e2e-png-test.jpg')).toBe(true);
  });

  test('should reject when S3 object does not exist', async () => {
    await expect(
      handle(makeEvent('uploads/nonexistent-file.jpg'))
    ).rejects.toThrow('Failed to process 1 of 1 image(s)');
  });

  test('should silently skip files with unsupported extension', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    await handle(makeEvent('uploads/document.gif'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping unsupported file type')
    );
    consoleSpy.mockRestore();
  });

  test('should throw immediately when BUCKET_NAME is not defined', async () => {
    const original = process.env.BUCKET_NAME;
    delete process.env.BUCKET_NAME;

    await expect(
      handle(makeEvent('uploads/e2e-jpg-test.jpg'))
    ).rejects.toThrow('Bucket not defined in environment variables.');

    process.env.BUCKET_NAME = original;
  });
});
