const fs = require("fs");
const { Client } = require("discord-slash-commands-client");
const { Collection } = require("discord.js");
const { getRoleFromCategory } = require("../services/service");

const slashClient = new Client(
  process.env.BOT_TOKEN,
  process.env.BOT_TEST_ID,
);

const sendEphemeral = (client, interaction, content) => {
  client.api.interactions(interaction.id, interaction.token).callback.post({
    data: {
      type: 4,
      data: {
        content,
        // make the response ephemeral
        flags: 64,
      },
    },
  });
};

const createCommandRolePermissions = (client, highestRole) => {
  const allRoles = highestRole === "teacher" ? ["admin", "teacher"] : ["admin"];
  const permissions = [];

  allRoles.forEach(role => {
    const roleID = client.guild.roles.cache.find(r => r.name === role).id;
    permissions.push(
      {
        id: roleID,
        type: 1,
        permission: true,
      },
    );
  });

  return permissions;
};

const createSlashCommand = async (client, slashCommand) => {
  if (slashCommand.name === "join") slashCommand.options[0].choices = joinGetChoices(client);
  if (slashCommand.name === "leave") slashCommand.options[0].choices = leaveGetChoices(client);
  try {
    const createdCommand = await slashClient
      .createCommand({
        name: slashCommand.name,
        description: slashCommand.description,
        guildId: process.env.GUILD_ID,
        // disable the command for everyone if there's a role defined
        default_permission: !slashCommand.role,
        options: slashCommand.options,
      }, process.env.GUILD_ID,
      );
    if (slashCommand.role) {
      const permissions = createCommandRolePermissions(client, slashCommand.role);
      slashClient.editCommandPermissions(permissions, client.guild.id, createdCommand.id);
    }
  }
  catch (error) {
    // console.log(error);
  }
  console.log(`Created command ${slashCommand.name}`);
};

const loadCommands = (client) => {
  const slashCommands = new Collection();
  const slashCommandFolders = fs.readdirSync("./src/discordBot/slash_commands/", { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  for (const folder of slashCommandFolders) {
    const slashCommandFiles = fs.readdirSync(`./src/discordBot/slash_commands/${folder}`).filter(file => file.endsWith(".js"));
    for (const file of slashCommandFiles) {
      const slashCommand = require(`./${folder}/${file}`);
      if (slashCommand.devOnly && process.env.NODE_ENV !== "development") continue;
      if (slashCommand.prefix) {
        client.commands.set(slashCommand.name, slashCommand);
      }
      else {
        slashCommands.set(
          slashCommand.name,
          {
            command: slashCommand,
            file: `./${folder}/${file}`,
          },
        );
      }

    }
  }
  client.slashCommands = slashCommands;
  return slashCommands;
};

const reloadCommands = async (client, commandNames) => {
  commandNames.map(async (commandName) => {
    try {
      const { file } = client.slashCommands.get(commandName);
      delete require.cache[require.resolve(file)];
      const reloadedCommand = require(file);
      client.slashCommands.set(
        commandName,
        {
          command: reloadedCommand,
          file,
        },
      );
      await createSlashCommand(client, reloadedCommand);
    }
    catch (error) {
      console.log(`Unknown slash command${commandName}`);
    }
  });
};

const leaveGetChoices = (client) => {
  const choices = client.guild.channels.cache
    .filter(({ type, name }) => type === "category" && name.startsWith("📚") || name.startsWith("🔒"))
    .map(({ name }) => getRoleFromCategory(name))
    .map(courseName => ({ name: courseName, value: courseName }));
  // console.log(choices);
  return choices;
};

const joinGetChoices = (client) => {
  const choices = client.guild.channels.cache
    .filter(({ type, name }) => type === "category" && name.startsWith("📚"))
    .map(({ name }) => getRoleFromCategory(name))
    .map(courseName => ({ name: courseName, value: courseName }));
  // console.log("join", choices);
  return choices;
};

const initCommands = async (client) => {
  if (process.env.NODE_ENV === "test") return;

  const slashCommands = loadCommands(client);

  for (const slashCommand of slashCommands.values()) {
    await createSlashCommand(client, slashCommand.command);
    // reduce spam to discord api
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
};

module.exports = {
  sendEphemeral,
  initCommands,
  reloadCommands,
};