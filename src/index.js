const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const { basename, extname } = require("path");

const s3Client = new S3Client({
  region: "eu-west-2",
  endpoint: "http://localhost:4566",
  forcePathStyle: true,
});

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

exports.handle = async (event) => {
  try {
    const bucket = process.env.BUCKET_NAME;

    if (!bucket) {
      throw new Error("Bucket not defined in environment variables.");
    }

    await Promise.all(
      event.Records.map(async (record) => {
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

        console.log(`Processing image: ${key} from bucket: ${bucket}`);

        const getObjectCommand = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        const data = await s3Client.send(getObjectCommand);

        if (!data.Body) {
          throw new Error(`Image ${key} not found or is empty.`);
        }

        console.log(`Fetched image from S3, stream type: ${typeof data.Body}`);

        const image = await streamToBuffer(data.Body);

        console.log(`Fetched image from S3, buffer length: ${image.length}`);

        const indexed = await sharp(image)
          .resize({ width: 1280, height: 720, fit: "inside" })
          .toFormat("jpeg", { progressive: true, quality: 50 })
          .toBuffer();

        const newKey = `compressed/${basename(key, extname(key))}.jpg`;
        await s3Client.send(new PutObjectCommand({
          Body: indexed,
          Bucket: bucket,
          ContentType: "image/jpeg",
          Key: newKey,
        }));

        console.log(`Compressed image saved at: ${newKey}`);
      })
    );
  } catch (err) {
    console.error("Error processing images:", err);
  }
};
