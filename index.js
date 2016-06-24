'use strict';

module.exports = function(S) {
    const path       = require('path'),
        SError       = require(S.getServerlessPath('Error')),
        SCli         = require(S.getServerlessPath('utils/cli')),
        Promise      = require('bluebird'),
        fs           = require('fs'),
        async        = require('async'),
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

                    _this._spinner.stop(true);
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

            return Promise.resolve();
        }

        _loadFixture(filename) {
            SCli.log(`Loading fixtures/${filename}`);
        }

        _loadFixtures() {

            let _this = this;

            SCli.log('Loading fixtures to stage "' + _this.evt.options.stage + '" in region "' + _this.evt.options.region + '"...');

            _this._spinner = SCli.spinner();
            _this._spinner.start();
            
            let files = fs.readdirSync(fixturesPath);
            async.each(files,this._loadFixture)
            return;
        }



    }
    return DynamoDbFixtures;
};