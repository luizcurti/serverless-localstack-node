# Serverless Image Processing with LocalStack

An AWS Lambda function that automatically compresses images uploaded to S3. It resizes images to a maximum of **1280x720** pixels and converts them to **JPEG** at 50% quality, saving the result in the `compressed/` prefix of the same bucket.

## Features

- Triggered by S3 `ObjectCreated` events for `.jpg`, `.jpeg`, and `.png` files
- Resizes images while preserving the original aspect ratio
- Converts all supported formats to JPEG (50% quality, progressive)
- Saves compressed images to the `compressed/` folder
- Processes multiple images concurrently per invocation
- Local development via LocalStack (no AWS account required)

## Technologies

- **Node.js 20.x**
- **AWS Lambda + Amazon S3**
- **Sharp** — high-performance image processing
- **Serverless Framework v4**
- **LocalStack** — local AWS emulation via Docker
- **Jest** — unit and E2E test suite
- **ESLint** (standard config)

## Project Structure

```
├── src/index.js          # Lambda handler
├── serverless.yml        # Serverless Framework configuration
├── docker-compose.yml    # LocalStack setup
├── jest.config.json      # Unit test configuration
├── jest.e2e.config.json  # E2E test configuration
├── roles/
│   ├── init-scripts.sh   # Bucket and IAM setup script
│   ├── policy.json       # S3 IAM policy
│   └── trust-policy.json # Lambda trust policy
├── uploads/              # Sample image for local testing
└── tests/
    ├── index.test.js     # Unit tests (mocked AWS SDK)
    └── e2e.test.js       # E2E tests (real LocalStack)
```

## Prerequisites

- Node.js 20.x or later
- Docker and Docker Compose
- AWS CLI (for manual S3 operations)
- Serverless Framework CLI (`npm install -g serverless`)

## Setup

```sh
# 1. Install dependencies
npm install

# 2. Start LocalStack
docker compose up -d

# 3. Create the S3 bucket and IAM resources
./roles/init-scripts.sh
```

## Running Tests

### Unit tests (no Docker required)

```sh
npm test
```

### E2E tests (requires LocalStack running)

```sh
docker compose up -d
npm run test:e2e
```

### Coverage report

```sh
npm run test:coverage
```

### Watch mode

```sh
npm run test:watch
```

## Local Deployment

Deploy to LocalStack (uses `dev` stage):

```sh
npm run deploy
```

Invoke the function locally with a sample event:

```sh
npm run test:offline
```

Upload a test image to trigger the function:

```sh
aws --endpoint-url=http://localhost:4566 s3 cp uploads/example-image.jpg s3://s3-bucket/uploads/example-image.jpg
```

## Deploying to AWS

```sh
# Deploy to the default stage
npm run deploy -- --stage prod

# Or use the dedicated script
npm run publish:aws
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `BUCKET_NAME` | S3 bucket name | *(required)* |
| `AWS_REGION` | AWS region | `eu-west-2` |
| `AWS_ENDPOINT_URL` | Custom endpoint (LocalStack) | *(unset in production)* |

## Linting

```sh
npm run lint        # check
npm run lint:fix    # auto-fix
```

## Code QualityIf you need to remove the service:

```sh

Lint your code:npm run remove:aws

```

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## Project Structure

```
├── src/
│   └── index.js          # Lambda function handler
├── tests/
│   ├── setup.js          # Jest test setup
│   └── index.test.js     # Unit tests for Lambda function
├── uploads/
│   └── example-image.jpg # Test image
├── roles/
│   ├── init-scripts.sh   # IAM role setup scripts
│   ├── policy.json       # IAM policy
│   └── trust-policy.json # IAM trust policy
├── .github/
│   └── workflows/
│       └── ci-cd.yml     # GitHub Actions workflow
├── docker-compose.yml    # LocalStack configuration
├── serverless.yml        # Serverless Framework configuration
├── jest.config.json      # Jest configuration
├── .eslintrc.json        # ESLint configuration
├── event.json           # Test event data
└── package.json         # Node.js dependencies and scripts
```

## Available Scripts

### Development
- `npm run deploy` - Deploy to LocalStack
- `npm run start:local` - Start serverless offline
- `npm run test:offline` - Test function with local event

### Testing & Quality
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues

### Production
- `npm run publish:aws` - Deploy to AWS (production)
- `npm run remove:aws` - Remove AWS deployment

## How It Works

1. **Image Upload**: When an image is uploaded to the S3 bucket (uploads/ prefix)
2. **Trigger**: S3 event triggers the Lambda function
3. **Processing**: The function downloads the image, compresses it using Sharp
4. **Storage**: Compressed image is saved to the compressed/ prefix in the same bucket

## Configuration

The application is configured through environment variables and the `serverless.yml` file:

- **BUCKET_NAME**: S3 bucket name for image storage
- **AWS_REGION**: AWS region (default: eu-west-2)
- **LocalStack Endpoint**: http://localhost:4566

## CI/CD Pipeline

The project includes a GitHub Actions workflow that:

1. **Tests**: Runs on Node.js 18.x and 20.x
2. **Linting**: Ensures code quality with ESLint
3. **Security**: Performs npm security audit
4. **Coverage**: Generates test coverage reports
5. **Integration Testing**: Tests against LocalStack
6. **Deployment**: Automatic deployment to dev/prod environments

### Required GitHub Secrets

Configure these secrets in your GitHub repository:

- `AWS_ACCESS_KEY_ID`: AWS Access Key
- `AWS_SECRET_ACCESS_KEY`: AWS Secret Key

## Production Deployment

To deploy to AWS:

```bash
npm run publish:aws
```

Make sure to configure your AWS credentials and update the `accountId` in `serverless.yml`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

The CI/CD pipeline will automatically test your changes.