const chalk = require('chalk');
const packagejs = require('../../package.json');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const fs = require('fs');
const shelljs = require('shelljs');
const jhipsterUtils = require('generator-jhipster/generators/utils');

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
            },
            readConfig() {
                this.jhipsterAppConfig = this.getJhipsterAppConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Can\'t read .yo-rc.json');
                }
            },
            displayLogo() {
                // it's here to show that you can use functions from generator-jhipster
                // this function is in: generator-jhipster/generators/generator-base.js
                this.printJHipsterLogo();

                // Have Yeoman greet the user.
                this.log(`\nWelcome to the ${chalk.bold.yellow('JHipster quota')} generator! ${chalk.yellow(`v${packagejs.version}\n`)}`);
            },
            checkJhipster() {
                const currentJhipsterVersion = this.jhipsterAppConfig.jhipsterVersion;
                const minimumJhipsterVersion = packagejs.dependencies['generator-jhipster'];
                if (!semver.satisfies(currentJhipsterVersion, minimumJhipsterVersion)) {
                    this.warning(`\nYour generated project used an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`);
                }
            }
        };
    }

    prompting() {
        var path = `.jhipster`;
        if (fs.existsSync(path)) {
            var allEntitiesJSON = this.getExistingEntities();
            var allEntities = [];
            for (let entity of allEntitiesJSON) {
                allEntities.push(entity.name);
            }

            const done = this.async();
            const prompts = [{
                type: 'confirm',
                name: 'allQuotas',
                message: `Would you like to create quota for every entity you have (${allEntities})?`,
                default: true
            }, {
                when: response => response.allQuotas === false,
                type: 'checkbox',
                name: 'entityQuotas',
                message: `Please chose which entities you want to add a quota for`,
                choices: response => allEntities
            }];

            this.prompt(prompts).then(prompt => {
                if (prompt.allQuotas === true) {
                    this.allEntities = allEntities;
                } else {
                    this.allEntities = prompt.entityQuotas;
                }
                done();
            });
        } else {
            console.log("You don't have any entity to create quota for");
            process.exit(1);
        }
    }

    writing() {
        // function to use directly template
        this.template = function(source, destination) {
            this.fs.copyTpl(
                this.templatePath(source),
                this.destinationPath(destination),
                this
            );
        };

        // read config from .yo-rc.json
        this.baseName = this.jhipsterAppConfig.baseName;
        this.packageName = this.jhipsterAppConfig.packageName;
        this.packageFolder = this.jhipsterAppConfig.packageFolder;
        this.clientFramework = this.jhipsterAppConfig.clientFramework;
        this.clientPackageManager = this.jhipsterAppConfig.clientPackageManager;
        this.buildTool = this.jhipsterAppConfig.buildTool;

        // use function in generator-base.js from generator-jhipster
        this.angularAppName = this.getAngularAppName();

        // use constants from generator-constants.js
        const javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + this.packageFolder}/`;
        const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
        const webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

        let quotaJDL = "";
        let entitiesQuota = "entity template {\n userLogin String unique,\n quota Integer\n}\n\n";

        let quotaEntities = [];
        let quotaRepositories = [];

        for (let entity of this.allEntities) {
            quotaEntities.push(entity + "Quota");
            quotaRepositories.push(entity + "QuotaRepository");
            quotaJDL += entitiesQuota.replace('template', entity + "Quota");
        }

        fs.writeFileSync("quotaEntities.jh", quotaJDL, "utf8");

        if (shelljs.exec('jhipster import-jdl quotaEntities.jh').code !== 0) {
            shelljs.echo('Error: import fail');
            shelljs.exit(1);
        }

        var pathRessource = `${javaDir}web/rest/`;
        var PathRessourceFile = "";
        for (var i = 0; i < this.allEntities.length; i++) {
            PathRessourceFile = pathRessource + this.allEntities[i] + "Resource.java";
            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: 'import org.slf4j.Logger;',
                splicable: [
                    `import org.springframework.beans.factory.annotation.Autowired;`,
                    `import ${this.packageName}.repository.${quotaRepositories[i]};`,
                    `import ${this.packageName}.security.SecurityUtils;`,
                    `import ${this.packageName}.domain.${quotaEntities[i]};`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: 'private final Logger log',
                splicable: [`@Autowired`, `private ${quotaRepositories[i]} ${quotaRepositories[i]};`]
            }, this);

            var needleIf = `if (${this.allEntities[i].charAt(0).toLowerCase() + this.allEntities[i].substr(1)}.getId() != null) {`;
            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: needleIf,
                splicable: [
                    `Optional<String> userLogin = SecurityUtils.getCurrentUserLogin();`,
                    `Optional<${quotaEntities[i]}> q1 = ${quotaRepositories[i]}.findOneByUserLogin(userLogin.get());`,
                    `if (q1.isPresent() && (q1.get().getQuota()==0)) {`,
                    `\tthrow new BadRequestAlertException("You no longer have the necessary quota to create this entity", null, "errorquota");`,
                    `}`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: `return ResponseEntity.created`,
                splicable: [
                    `if(q1.isPresent()) {`,
                    `\tq1.get().setQuota(q1.get().getQuota()-1);`,
                    `\t${quotaRepositories[i]}.save(q1.get());`,
                    `}`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: `${javaDir}repository/${quotaRepositories[i]}.java`,
                needle: `}`,
                splicable: [
                    `\tOptional<${quotaEntities[i]}> findOneByUserLogin(String userLogin);`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: `${javaDir}repository/${quotaRepositories[i]}.java`,
                needle: `import`,
                splicable: [
                    `import java.util.Optional;`
                ]
            }, this);


            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: 'return ResponseEntity.ok().headers(HeaderUtil.createEntityDeletionAlert(ENTITY_NAME, id.toString())).build();',
                splicable: [
                    `Optional<String> userLogin = SecurityUtils.getCurrentUserLogin();`,
                    `Optional<${quotaEntities[i]}> q1 = ${quotaRepositories[i]}.findOneByUserLogin(userLogin.get());`,
                    `if(q1.isPresent()) {`,
                    `\tq1.get().setQuota(q1.get().getQuota()+1);`,
                    `\t${quotaRepositories[i]}.save(q1.get());`,
                    `}`
                ]
            }, this);

        }

        var pathLangs = `${webappDir}i18n/`;
        var allLangs = this.getAllInstalledLanguages();
        for (var i = 0; i < allLangs.length; i++) {
            jhipsterUtils.rewriteFile({
                file: `${webappDir}i18n/${allLangs[i]}/global.json`,
                needle: `"idnull":`,
                splicable: [
                    `"errorquota": "You no longer have the necessary quota to create this entity",`
                ]
            }, this);
        }


    }



    install() {
        let logMsg =
            `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install`)}`;

        if (this.clientFramework === 'angular1') {
            logMsg =
                `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install & bower install`)}`;
        }
        const injectDependenciesAndConstants = (err) => {
            if (err) {
                this.warning('Install of dependencies failed!');
                this.log(logMsg);
            } else if (this.clientFramework === 'angular1') {
                this.spawnCommand('gulp', ['install']);
            }
        };
        const installConfig = {
            bower: this.clientFramework === 'angular1',
            npm: this.clientPackageManager !== 'yarn',
            yarn: this.clientPackageManager === 'yarn',
            callback: injectDependenciesAndConstants
        };
        if (this.options['skip-install']) {
            this.log(logMsg);
        } else {
            this.installDependencies(installConfig);
        }
    }

    end() {
        this.log('End of quota generator');
    }
};
