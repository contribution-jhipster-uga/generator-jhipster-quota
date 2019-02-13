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
        const prompts = [{
            type: 'input',
            name: 'message',
            message: 'Please put something',
            default: 'hello world!'
        }];

        const done = this.async();
        this.prompt(prompts).then((props) => {
            this.props = props;
            // To access props later use this.props.someOption;

            done();
        });
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

        // variable from questions
        this.message = this.props.message;

        // show all variables
        this.log('\n--- some config read from config ---');
        this.log(`baseName=${this.baseName}`);
        this.log(`packageName=${this.packageName}`);
        this.log(`clientFramework=${this.clientFramework}`);
        this.log(`clientPackageManager=${this.clientPackageManager}`);
        this.log(`buildTool=${this.buildTool}`);

        this.log('\n--- some function ---');
        this.log(`angularAppName=${this.angularAppName}`);

        this.log('\n--- some const ---');
        this.log(`javaDir=${javaDir}`);
        this.log(`resourceDir=${resourceDir}`);
        this.log(`webappDir=${webappDir}`);

        this.log('\n--- variables from questions ---');
        this.log(`\nmessage=${this.message}`);
        this.log('------\n');

        let quotaJDL = "";
        let entitiesQuota = "entity template {\n userLogin String unique,\n quota Integer\n}\n\n";

        var path = `.jhipster`;
        var allEntities = fs.readdirSync(path);

        for (var i = 0; i < allEntities.length; i++) {
            quotaJDL += entitiesQuota.replace('template', allEntities[i].replace(".json", "Quota"));
        }

        fs.writeFileSync("quotaEntities.jh", quotaJDL, "utf8");

        if (shelljs.exec('jhipster import-jdl quotaEntities.jh').code !== 0) {
            shelljs.echo('Error: import fail');
            shelljs.exit(1);
        }

        var pathRessource = `${javaDir}web/rest/`;
        var PathRessourceFile = "";
        for (var i = 0; i < allEntities.length; i++) {
            PathRessourceFile = pathRessource + allEntities[i].replace(".json", "Resource.java");
            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: 'import org.slf4j.Logger;',
                splicable: [
                    `import org.springframework.beans.factory.annotation.Autowired;`,
                    `import ${this.packageName}.repository.${allEntities[i].replace(".json", "QuotaRepository")};`,
                    `import ${this.packageName}.security.SecurityUtils;`,
                    `import ${this.packageName}.domain.${allEntities[i].replace(".json", "Quota")};`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: 'private final Logger log',
                splicable: [`@Autowired`, `private ${allEntities[i].replace(".json", "QuotaRepository")} ${allEntities[i].replace(".json", "QuotaRepository")};`]
            }, this);

            var needleIf = `if (${allEntities[i].charAt(0).toLowerCase() + allEntities[i].substr(1).replace(".json", "")}.getId() != null) {`;
            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: needleIf,
                splicable: [
                    `Optional<String> userLogin = SecurityUtils.getCurrentUserLogin();`,
                    `Optional<${allEntities[i].replace(".json", "Quota")}> q1 = ${allEntities[i].replace(".json", "QuotaRepository")}.findOneByUserLogin(userLogin.get());`,
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
                    `\t${allEntities[i].replace(".json", "Quota")}Repository.save(q1.get());`,
                    `}`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: `${javaDir}repository/${allEntities[i].replace(".json", "QuotaRepository.java")}`,
                needle: `}`,
                splicable: [
                    `\tOptional<${allEntities[i].replace(".json", "Quota")}> findOneByUserLogin(String userLogin);`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: `${javaDir}repository/${allEntities[i].replace(".json", "QuotaRepository.java")}`,
                needle: `import`,
                splicable: [
                    `import java.util.Optional;`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: `${allEntities[i].charAt(0).toLowerCase() + allEntities[i].substr(1).replace(".json", "Repository")}.deleteById(id);`,
                splicable: [
                    `Optional<String> userLogin = SecurityUtils.getCurrentUserLogin();`,
                    `Optional<${allEntities[i].replace(".json", "Quota")}> q1 = ${allEntities[i].replace(".json", "Quota")}Repository.findOneByUserLogin(userLogin.get());`,
                    `if(q1.isPresent()) {`,
                    `\tq1.get().setQuota(q1.get().getQuota()+1);`,
                    `\t${allEntities[i].replace(".json", "Quota")}Repository.save(q1.get());`,
                    `}`
                ]
            }, this);

        }

        var pathLangs = `${webappDir}i18n/`;
        var allLangs = fs.readdirSync(pathLangs);

        for (var i = 0; i < allLangs.length; i++) {
          jhipsterUtils.rewriteFile({
              file: `${webappDir}i18n/${allLangs[i]}/global.json`,
              needle: `"idnull":`,
              splicable: [
                  `"errorquota": "You no longer have the necessary quota to create this entity",`
              ]
          }, this);
        }


        console.log(quotaJDL);

        if (this.clientFramework === 'angular1') {
            this.template('dummy.txt', 'dummy-angular1.txt');
        }
        if (this.clientFramework === 'angularX' || this.clientFramework === 'angular2') {
            this.template('dummy.txt', 'dummy-angularX.txt');
        }
        if (this.buildTool === 'maven') {
            this.template('dummy.txt', 'dummy-maven.txt');
        }
        if (this.buildTool === 'gradle') {
            this.template('dummy.txt', 'dummy-gradle.txt');
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
