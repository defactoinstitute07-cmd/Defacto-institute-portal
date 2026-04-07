const studentRegistration = require('./notificationTemplates/studentRegistration');
const standardFeeGenerated = require('./notificationTemplates/standardFeeGenerated');
const standardFeePayment = require('./notificationTemplates/standardFeePayment');
const standardFeeOverdue = require('./notificationTemplates/standardFeeOverdue');
const standardExamResult = require('./notificationTemplates/standardExamResult');
const testAnnouncement = require('./notificationTemplates/testAnnouncement');
const facultyRegistration = require('./notificationTemplates/facultyRegistration');

const NOTIFICATION_TEMPLATE_DEFINITIONS = [
    studentRegistration,
    standardFeeGenerated,
    standardFeePayment,
    standardFeeOverdue,
    standardExamResult,
    testAnnouncement,
    facultyRegistration
];

const NOTIFICATION_TEMPLATE_ORDER = new Map(
    NOTIFICATION_TEMPLATE_DEFINITIONS.map((template, index) => [template.eventType, index])
);

const getNotificationTemplateDefinition = (eventType) =>
    NOTIFICATION_TEMPLATE_DEFINITIONS.find((template) => template.eventType === eventType) || null;

const sortNotificationTemplates = (templates = []) => {
    return [...templates].sort((left, right) => {
        const leftOrder = NOTIFICATION_TEMPLATE_ORDER.get(left.eventType) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = NOTIFICATION_TEMPLATE_ORDER.get(right.eventType) ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left.name || '').localeCompare(String(right.name || ''));
    });
};

module.exports = {
    NOTIFICATION_TEMPLATE_DEFINITIONS,
    getNotificationTemplateDefinition,
    sortNotificationTemplates
};
