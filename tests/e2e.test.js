/**
 * Testes E2E: Lambda Handler contra LocalStack real
 *
 * Pré-requisito: LocalStack rodando
 *   docker compose up -d
 *
 * Rodar com:
 *   npm run test:e2e
 */

// Definir vars de ambiente ANTES de qualquer require para que
// o S3Client em src/index.js use o endpoint correto ao ser carregado.
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

// ─── helpers ─────────────────────────────────────────────────────────────────

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

// ─── setup/teardown ───────────────────────────────────────────────────────────

beforeAll(async () => {
  try {
    await s3.send(new CreateBucketCommand({
      Bucket: BUCKET,
      CreateBucketConfiguration: { LocationConstraint: REGION }
    }));
  } catch (err) {
    // Bucket já existe — ok para re-runs
    if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(err.name)) {
      throw new Error(
        `LocalStack não está acessível. Inicie com:\n  docker compose up -d\n\nErro original: ${err.message}`
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

// ─── testes ──────────────────────────────────────────────────────────────────

describe('E2E: Lambda Handler com LocalStack', () => {
  test('deve comprimir imagem JPG e salvar em compressed/', async () => {
    await uploadTestImage('uploads/e2e-jpg-test.jpg');

    await handle(makeEvent('uploads/e2e-jpg-test.jpg'));

    expect(await objectExists('compressed/e2e-jpg-test.jpg')).toBe(true);
  });

  test('deve converter PNG para JPG e salvar em compressed/', async () => {
    // Envia conteúdo JPEG com extensão .png (sharp usa o buffer, não a extensão)
    await uploadTestImage('uploads/e2e-png-test.png');

    await handle(makeEvent('uploads/e2e-png-test.png'));

    // Saída deve ser .jpg independente da extensão de entrada
    expect(await objectExists('compressed/e2e-png-test.jpg')).toBe(true);
  });

  test('deve decodificar chave URL-encoded (+ como espaço)', async () => {
    // Chave real no S3 tem espaço
    await uploadTestImage('uploads/e2e encoded.jpg');

    // Evento S3 codifica espaços como +
    await handle(makeEvent('uploads/e2e+encoded.jpg'));

    expect(await objectExists('compressed/e2e encoded.jpg')).toBe(true);
  });

  test('deve processar múltiplas imagens em um único evento', async () => {
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

  test('deve rejeitar quando o objeto S3 não existe', async () => {
    // Objeto nunca foi enviado ao bucket
    await expect(
      handle(makeEvent('uploads/nonexistent-file.jpg'))
    ).rejects.toThrow('Failed to process 1 of 1 image(s)');
  });

  test('deve ignorar silenciosamente arquivos com extensão não suportada', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    // .gif não está na allow-list
    await handle(makeEvent('uploads/document.gif'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping unsupported file type')
    );
    consoleSpy.mockRestore();
  });

  test('deve lançar erro imediato quando BUCKET_NAME não está definido', async () => {
    const original = process.env.BUCKET_NAME;
    delete process.env.BUCKET_NAME;

    await expect(
      handle(makeEvent('uploads/e2e-jpg-test.jpg'))
    ).rejects.toThrow('Bucket not defined in environment variables.');

    process.env.BUCKET_NAME = original;
  });
});
