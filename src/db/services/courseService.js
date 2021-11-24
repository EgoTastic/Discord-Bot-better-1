const { findChannelWithNameAndType,
  getCourseNameFromCategory,
  findCategoryWithCourseName,
  createCourseInvitationLink,
} = require("../../discordBot/services/service");
const { findCourseMemberCount } = require("./courseMemberService");
const { Sequelize } = require("sequelize");
const GUIDE_CHANNEL_NAME = "guide";
const { courseAdminRole } = require("../../../config.json");

let invite_url = "";

process.env.NODE_ENV === "production" ? invite_url = `${process.env.BACKEND_SERVER_URL}` : invite_url = `${process.env.BACKEND_SERVER_URL}:${process.env.PORT}`;

const setCourseToPrivate = async (courseName, Course) => {
  const course = await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
  if (course) {
    course.private = true;
    await course.save();
  }
};

const setCourseToPublic = async (courseName, Course) => {
  const course = await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
  if (course) {
    course.private = false;
    await course.save();
  }
};

const setCourseToLocked = async (courseName, Course, guild) => {
  const course = await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
  if (course) {
    course.locked = true;
    const category = findChannelWithNameAndType(courseName, "GUILD_CATEGORY", guild);
    category.permissionOverwrites.create(guild.roles.cache.find(r => r.name.toLowerCase().includes(courseName.toLowerCase())), { VIEW_CHANNEL: true, SEND_MESSAGES: false });
    category.permissionOverwrites.create(guild.roles.cache.find(r => r.name === "faculty"), { SEND_MESSAGES: true });
    await course.save();
  }
};

const setCourseToUnlocked = async (courseName, Course, guild) => {
  const course = await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
  if (course) {
    course.locked = false;
    const category = findChannelWithNameAndType(courseName, "GUILD_CATEGORY", guild);
    category.permissionOverwrites.create(guild.roles.cache.find(r => r.name.toLowerCase().includes(courseName.toLowerCase())), { VIEW_CHANNEL: true, SEND_MESSAGES: true });
    await course.save();
  }
};

const createCourseToDatabase = async (courseCode, courseFullName, courseName, Course) => {
  const alreadyinuse = await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
  if (!alreadyinuse) {
    return await Course.create({ code: courseCode, fullName: courseFullName, name: courseName, private: false });
  }
};

const removeCourseFromDb = async (courseName, Course) => {
  const course = await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
  if (course) {
    await Course.destroy({
      where:
        { name: { [Sequelize.Op.iLike]: courseName } },
    });
  }
};

const findCourseFromDb = async (courseName, Course) => {
  return await Course.findOne({
    where:
      { name: { [Sequelize.Op.iLike]: courseName } },
  });
};

const findCourseFromDbById = async (courseId, Course) => {
  return await Course.findOne({
    where:
      { id: courseId },
  });
};

const findCoursesFromDb = async (order, Course, state) => {
  const filter = {
    true: { private: true },
    false: { private: false },
    undefined: {},
  };
  return await Course.findAll({
    attributes: ["id", "code", "fullName", "name"],
    order: [order],
    where: filter[state],
    raw: true,
  });
};

const findCourseFromDbWithFullName = async (courseFullName, Course) => {
  return await Course.findOne({
    where: {
      fullName: { [Sequelize.Op.iLike]: courseFullName },
    },
  });
};

const findCourseNickNameFromDbWithCourseCode = async (courseName, Course) => {
  return await Course.findOne({
    where: {
      code: { [Sequelize.Op.iLike]: courseName },
    },
  });
};

const updateGuideMessage = async (message, models) => {
  const courseData = await findCoursesFromDb("code", models.Course, false);
  const rows = await Promise.all(courseData
    .map(async (course) => {
      const regExp = /[^0-9]*/;
      const fullname = course.fullName;
      const matches = regExp.exec(course.code)?.[0];
      const code = matches ? matches + course.code.slice(matches.length) : course.code;
      const count = await findCourseMemberCount(course.id, models.CourseMember);
      return `  - ${code} - ${fullname} 👤${count}`;
    }));

  const newContent = `
Käytössäsi on seuraavia komentoja:
  - \`/join\` jolla voit liittyä kurssille
  - \`/leave\` jolla voit poistua kurssilta
Kirjoittamalla \`/join\` tai \`/leave\` botti antaa listan kursseista.

You have the following commands available:
  - \`/join\` which you can use to join a course
  - \`/leave\` which you can use to leave a course
The bot gives a list of the courses if you type \`/join\` or \`/leave\`.

Kurssit / Courses:
${rows.join("\n")}

In course specific channels you can also list instructors with the command \`/instructors\`

See more with \`/help\` command.

Invitation link for the server ${invite_url}
`;

  await message.edit(newContent);
};

const updateGuide = async (guild, models) => {
  const channel = guild.channels.cache.find(
    (c) => c.name === GUIDE_CHANNEL_NAME,
  );
  const messages = await channel.messages.fetchPinned(true);
  const message = messages.first();
  await updateGuideMessage(message, models);
};

const isCourseCategory = async (channel, Course) => {
  if (channel && channel.name) {
    const course = await findCourseFromDb(getCourseNameFromCategory(channel.name), Course);
    return course ? true : false;
  }
};

const findAllCourseNames = async (Course) => {
  const courseNames = [];
  const courses = await Course.findAll();
  for (const c of courses) {
    courseNames.push(c.name);
  }
  return courseNames;
};

const setCoursePositionABC = async (guild, courseString, Course) => {
  let first = 9999;
  const categoryNames = await findAllCourseNames(Course);
  categoryNames.sort((a, b) => a.localeCompare(b));
  const categories = [];
  categoryNames.forEach(cat => {
    const guildCat = findCategoryWithCourseName(cat, guild);
    if (guildCat) {
      categories.push(guildCat);
      if (first > guildCat.position) first = guildCat.position;
    }
  });
  const course = courseString.split(" ")[1];

  const category = findCategoryWithCourseName(course, guild);
  if (category) {
    await category.edit({ position: categories.indexOf(category) + first });
  }
};
const changeCourseRoles = async (courseName, newValue, guild) => {
  await Promise.all(guild.roles.cache
    .filter(r => (r.name === `${courseName} ${courseAdminRole}` || r.name === courseName))
    .map(async role => {
      if (role.name.includes("instructor")) {
        role.setName(`${newValue} instructor`);
      }
      else {
        role.setName(newValue);
      }
    },
    ));
};

const changeInvitationLink = async (channelAnnouncement) => {
  const pinnedMessages = await channelAnnouncement.messages.fetchPinned();
  const invMessage = pinnedMessages.find(msg => msg.author.bot && msg.content.includes("Invitation link for the course"));
  const courseName = channelAnnouncement.parent.name.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g, "").trim();
  const updatedMsg = createCourseInvitationLink(courseName);
  await invMessage.edit(updatedMsg);
};

const setEmojisLock = async (category, hidden, courseName) => {
  hidden ? await category.setName(`👻🔐 ${courseName}`) : await category.setName(`📚🔐 ${courseName}`);
};

const setEmojisUnlock = async (category, hidden, courseName) => {
  hidden ? await category.setName(`👻 ${courseName}`) : await category.setName(`📚 ${courseName}`);
};

const setEmojisHide = async (category, locked, courseName) => {
  locked ? await category.setName(`👻🔐 ${courseName}`) : await category.setName(`👻 ${courseName}`);
};

const setEmojisUnhide = async (category, locked, courseName) => {
  locked ? await category.setName(`📚🔐 ${courseName}`) : await category.setName(`📚 ${courseName}`);
};

module.exports = {
  setCourseToPrivate,
  setCourseToPublic,
  setCourseToLocked,
  setCourseToUnlocked,
  createCourseToDatabase,
  removeCourseFromDb,
  findCourseFromDb,
  findCourseFromDbWithFullName,
  findCoursesFromDb,
  findCourseNickNameFromDbWithCourseCode,
  updateGuide,
  updateGuideMessage,
  isCourseCategory,
  findAllCourseNames,
  findCourseFromDbById,
  setCoursePositionABC,
  changeCourseRoles,
  changeInvitationLink,
  setEmojisLock,
  setEmojisUnlock,
  setEmojisHide,
  setEmojisUnhide,
};