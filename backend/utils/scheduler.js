const cron = require('node-cron');
const feeController = require('../controllers/fee.controller');
const payrollController = require('../controllers/teacher.payroll.controller');

/**
 * Automates monthly fee generation for all active students.
 * Scheduled to run at 00:00 on the 1st day of every month.
 */
const initFeeScheduler = () => {
    // 0 0 1 * * -> Midnight on the 1st of every month
    cron.schedule('0 0 1 * *', async () => {
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'long' });
        const year = now.getFullYear();

        console.log(`[Scheduler] [${now.toISOString()}] Starting automated fee generation for ${month} ${year}...`);

        try {
            // Simulate a request object for the controller
            const mockReq = {
                body: {
                    month: month,
                    year: year,
                    // Due date is the 10th of the current month
                    dueDate: new Date(year, now.getMonth(), 10)
                }
            };

            const mockRes = {
                status: (code) => ({
                    json: (data) => console.log(`[Scheduler] Result (${code}):`, data.message)
                }),
                json: (data) => console.log('[Scheduler] Info:', data.message)
            };

            await feeController.generateFees(mockReq, mockRes);
        } catch (err) {
            console.error('[Scheduler] Critical error in fee generation:', err);
        }
    });

    console.log('[Scheduler] Fee generation service initialized (Runs on the 1st of every month at midnight).');
};

/**
 * Automates monthly salary generation for all active teachers.
 * Scheduled to run at 00:00 on the 1st day of every month.
 */
const initSalaryScheduler = () => {
    cron.schedule('0 0 1 * *', async () => {
        const now = new Date();
        const monthYear = now.toISOString().slice(0, 7); // current YYYY-MM

        console.log(`[Scheduler] [${now.toISOString()}] Starting automated salary generation for ${monthYear}...`);

        try {
            const mockReq = { body: { monthYear } };
            const mockRes = {
                status: (code) => ({
                    json: (data) => console.log(`[Scheduler] Salary Result (${code}):`, data.message)
                }),
                json: (data) => console.log('[Scheduler] Salary Info:', data.message)
            };

            await payrollController.generateMonthlySalaries(mockReq, mockRes);
        } catch (err) {
            console.error('[Scheduler] Critical error in salary generation:', err);
        }
    });

    console.log('[Scheduler] Salary generation service initialized.');
};

module.exports = { initFeeScheduler, initSalaryScheduler };
