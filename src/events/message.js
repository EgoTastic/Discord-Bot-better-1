const { updateGuide } = require("../service");

const prefix = process.env.PREFIX;

const execute = async (message, client) => {
  if (!message.content.startsWith(prefix)) return;

  let args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (!client.commands.has(commandName)) return;
  const command = client.commands.get(commandName);

  if (command.role && !message.member.roles.cache.find(r => r.name === command.role)) {
    return message.channel.send("You have no power here!");
  }
  if (command.args && !args.length) {
    return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
  }
  if (command.joinArgs) {
    args = args.join(" ");
  }

  try {
    await command.execute(message, args);
    if (command.guide) {
      await updateGuide(message.guild);
    }
    await message.react("✅");
  }
  catch (error) {
    console.error(error);
    await message.react("❌");
  }
};

module.exports = {
  name: "message",
  execute,
};