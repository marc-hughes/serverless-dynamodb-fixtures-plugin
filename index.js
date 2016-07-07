'use strict';

module.exports = function(S) {
    const path       = require('path'),
        SError       = require(S.getServerlessPath('Error')),
        SCli         = require(S.getServerlessPath('utils/cli')),
        Promise      = require('bluebird'),
        fs           = require('fs'),
        async        = require('async'),
        AWS = require('aws-sdk'),
        fixturesPath = path.join(S.config.projectPath, 'fixtures');


    class DynamoDbFixtures extends S.classes.Plugin {

        constructor() {
            super();
            this.name = 'serverless-dynamodb-fixtures-plugin';
        }


        registerActions() {
            S.addAction(this.loadFixture.bind(this), {
                handler:       'loadFixture',
                description:   'Load your dynamodb fixtures',
                context:       'dynamodb',
                contextAction: 'load',
                options:       [
                    {
                        option:      'stage',
                        shortcut:    's',
                        description: 'stage to populate any variables'
                    }, {
                        option:      'region',
                        shortcut:    'r',
                        description: 'region to populate any variables'
                    }
                ]
            });
            return Promise.resolve();
        }

        loadFixture(evt) {

            let _this     = this;
            _this.evt     = evt;

            // Flow
            return _this._prompt()
                .bind(_this)
                .then(_this._validateParams)
                .then(_this._loadFixtures)
                .then(function() {
                    SCli.log('Done loading.');
                    return _this.evt;

                });
        }

        _prompt() {

            let _this = this;

            return _this.cliPromptSelectStage('Choose Stage: ', _this.evt.options.stage, true)
                .then(stage => {
                    _this.evt.options.stage = stage;
                    Promise.resolve();
                })
                .then(function(){
                    return _this.cliPromptSelectRegion('Choose Region: ', false, true, _this.evt.options.region, _this.evt.options.stage)
                        .then(region => {
                            _this.evt.options.region = region;
                            Promise.resolve();
                        });
                });

        }


        _validateParams() {

            let _this = this;

            if (!S.utils.dirExistsSync(fixturesPath)) {
                return Promise.reject(new SError('Could not find "fixtures" folder in your project root.'));
            }

            // validate stage: make sure stage exists
            if (!S.getProject().validateStageExists(_this.evt.options.stage)) {
                return Promise.reject(new SError('Stage ' + _this.evt.options.stage + ' does not exist in your project', SError.errorCodes.UNKNOWN));
            }

            // make sure region exists in stage
            if (!S.getProject().validateRegionExists(_this.evt.options.stage, _this.evt.options.region)) {
                return Promise.reject(new SError('Region "' + _this.evt.options.region + '" does not exist in stage "' + _this.evt.options.stage + '"'));
            }

            _this.project    = S.getProject();
            _this.aws        = S.getProvider('aws');
            _this.dynamodb = new AWS.DynamoDB.DocumentClient({ region: _this.evt.options.region });

            return Promise.resolve();
        }

        _loadFixture(filename) {
            let _this = this;

            SCli.log(`Loading fixtures/${filename}`);
            var inputData = fs.readFileSync('fixtures/' + filename, 'utf8');

            // TODO: I'm pretty sure there's a better way to render templates that actually use the full set of variables
            inputData = inputData.replace(/\$\{SERVERLESS_STAGE\}/g, this.evt.options.stage);
            inputData = inputData.replace(/\$\{SERVERLESS_PROJECT\}/g, this.project.name);
            inputData = inputData.replace(/\$\{SERVERLESS_REGION\}/g, this.evt.options.region);

            var importData = JSON.parse(inputData);
            const batchWrite = Promise.promisify(_this.dynamodb.batchWrite.bind(_this.dynamodb))

            let items = importData.entries.map(function(entry){
                return {
                    PutRequest: {
                        Item: entry
                    }
                }
            });
            var request = {
                RequestItems: {
                }
            };
            // You can only batch-write 25 entries at a time.

            var batches = [];
            for(var i = 0 ; i < items.length ; i += 25) {
                batches.push(items.slice(i, i+25));
            }

            return Promise.each(batches,(batch) => {
                SCli.log(`Writing ${batch.length} entries`);
                _this._spinner.start();
                request.RequestItems[importData.tableName] = batch;
                return batchWrite(request).then(() => _this._spinner.stop(true))
            });
        }

        _loadFixtures() {

            let _this = this;

            SCli.log('Loading fixtures to stage "' + _this.evt.options.stage + '" in region "' + _this.evt.options.region + '"...');

            _this._spinner = SCli.spinner();

            let files = fs.readdirSync(fixturesPath);
            return Promise.each(files, this._loadFixture.bind(this));
        }
    }
    return DynamoDbFixtures;
};