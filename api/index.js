const { app, db } = require('../server');

let ready = false;

module.exports = async (req, res) => {
  if (!ready) {
    await db.initialize();
    ready = true;
  }
  app(req, res);
};
