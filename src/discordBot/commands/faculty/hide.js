const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  updateGuide,
  createCategoryName,
  findChannelWithNameAndType,
  msToMinutesAndSeconds,
  handleCooldown,
  isOnCooldown,
  setCourseToPrivate } = require("../../services/service");
const { sendErrorEphemeral, sendEphemeral } = require("../../services/message");
const { facultyRole } = require("../../../../config.json");

const execute = async (interaction, client, Course) => {
  console.log("Hide command found");
  const courseName = interaction.options.getString("course").toLowerCase().trim();
  const guild = client.guild;
  const courseString = createCategoryName(courseName);
  const category = findChannelWithNameAndType(courseString, "GUILD_CATEGORY", guild);
  if (!category) {
    return await sendErrorEphemeral(interaction, `Invalid course name: ${courseName} or the course is private already!`);
  }
  const cooldown = isOnCooldown(courseName);
  if (cooldown) {
    const timeRemaining = Math.floor(cooldown - Date.now());
    const time = msToMinutesAndSeconds(timeRemaining);
    return await sendErrorEphemeral(interaction, `Command cooldown [mm:ss]: you need to wait ${time}!`);
  }
  else {
    await category.setName(`🔒 ${courseName}`);
    await setCourseToPrivate(courseName, Course);
    await sendEphemeral(interaction, `This course ${courseName} is now private.`);
    const cooldownTimeMs = 1000 * 60 * 15;
    await client.emit("COURSES_CHANGED", Course);
    await updateGuide(client.guild, Course);
    handleCooldown(courseName, cooldownTimeMs);
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hide")
    .setDescription("Hide given course")
    .setDefaultPermission(false)
    .addStringOption(option =>
      option.setName("course")
        .setDescription("Hide given course")
        .setRequired(true)),
  execute,
  usage: "/hide [course name]",
  description: "Hide given course.",
  roles: ["admin", facultyRole],
};
