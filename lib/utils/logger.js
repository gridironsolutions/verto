import pino from 'pino';
import pkg from '../../package.json' assert {type: "json"};

const logger = pino({
    name: pkg.name ? pkg.name : 'nodejs_app',
    level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'warn',
});

export default logger;