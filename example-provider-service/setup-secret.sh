#/bin/bash

echo "Retrieving SSM Parameters..."
export USER_POOL_ID=$(aws ssm get-parameter --name "/app/order/userPoolId" --with-decryption --query 'Parameter.Value' --output text)
export CLIENT_ID=$(aws ssm get-parameter --name "/app/order/clientId" --with-decryption --query 'Parameter.Value' --output text)
export CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client --user-pool-id $USER_POOL_ID --client-id $CLIENT_ID | jq -r '.UserPoolClient.ClientSecret')
export API_BASE_URL=$(aws ssm get-parameter --name "/app/order/serviceURL" --with-decryption --query 'Parameter.Value' --output text)
export COGNITO_URL=$(aws ssm get-parameter --name "/app/order/cognitoUrl" --with-decryption --query 'Parameter.Value' --output text)
export TABLE_NAME_ORDERS=$(aws ssm get-parameter --name "/app/order/tableName" --with-decryption --query 'Parameter.Value' --output text)
export LAMBDA_IDENTIFIER=$(aws ssm get-parameter --name "/app/order/lambdaIdentifier" --with-decryption --query 'Parameter.Value' --output text)
echo "SSM Parameters Retreived..."

echo "Uploading Client Secret to SSM"
aws ssm put-parameter --name "/app/order/clientSecret" --value $CLIENT_SECRET --overwrite --type SecureString
echo "CLIENT_SECRET uploaded to /app/order/clientSecret"

echo "USER_POOL_ID=$USER_POOL_ID"
echo "CLIENT_ID=$CLIENT_ID"
echo "CLIENT_SECRET=$CLIENT_SECRET"
echo "API_BASE_URL=$API_BASE_URL"
echo "COGNITO_URL=$COGNITO_URL"
echo "TABLE_NAME_ORDERS=$TABLE_NAME_ORDERS"
IFS='-' read -r -a array <<< "$LAMBDA_IDENTIFIER"
export IDENTIFIER="${array[1]}"

echo "{\"$IDENTIFIER\":{\"POWERTOOLS_SERVICE_NAME\":\"Handler\",\"POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS\":\"true\",\"POWERTOOLS_LOGGER_LOG_EVENT\":\"true\",\"LOG_LEVEL\":\"INFO\",\"TABLE_NAME_ORDERS\":\"ExampleProviderServiceStack-OrdersTable315BB997-18ZTPAVTXDDUF\",\"AWS_NODEJS_CONNECTION_REUSE_ENABLED\":\"1\"}}" > ./env.json
