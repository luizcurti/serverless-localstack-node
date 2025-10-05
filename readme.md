# Serverless Image Processing with LocalStack# AWS Lambda resize image



This project demonstrates how to build a serverless image processing service using AWS Lambda, S3, and LocalStack for local development.This project consists of an AWS Lambda function for automatically optimizing images stored in Amazon S3. It resizes images to a maximum of **1280x720** pixels and converts them to **JPEG** with indexd quality.



## Features## 📌 Features

- Listens for image upload events in S3 (`.jpg` and `.png` files).

- **Image Compression**: Automatically compresses images uploaded to S3- Resizes images while maintaining their original aspect ratio.

- **Local Development**: Uses LocalStack for local AWS service emulation- Converts images to **JPEG** with 50% quality.

- **Serverless Framework**: Deployed using the Serverless Framework- Saves the indexd version in the `compressed/` folder within the same bucket.

- **Sharp Integration**: High-performance image processing using Sharp

- **Testing**: Comprehensive test suite with Jest## 🚀 Technologies Used

- **Code Quality**: ESLint for code standardization- **AWS Lambda**

- **CI/CD**: Automated testing and deployment with GitHub Actions- **Amazon S3**

- **Node.js 22.x**

## Prerequisites- **Sharp (image processing library)**

- **Serverless Framework**

- Node.js 18.x or later

- Docker and Docker Compose## 📂 Project Structure

- Serverless Framework CLI```

├── src/index.js       # Main Lambda code

## Installation├── serverless.yml     # Serverless Framework configuration

├── package.json       # Project dependencies

1. Clone the repository:├── README.md          # Documentation

```bash├── docker-compose.yml # Localstack configuration

git clone <repository-url>```

cd serverless-localstack-node

```## 🔧 Setup and Deployment

### Prerequisites

2. Install dependencies:- AWS CLI configured with the necessary permissions.

```bash- Node.js installed (recommended version 22.x).

npm install- Serverless Framework installed (`npm install -g serverless`).

```

### Serverless Configuration

## Local Development1. Edit the `serverless.yml` file and set your S3 bucket name:

```yml

### 1. Start LocalStackprovider:

  environment:

Start the LocalStack container to emulate AWS services locally:    BUCKET_NAME: "s3-bucket"  # Replace with your S3 bucket name

```

```bash

docker-compose up -d2. Install project dependencies:

``````sh

npm install

### 2. Deploy to LocalStack```

3. Create policies and bucket (if needed):

Deploy your serverless application to LocalStack:```sh

./roles/iniinit-scripts.sh

```bash```

npm run deploy

```### Deploying to AWS

To deploy the Lambda function, run:

### 3. Test the Function```sh

npm run deploy

Upload a test image to trigger the function:```

This will deploy your function to AWS using the Serverless Framework.

```bash

# Test with a local eventAlternatively, if you want to deploy specifically to the production stage, use the following command:

npm run test:offline```sh

```npm run publish:aws

```

## Testing

### Manual Testing

Run the test suite:You can test the Lambda function locally by running the following:

```sh

```bashnpm run test:offline

# Run tests```

npm testThis will invoke the Lambda function locally using the event.json file as the input event. Make sure the event.json is correctly configured to match the structure of the events the Lambda function will receive from S3.



# Run tests in watch modeTo test the Lambda function manually in AWS, upload an image to the uploads/ folder of your S3 bucket (replace s3-bucket with your actual bucket name):

npm run test:watch```sh

aws --endpoint-url=http://localhost:4566 s3 cp uploads/example-image.jpg s3://s3-bucket/uploads/example-image.jpg

# Run tests with coverage```

npm run test:coverageIf everything is configured correctly, the resized and indexed version of the image will be saved in the compressed/ folder within the same bucket.

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