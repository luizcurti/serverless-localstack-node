#!/bin/bash

echo "Creating S3 bucket s3-bucket..."
aws --endpoint-url=http://localhost:4566 s3 mb s3://s3-bucket

echo "Creating IAM role LambdaS3Role..."
aws --endpoint-url=http://localhost:4566 iam create-role --role-name LambdaS3Role --assume-role-policy-document file://roles/trust-policy.json

echo "Attaching AmazonS3FullAccess policy to the role..."
aws --endpoint-url=http://localhost:4566 iam attach-role-policy --role-name LambdaS3Role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

echo "Creating custom policy LambdaS3Policy..."
aws --endpoint-url=http://localhost:4566 iam create-policy --policy-name LambdaS3Policy --policy-document file://roles/policy.json

echo "Attaching custom policy LambdaS3Policy to the role..."
aws --endpoint-url=http://localhost:4566 iam attach-role-policy --role-name LambdaS3Role --policy-arn arn:aws:iam::000000000000:policy/LambdaS3Policy

echo "Uploading file to S3..."
aws --endpoint-url=http://localhost:4566 s3 cp uploads/example-image.jpg s3://s3-bucket/uploads/example-image.jpg

echo "Initialization completed successfully."
