const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt')
const saltRounds = 10;
const { STRING } = Sequelize;

const config = {
  logging: false,
};
if (process.env.LOGGING) {
  delete config.logging;
}

const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

User.byToken = async (token) => {
  try {
    const decoded = jwt.verify(token, "secret");
    console.log("this is decoded", decoded);
    const user = await User.findByPk(decoded.userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.beforeCreate(async (user) => {
    const hashedPassword = await bcrypt.hash(user.password, saltRounds)
    user.password = hashedPassword
})

User.authenticate = async ({ username, password }) => {

    console.log('before findOne here is password', password)

  const user = await User.findOne({
    where: {
      username,
    },
  });

  console.log('are we getting user', user)
  console.log('after findOne here is hashed password', user.password)
  console.log('after findOne here is password', password)

  const comparedPassword = bcrypt.compare(password, user.password)

  console.log(comparedPassword)

  if (comparedPassword){
    if (user) {
        const signResult = jwt.sign({ userId: user.id }, process.env.JWT);
        console.log("this is the sign result -- >", signResult);
        return jwt.sign({ userId: user.id }, "secret");
    }
  }

  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};