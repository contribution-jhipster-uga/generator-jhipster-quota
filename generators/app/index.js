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
        let entitiesQuota = "entity template {\n quota Integer\n}\n\n";
        let relations = "relationship OneToOne {";

        let quotaEntities = [];
        let quotaRepositories = [];
        let repositories = [];

        if(this.allEntities.length == 0){
          console.log("You didn't select any entity.");
          process.exit(1);
        }

        for (let entity of this.allEntities) {
            quotaEntities.push(entity + "Quota");
            quotaRepositories.push(entity + "QuotaRepository");
            repositories.push(entity + "Repository");
            quotaJDL += entitiesQuota.replace('template', entity + "Quota");
            relations += "\n\t"+entity+"Quota{user} to User";
        }

        relations += "\n}";
        quotaJDL += relations;

        fs.writeFileSync("quotaEntities.jh", quotaJDL, "utf8");

        if (shelljs.exec('jhipster import-jdl quotaEntities.jh').code !== 0) {
            shelljs.echo('Error: import fail');
            shelljs.exit(1);
        }

        shelljs.echo("n\n");

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
                    `import ${this.packageName}.domain.${quotaEntities[i]};`,
                    `import ${this.packageName}.domain.User;`,
                    `import ${this.packageName}.repository.UserRepository;`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: 'private final Logger log',
                splicable: [`@Autowired`, `private ${quotaRepositories[i]} ${quotaRepositories[i]};`,`@Autowired`, `private UserRepository userRepository;`]
            }, this);

            let file = fs.readFileSync(PathRessourceFile);
            if(!file.includes(`${repositories[i].charAt(0).toLowerCase()}${repositories[i].substr(1)}`)){

              jhipsterUtils.rewriteFile({
                  file: PathRessourceFile,
                  needle: `public ${this.allEntities[i]}Resource`,
                  splicable: [`@Autowired`,`private ${repositories[i]} ${this.allEntities[i].toLowerCase()}Repository;`]
              }, this);

              jhipsterUtils.rewriteFile({
                  file: PathRessourceFile,
                  needle: 'import org.slf4j.Logger;',
                  splicable: [
                      `import ${this.packageName}.repository.${this.allEntities[i]}Repository;`
                  ]
              }, this);

            }

            var needleIf = `if (${this.allEntities[i].charAt(0).toLowerCase() + this.allEntities[i].substr(1)}.getId() != null) {`;
            jhipsterUtils.rewriteFile({
                file: PathRessourceFile,
                needle: needleIf,
                splicable: [
                    `Optional<String> userLogin = SecurityUtils.getCurrentUserLogin();`,
                    `Optional<User> user = userRepository.findOneByLogin(userLogin.get());`,
                    `Optional<${quotaEntities[i]}> q1 = ${quotaRepositories[i]}.findOneByUser(user.get());`,
                    `if (q1.isPresent()){`,
                    `\tlong count = ${repositories[i].charAt(0).toLowerCase()}${repositories[i].substr(1)}.countByCreatedBy(userLogin.get());`,
                    `\tif (count >= q1.get().getQuota()) {`,
                    `\t\tthrow new BadRequestAlertException("You no longer have the necessary quota to create this entity", null, "errorquota");`,
                    `\t}`,
                    `}`,
                ]
            }, this);


            jhipsterUtils.rewriteFile({
                file: `${javaDir}repository/${quotaRepositories[i]}.java`,
                needle: `}`,
                splicable: [
                    `\tOptional<${quotaEntities[i]}> findOneByUser(User user);`
                ]
            }, this);

            jhipsterUtils.rewriteFile({
                file: `${javaDir}repository/${quotaRepositories[i]}.java`,
                needle: `import`,
                splicable: [
                    `import java.util.Optional;`,
                    `import com.mycompany.myapp.domain.User;`
                ]
            }, this);

            jhipsterUtils.replaceContent({
                file: `${javaDir}repository/${repositories[i]}.java`,
                pattern: `public interface ${repositories[i]} extends JpaRepository<${this.allEntities[i]}, Long> {`,
                content: `public interface ${repositories[i]} extends JpaRepository<${this.allEntities[i]}, Long> {\n\n\tlong countByCreatedBy(String userLogin);`,
                regex : false
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
