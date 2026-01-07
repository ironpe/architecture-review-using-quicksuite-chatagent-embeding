#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ArchitectureReviewStack } from '../lib/architecture-review-stack';

const app = new cdk.App();

new ArchitectureReviewStack(app, 'ArchitectureReviewStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Architecture Review System - Document upload and preview application',
});

app.synth();
