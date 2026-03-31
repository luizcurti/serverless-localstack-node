require('dotenv').config();
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { basename, extname } = require('path');

// Bug fix: endpoint LocalStack era hardcoded — quebra em produção.
// Usar AWS_ENDPOINT_URL apenas quando definido (local/dev).
const clientOptions = {
  region: process.env.AWS_REGION || 'eu-west-2',
  forcePathStyle: true
};

if (process.env.AWS_ENDPOINT_URL) {
  clientOptions.endpoint = process.env.AWS_ENDPOINT_URL;
}

const s3Client = new S3Client(clientOptions);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

exports.handle = async (event) => {
  // Bug fix: bucket check fora do try/catch — deve falhar imediatamente e visualmente.
  const bucket = process.env.BUCKET_NAME;
  if (!bucket) {
    throw new Error('Bucket not defined in environment variables.');
  }

  // Bug fix: Promise.all aborta o batch inteiro se 1 imagem falha.
  // Promise.allSettled processa todas as imagens e coleta falhas individuais.
  const results = await Promise.allSettled(
    event.Records.map(async (record) => {
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const ext = extname(key).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        console.warn(`Skipping unsupported file type: ${key}`);
        return;
      }

      console.log(`Processing image: ${key} from bucket: ${bucket}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const data = await s3Client.send(getObjectCommand);

      if (!data.Body) {
        throw new Error(`Image ${key} not found or is empty.`);
      }

      console.log(`Fetched image from S3, stream type: ${typeof data.Body}`);

      const image = await streamToBuffer(data.Body);

      console.log(`Fetched image from S3, buffer length: ${image.length}`);

      const compressed = await sharp(image)
        .resize({ width: 1280, height: 720, fit: 'inside' })
        .toFormat('jpeg', { progressive: true, quality: 50 })
        .toBuffer();

      const newKey = `compressed/${basename(key, extname(key))}.jpg`;
      await s3Client.send(new PutObjectCommand({
        Body: compressed,
        Bucket: bucket,
        ContentType: 'image/jpeg',
        Key: newKey
      }));

      console.log(`Compressed image saved at: ${newKey}`);
    })
  );

  // Bug fix: erros eram apenas logados — Lambda reportava sucesso mesmo com falha.
  // Agora relança o erro para que AWS possa retentar e alarmar corretamente.
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    failures.forEach(f => console.error('Error processing image:', f.reason));
    throw new Error(`Failed to process ${failures.length} of ${results.length} image(s)`);
  }
};
