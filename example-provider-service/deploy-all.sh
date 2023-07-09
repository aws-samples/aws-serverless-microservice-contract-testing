#/bin/bash

# UNCOMMENT THE BELOW LINE TO INSTALL PM2 IF NEEDED
# npm install pm2 -g

# UNCOMMENT THE BELOW LINE TO INSTALL SAM CLI IF NEEDED
# MORE DETAILS HERE: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
# brew install aws/tap/aws-sam-cli

npm install
npx cdk deploy
./setup-secret.sh
