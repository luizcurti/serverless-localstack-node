# Nodeless - Image indexr on AWS Lambda

This project consists of an AWS Lambda function for automatically optimizing images stored in Amazon S3. It resizes images to a maximum of **1280x720** pixels and converts them to **JPEG** with indexd quality.

## 📌 Features
- Listens for image upload events in S3 (`.jpg` and `.png` files).
- Resizes images while maintaining their original aspect ratio.
- Converts images to **JPEG** with 50% quality.
- Saves the indexd version in the `compressed/` folder within the same bucket.

## 🚀 Technologies Used
- **AWS Lambda**
- **Amazon S3**
- **Node.js 22.x**
- **Sharp (image processing library)**
- **Serverless Framework**

## 📂 Project Structure
```
├── src/index.js       # Main Lambda code
├── serverless.yml     # Serverless Framework configuration
├── package.json       # Project dependencies
├── README.md          # Documentation
├── docker-compose.yml # Localstack configuration
```

## 🔧 Setup and Deployment
### Prerequisites
- AWS CLI configured with the necessary permissions.
- Node.js installed (recommended version 22.x).
- Serverless Framework installed (`npm install -g serverless`).

### Serverless Configuration
1. Edit the `serverless.yml` file and set your S3 bucket name:
```yml
provider:
  environment:
    BUCKET_NAME: "s3-bucket"  # Replace with your S3 bucket name
```

2. Install project dependencies:
```sh
npm install
```
3. Create policies and bucket (if needed):
```sh
./roles/iniinit-scripts.sh
```

### Deploying to AWS
To deploy the Lambda function, run:
```sh
npm run deploy
```
This will deploy your function to AWS using the Serverless Framework.

Alternatively, if you want to deploy specifically to the production stage, use the following command:
```sh
npm run publish:aws
```

### Manual Testing
You can test the Lambda function locally by running the following:
```sh
npm run test:offline
```
This will invoke the Lambda function locally using the event.json file as the input event. Make sure the event.json is correctly configured to match the structure of the events the Lambda function will receive from S3.

To test the Lambda function manually in AWS, upload an image to the uploads/ folder of your S3 bucket (replace s3-bucket with your actual bucket name):
```sh
aws --endpoint-url=http://localhost:4566 s3 cp uploads/example-image.jpg s3://s3-bucket/uploads/example-image.jpg
```
If everything is configured correctly, the resized and indexed version of the image will be saved in the compressed/ folder within the same bucket.


If you need to remove the service:
```sh
npm run remove:aws
```