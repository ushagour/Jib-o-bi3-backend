const REQUEST_DELAY_MS = Number.parseInt(process.env.REQUEST_DELAY_MS || "1000", 10);

module.exports = async (req, res, next) => {
  setTimeout(() => next(), Number.isFinite(REQUEST_DELAY_MS) ? REQUEST_DELAY_MS : 1000);
};
