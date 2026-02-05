import pino from "pino";

const logger = pino({
  name: "trade-app",
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
});

export default logger;
