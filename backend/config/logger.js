const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logsDir = path.join(__dirname, '..', 'logs');
const useFileLogging = !process.env.VERCEL;

if (useFileLogging && !fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const loggerTransports = [
    new transports.Console({
        format: format.combine(
            format.colorize(),
            format.timestamp(),
            format.printf(({ timestamp, level, message, stack, ...meta }) => {
                const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} ${level}: ${stack || message}${extra}`;
            })
        )
    })
];

if (useFileLogging) {
    loggerTransports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
            zippedArchive: true
        }),
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            zippedArchive: true,
            level: 'error'
        })
    );
}

const logger = createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: {
        service: 'erp-backend'
    },
    transports: loggerTransports
});

module.exports = logger;
