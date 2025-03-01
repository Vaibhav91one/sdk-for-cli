const fs = require("fs");
const path = require("path");
const childProcess = require('child_process');
const { Command } = require("commander");
const inquirer = require("inquirer");
const { teamsCreate, teamsList } = require("./teams");
const { projectsCreate } = require("./projects");
const { functionsCreate } = require("./functions");
const { databasesGet, databasesListCollections, databasesList } = require("./databases");
const { storageListBuckets } = require("./storage");
const { sdkForConsole } = require("../sdks");
const { localConfig } = require("../config");
const { questionsInitProject, questionsInitFunction, questionsInitCollection } = require("../questions");
const { success, log, actionRunner, commandDescriptions } = require("../parser");

const init = new Command("init")
    .description(commandDescriptions['init'])
    .configureHelp({
        helpWidth: process.stdout.columns || 80
    })
    .action(actionRunner(async (_options, command) => {
        command.help();
    }));

const initProject = async () => {
    let response = {}
    let answers = await inquirer.prompt(questionsInitProject)
    if (!answers.project) process.exit(1)

    let sdk = await sdkForConsole();
    if (answers.start == "new") {
        response = await teamsCreate({
            teamId: 'unique()',
            name: answers.project,
            sdk,
            parseOutput: false
        })

        let teamId = response['$id'];
        response = await projectsCreate({
            projectId: answers.id,
            name: answers.project,
            teamId,
            parseOutput: false
        })

        localConfig.setProject(response['$id'], response.name);
    } else {
        localConfig.setProject(answers.project.id, answers.project.name);
    }
    success();
}

const initFunction = async () => {
    // TODO: Add CI/CD support (ID, name, runtime)
    let answers = await inquirer.prompt(questionsInitFunction)
    let functionFolder = path.join(process.cwd(), 'functions');

    if (!fs.existsSync(functionFolder)) {
        fs.mkdirSync(functionFolder, {
            recursive: true
        });
    }

    const functionDir = path.join(functionFolder, answers.name);

    if (fs.existsSync(functionDir)) {
        throw new Error(`( ${answers.name} ) already exists in the current directory. Please choose another name.`);
    }

    if (!answers.runtime.entrypoint) {
        log(`Entrypoint for this runtime not found. You will be asked to configure entrypoint when you first deploy the function.`);
    }

    if (!answers.runtime.commands) {
        log(`Installation command for this runtime not found. You will be asked to configure the install command when you first deploy the function.`);
    }

    let response = await functionsCreate({
        functionId: answers.id,
        name: answers.name,
        runtime: answers.runtime.id,
        entrypoint: answers.runtime.entrypoint || '',
        commands: answers.runtime.commands || '',
        parseOutput: false
    })

    fs.mkdirSync(functionDir, "777");

    let gitInitCommands = "git clone -b v3 --single-branch --depth 1 --sparse https://github.com/appwrite/functions-starter ."; // depth prevents fetching older commits reducing the amount fetched

    let gitPullCommands = `git sparse-checkout add ${answers.runtime.id}`;

    /* Force use CMD as powershell does not support && */
    if (process.platform == 'win32') {
        gitInitCommands = 'cmd /c "' + gitInitCommands + '"';
        gitPullCommands = 'cmd /c "' + gitPullCommands + '"';
    }

    /*  Execute the child process but do not print any std output */
    try {
        childProcess.execSync(gitInitCommands, { stdio: 'pipe', cwd: functionDir });
        childProcess.execSync(gitPullCommands, { stdio: 'pipe', cwd: functionDir });
    } catch (error) {
        /* Specialised errors with recommended actions to take */
        if (error.message.includes('error: unknown option')) {
            throw new Error(`${error.message} \n\nSuggestion: Try updating your git to the latest version, then trying to run this command again.`)
        } else if (error.message.includes('is not recognized as an internal or external command,') || error.message.includes('command not found')) {
            throw new Error(`${error.message} \n\nSuggestion: It appears that git is not installed, try installing git then trying to run this command again.`)
        } else {
            throw error;
        }
    }

    fs.rmSync(path.join(functionDir, ".git"), { recursive: true });
    const copyRecursiveSync = (src, dest) => {
        let exists = fs.existsSync(src);
        let stats = exists && fs.statSync(src);
        let isDirectory = exists && stats.isDirectory();
        if (isDirectory) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest);
            }

            fs.readdirSync(src).forEach(function (childItemName) {
                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    };
    copyRecursiveSync(path.join(functionDir, answers.runtime.id), functionDir);

    fs.rmSync(`${functionDir}/${answers.runtime.id}`, { recursive: true, force: true });

    const readmePath = path.join(process.cwd(), 'functions', answers.name, 'README.md');
    const readmeFile = fs.readFileSync(readmePath).toString();
    const newReadmeFile = readmeFile.split('\n');
    newReadmeFile[0] = `# ${answers.name}`;
    newReadmeFile.splice(1, 2);
    fs.writeFileSync(readmePath, newReadmeFile.join('\n'));

    let data = {
        $id: response['$id'],
        name: response.name,
        runtime: response.runtime,
        execute: response.execute,
        events: response.events,
        schedule: response.schedule,
        timeout: response.timeout,
        enabled: response.enabled,
        logging: response.logging,
        entrypoint: response.entrypoint,
        commands: response.commands,
        ignore: answers.runtime.ignore || null,
        path: `functions/${answers.name}`,
    };

    localConfig.addFunction(data);
    success();
}

const initCollection = async ({ all, databaseId } = {}) => {
    const databaseIds = [];

    if (databaseId) {
        databaseIds.push(databaseId);
    } else if (all) {
        let allDatabases = await databasesList({
            parseOutput: false
        })

        databaseIds.push(...allDatabases.databases.map((d) => d.$id));
    }

    if (databaseIds.length <= 0) {
        let answers = await inquirer.prompt(questionsInitCollection)
        if (!answers.databases) process.exit(1)
        databaseIds.push(...answers.databases);
    }

    for (const databaseId of databaseIds) {
        const database = await databasesGet({
            databaseId,
            parseOutput: false
        });

        localConfig.addDatabase(database);

        // TODO: Pagination?
        let response = await databasesListCollections({
            databaseId,
            queries: ['limit(100)'],
            parseOutput: false
        })

        let collections = response.collections;
        log(`Found ${collections.length} collections`);

        collections.forEach(async collection => {
            log(`Fetching ${collection.name} ...`);
            localConfig.addCollection({
                ...collection,
                '$createdAt': undefined,
                '$updatedAt': undefined,
            });
        });
    }

    success();
}

const initBucket = async () => {
    // TODO: Pagination?
    let response = await storageListBuckets({
        queries: ['limit(100)'],
        parseOutput: false
    })

    let buckets = response.buckets;
    log(`Found ${buckets.length} buckets`);

    buckets.forEach(async bucket => {
        log(`Fetching ${bucket.name} ...`);
        localConfig.addBucket(bucket);
    });

    success();
}

const initTeam = async () => {
    // TODO: Pagination?
    let response = await teamsList({
        queries: ['limit(100)'],
        parseOutput: false
    })

    let teams = response.teams;
    log(`Found ${teams.length} teams`);

    teams.forEach(async team => {
        log(`Fetching ${team.name} ...`);
        const { total, $updatedAt, $createdAt, prefs, ...rest } = team;
        localConfig.addTeam(rest);
    });

    success();
}

init
    .command("project")
    .description("Initialise your Appwrite project")
    .action(actionRunner(initProject));

init
    .command("function")
    .description("Initialise your Appwrite cloud function")
    .action(actionRunner(initFunction))

init
    .command("collection")
    .description("Initialise your Appwrite collections")
    .option(`--databaseId <databaseId>`, `Database ID`)
    .option(`--all`, `Flag to initialize all databases`)
    .action(actionRunner(initCollection))

init
    .command("bucket")
    .description("Initialise your Appwrite buckets")
    .action(actionRunner(initBucket))

init
    .command("team")
    .description("Initialise your Appwrite teams")
    .action(actionRunner(initTeam))

module.exports = {
    init,
};
