const { execute } = require("../../src/discordBot/slash_commands/student/help");

const {
  teacherInteractionHelp,
  teacherData,
  studentInteractionHelp,
  studentData,
  invalidInteractionHelp,
  interactionHelpJoin,
  teacherJoinData } = require("../temp/mockInteraction");

const { sendEphemeral } = require("../../src/discordBot/slash_commands/utils");

jest.mock("../../src/discordBot/slash_commands/utils");
<<<<<<< HEAD
jest.mock("../../src/discordBot/services/service");
jest.mock("discord-slash-commands-client");
=======
jest.mock("discord-slash-commands-client");
jest.mock("../../src/discordBot/services/service");
>>>>>>> 6b5bb8a (Add jest tests for slash help command)


afterEach(() => {
  jest.clearAllMocks();
});

describe("slash help command", () => {
  test("slash help with teacher role should see all commands", async () => {
    const client = teacherInteractionHelp.client;
    await execute(teacherInteractionHelp, client);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(client, teacherInteractionHelp, teacherData.join("\n"));
  });

  test("slash help with student role cannot see teacher commands", async () => {
    const client = studentInteractionHelp.client;
    await execute(studentInteractionHelp, client);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(client, studentInteractionHelp, studentData.join("\n"));
  });

  test("slash help with invalid arg should give error", async () => {
    const client = invalidInteractionHelp.client;
    await execute(invalidInteractionHelp, client);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(client, invalidInteractionHelp, "that's not a valid command!");
  });

  test("slash help with valid arg should give correct command info", async () => {
    const client = interactionHelpJoin.client;
    await execute(interactionHelpJoin, client);
    expect(sendEphemeral).toHaveBeenCalledTimes(1);
    expect(sendEphemeral).toHaveBeenCalledWith(client, interactionHelpJoin, teacherJoinData.join(" \n"));
  });

  /* test("help with valid arg should give correct command info if no command.usage", async () => {
    await execute(studentMessageHelp, ["instructors"]);
    expect(studentMessageHelp.channel.send).toHaveBeenCalledTimes(1);
    expect(studentMessageHelp.channel.send).toHaveBeenCalledWith(studentInsData, { "split": true });
  });*/
});