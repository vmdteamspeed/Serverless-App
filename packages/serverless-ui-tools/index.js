const fs = require('fs');

const _ = require('lodash');
const aws = require('aws-sdk');
const chalk = require('chalk');

const { toLines } = require('./src/utils/env.js');
const { runCommand } = require('./src/utils/command.js');

class ServerlessUIToolsPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.commands = {
      'publish-ui': {
        usage: 'Packages UI & Deploys (via "aws s3 sync") a target directory to the `websiteBucketName` bucket.',
        lifecycleEvents: ['write-env', 'build', 'deploy', 'invalidate-cache'],
        options: {
          'build-dir': {
            usage: 'Specify the directory containing UI code to be deployed to S3.',
            default: 'build/',
          },
          'invalidate-cache': {
            usage:
              'If enabled, invalidates the entire CloudFront distribution after deploying (only if the bucket was modified). Requires a `websiteCloudFrontId` setting to be specified.',
            default: true,
          },
        },
      },
      'deploy-ui': {
        usage: 'Deploys (via "aws s3 sync") a target directory to the `websiteBucketName` bucket.',
        lifecycleEvents: ['deploy', 'invalidate-cache'],
        options: {
          'build-dir': {
            usage: 'Specify the directory containing UI code to be deployed to S3.',
            default: 'build/',
          },
          'invalidate-cache': {
            usage:
              'If enabled, invalidates the entire CloudFront distribution after deploying (only if the bucket was modified). Requires a `websiteCloudFrontId` setting to be specified.',
            default: false,
          },
        },
      },
      'package-ui': {
        usage:
          'Packages the UI, ready for deployment. For Create React App (the default and only supported UI provider at present), this also generates ' +
          'an `.env.local` and `.env.production` environment file (depending whether the "--local" flag is set).',
        lifecycleEvents: ['write-env', 'build'],
        options: {
          local: {
            usage: 'If enabled, "$ pnpm run build" is not executed.',
            default: false,
          },
        },
      },
      'start-ui': {
        usage: 'Serves the UI over a local development server',
        lifecycleEvents: ['start'],
        options: {},
      },
    };

    this.hooks = {
      'publish-ui:write-env': this.writeEnv.bind(this),
      'publish-ui:build': this.build.bind(this),
      'publish-ui:deploy': this.deploy.bind(this),
      'publish-ui:invalidate-cache': this.invalidateCache.bind(this),
      'deploy-ui:deploy': this.deploy.bind(this),
      'deploy-ui:invalidate-cache': this.invalidateCache.bind(this),
      'package-ui:write-env': this.writeEnv.bind(this),
      'package-ui:build': this.build.bind(this),
      'start-ui:start': this.startUI.bind(this),
    };

    this.cli = {
      raw(message) {
        serverless.cli.consoleLog(chalk.dim(message));
      },
      log(message) {
        serverless.cli.consoleLog(`[serverless-ui-tools] ${chalk.yellowBright(message)}`);
      },
    };
  }

  getCloudFront() {
    const profile = this.serverless.service.custom.settings.awsProfile;
    const region = this.serverless.service.custom.settings.awsRegion;

    aws.config.update({
      maxRetries: 3,
      region,
      sslEnabled: true,
    });

    // if a an AWS SDK profile has been configured, use its credentials
    if (profile) {
      const credentials = new aws.SharedIniFileCredentials({ profile });
      aws.config.update({ credentials });
    }
    return new aws.CloudFront();
  }

  async deploy() {
    const bucketName = this.serverless.service.custom.settings.websiteBucketName;
    let buildDir = this.options['build-dir'];
    // Ensure trailing slash
    if (buildDir.substr(-1) !== '/') {
      buildDir += '/';
    }

    this.cli.log(`Deploying UI in ${buildDir} to ${bucketName} S3 bucket...`);

    this.mutatedBucket = false;
    try {
      const awsProfile = this.serverless.service.custom.settings.awsProfile;
      const args = [
        's3',
        'sync',
        buildDir,
        `s3://${bucketName}`,
        '--delete',
        '--region',
        this.serverless.service.custom.settings.awsRegion,
      ];
      if (awsProfile) {
        args.push('--profile', awsProfile);
      }
      await runCommand({
        command: 'aws',
        args,
        stdout: {
          log: this.cli.log,
          raw: msg => {
            this.mutatedBucket = true; // If external command outputs to stdout.raw then we probably mutated the bucket
            this.cli.raw(msg);
          },
        },
      });
    } catch (err) {
      throw new Error(`Error running "aws s3 sync": ${err}`);
    }
  }

  writeEnv() {
    this.cli.log('Reading from ${self:custom.envTemplate}...'); // eslint-disable-line

    // ==== Load template
    let env = { ...this.serverless.service.custom.envTemplate };
    if (_.isEmpty(env)) {
      throw new Error('custom.envTemplate must be defined');
    }

    // ==== Apply local-only overrides
    const isLocal = this.options.local;
    if (isLocal) {
      this.cli.log('Applying local overrides:\n');
      this.cli.raw(`${toLines(env.localOverrides)}\n`);
      env = { ...env, ...env.localOverrides };
    }

    // Build date and Time plus an identifier
    env.REACT_APP_BUILD_DATE = Date().toLocaleString();
    env.REACT_APP_BUILD_ID = Math.floor(Math.random() * 10000000);

    // ==== Write CRA environment file
    const fileName = isLocal ? '.env.local' : '.env.production';
    const text = toLines(env);
    const comment = `# GENERATED BY the "deploy-ui" command. Please don't edit this file nor commit this file to git.\
       \n# If you need to update its content, run the "deploy-ui" command again.\
       \n# ${new Date()}`;
    const content = `${comment}\n\n${text}`;

    this.cli.log(`Writing Create React App environment file "${fileName}" with the following content:\n`);
    this.cli.raw(`${content}\n`);

    fs.writeFileSync(fileName, content);
  }

  async invalidateCache() {
    const distributionId = this.serverless.service.custom.settings.websiteCloudFrontId;
    const shouldInvalidate = this.options['invalidate-cache'];
    if (shouldInvalidate && !distributionId) {
      throw Error('You specified "--invalidate-cache", but `websiteCloudFrontId` setting was not found');
    }

    if (shouldInvalidate && this.mutatedBucket) {
      this.cli.log('Invalidating CloudFront distribution cache...');
      const sdk = this.getCloudFront();

      try {
        const invalidation = await sdk
          .createInvalidation({
            DistributionId: distributionId,
            InvalidationBatch: {
              CallerReference: Date.now().toString(),
              Paths: {
                Quantity: 1,
                Items: ['/*'], // Invalidate all files
              },
            },
          })
          .promise();

        this.cli.log(
          `Created new CloudFront invalidation: id=${invalidation.Invalidation.Id}, status=${invalidation.Invalidation.Status}, paths="/*"`,
        );
      } catch (err) {
        throw new Error(`Error invalidating CloudFront ${distributionId} cache: ${err}`);
      }
    }

    if (this.mutatedBucket) {
      this.cli.log(`UI deployed successfully to ${this.serverless.service.custom.settings.websiteUrl}`);

    } else {
      this.cli.log('Nothing new to deploy. Did you forget to call "package-vue"? Skipping deployment...');
    }
  }

  async build() {
    const isLocal = this.options.local;
    if (!isLocal) {
      this.cli.log('Running "pnpm build"...');

      try {
        await runCommand({
          command: 'npm',
          args: ['run', 'build'],
          stdout: this.cli,
        });
      } catch (err) {
        throw new Error(`Error running "npm build": ${err}`);
      }

      try {
        await runCommand({
          command: 'npm',
          args: ['run', 'build-storybook'],
          stdout: this.cli,
        });
      } catch (err) {
        throw new Error(`Error running "npm build": ${err}`);
      }
    }

    this.cli.log('UI packaged successfully');
  }

  async startUI() {
    this.cli.log('Running "pnpm start"...');

    try {
      await runCommand({
        command: 'pnpm',
        args: ['run', 'start'],
        stdout: this.cli,
      });
    } catch (err) {
      throw new Error(`Error running "pnpm start": ${err}`);
    }
  }
}

module.exports = ServerlessUIToolsPlugin;
