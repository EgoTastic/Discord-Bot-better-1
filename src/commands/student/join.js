const { possibleRolesArray } = require("../../service");

const execute = async (message, args) => {
  const roleString = args;
  const member = message.member;
  const guild = message.guild;

  const roles = possibleRolesArray(guild);
  const role = roles.find(
    (r) => r.name === roleString,
  );
  if (!role) throw new Error("Role does not exist or is not available");
  await member.roles.add(role);
  await member.fetch(true);
};

module.exports = {
  name: "join",
  description: "Join to the course.",
  usage: "[course name]",
  args: true,
  joinArgs: true,
  guide: true,
  execute,
};