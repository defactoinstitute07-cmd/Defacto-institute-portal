const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const studentRegistrationTemplate = require('../config/notificationTemplates/studentRegistration');

const DEFAULT_FILE_NAME = 'Defacto_Profile_Setup_Instructions.pdf';
const STUDENT_REGISTRATION_ATTACHMENT_DIR = path.join(
    __dirname,
    '..',
    'config',
    'notificationTemplates',
    'attachments',
    'studentRegistration'
);

const createStudentProfileSetupPdfBuffer = ({ portalUrl = '' } = {}) => {
    const instituteName = studentRegistrationTemplate.welcomeInstituteName || 'Defacto Institute';
    const profileSetupTitle = studentRegistrationTemplate.profileSetupPdfTitle || 'ERP Profile Setup Instructions';
    const setupInstructions = Array.isArray(studentRegistrationTemplate.setupInstructions)
        ? studentRegistrationTemplate.setupInstructions
        : [];
    const closingLines = Array.isArray(studentRegistrationTemplate.closingLines)
        ? studentRegistrationTemplate.closingLines
        : ['Thank you,', 'Technical Team', instituteName];

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50, compress: false });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - 100;
        const brandBlack = '#111111';
        const brandYellow = '#FFB800';
        const bodyText = '#27272a';
        const mutedText = '#52525b';

        doc.rect(0, 0, pageWidth, 125).fill(brandBlack);

        doc
            .fillColor(brandYellow)
            .font('Helvetica-Bold')
            .fontSize(13)
            .text('WELCOME GUIDE', 50, 34, { width: contentWidth });

        doc
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .fontSize(24)
            .text(instituteName, 50, 54, { width: contentWidth });

        doc
            .fillColor('#d4d4d8')
            .font('Helvetica')
            .fontSize(12)
            .text('Profile setup instructions for newly registered students', 50, 88, { width: contentWidth });

        let cursorY = 155;

        doc
            .fillColor(bodyText)
            .font('Helvetica-Bold')
            .fontSize(18)
            .text(profileSetupTitle, 50, cursorY, { width: contentWidth });

        cursorY += 38;

        doc
            .fillColor(bodyText)
            .font('Helvetica-Bold')
            .fontSize(13)
            .text('Points for Setting Up Your Profile:', 50, cursorY, { width: contentWidth });

        cursorY += 26;

        setupInstructions.forEach((instruction, index) => {
            doc
                .fillColor(brandYellow)
                .font('Helvetica-Bold')
                .fontSize(11)
                .text(`${index + 1}.`, 50, cursorY, { width: 20 });

            doc
                .fillColor(bodyText)
                .font('Helvetica')
                .fontSize(12);

            const instructionOptions = { width: contentWidth - 24, lineGap: 4 };
            const height = doc.heightOfString(instruction, instructionOptions);

            doc.text(instruction, 74, cursorY, instructionOptions);

            cursorY += height + 12;
        });

        cursorY += 6;

        doc
            .roundedRect(50, cursorY, contentWidth, 96, 10)
            .fillAndStroke('#fff8db', '#fde68a');

        doc
            .fillColor(bodyText)
            .font('Helvetica-Bold')
            .fontSize(13)
            .text('ERP Profile Setup Link', 68, cursorY + 18, { width: contentWidth - 36 });

        doc
            .fillColor(mutedText)
            .font('Helvetica')
            .fontSize(11)
            .text('Use the link below to set up your ERP profile.', 68, cursorY + 40, { width: contentWidth - 36 });

        doc
            .fillColor('#12449a')
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(portalUrl, 68, cursorY + 62, {
                width: contentWidth - 36,
                underline: true,
                link: portalUrl
            });

        cursorY += 128;

        doc
            .fillColor(bodyText)
            .font('Helvetica')
            .fontSize(12)
            .text(closingLines.join('\n'), 50, cursorY, { width: contentWidth, lineGap: 4 });

        doc.end();
    });
};

const getUploadedStudentRegistrationPdf = async () => {
    try {
        const directoryEntries = await fs.promises.readdir(STUDENT_REGISTRATION_ATTACHMENT_DIR, { withFileTypes: true });
        const pdfEntries = await Promise.all(
            directoryEntries
                .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
                .map(async (entry) => {
                    const fullPath = path.join(STUDENT_REGISTRATION_ATTACHMENT_DIR, entry.name);
                    const stats = await fs.promises.stat(fullPath);
                    return {
                        name: entry.name,
                        fullPath,
                        mtimeMs: stats.mtimeMs
                    };
                })
        );

        if (pdfEntries.length === 0) {
            return null;
        }

        pdfEntries.sort((left, right) => right.mtimeMs - left.mtimeMs);
        const selectedPdf = pdfEntries[0];
        const pdfBuffer = await fs.promises.readFile(selectedPdf.fullPath);

        return {
            filename: selectedPdf.name,
            content: pdfBuffer,
            contentType: 'application/pdf'
        };
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            console.error('[studentProfileSetupPdf] Failed to read uploaded PDF', error?.message || error);
        }
        return null;
    }
};

const buildStudentRegistrationAttachments = async ({ portalUrl = '' } = {}) => {
    try {
        const uploadedPdf = await getUploadedStudentRegistrationPdf();
        if (uploadedPdf) {
            return [uploadedPdf];
        }

        const pdfBuffer = await createStudentProfileSetupPdfBuffer({ portalUrl });
        return [{
            filename: DEFAULT_FILE_NAME,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }];
    } catch (error) {
        console.error('[studentProfileSetupPdf] Failed to generate setup PDF', error?.message || error);
        return [];
    }
};

module.exports = {
    buildStudentRegistrationAttachments,
    createStudentProfileSetupPdfBuffer,
    STUDENT_REGISTRATION_ATTACHMENT_DIR
};
