#!/bin/bash

export USER_POOL_ID=$(aws ssm get-parameter --name "/app/order/userPoolId" --query "Parameter.Value" --output text) 
export CLIENT_ID=$(aws ssm get-parameter --name "/app/order/clientId" --query "Parameter.Value" --output text) 

echo $USER_POOL_ID
echo $CLIENT_ID

export CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client --user-pool-id $USER_POOL_ID --client-id $CLIENT_ID --query "UserPoolClient.ClientSecret" --output text)

echo $CLIENT_SECRET

aws ssm put-parameter --name /app/order/clientSecret --value $CLIENT_SECRET --type SecureString --overwrite