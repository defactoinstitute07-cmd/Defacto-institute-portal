const { generateEmailLayout } = require('./emailLayout');

const legacyBody = [
    'Hello {{studentName}},',
    '',
    'We have successfully received your payment of Rs {{amountPaid}}.',
    'Receipt Number: {{receiptNo}}',
    '',
    'Your payment receipt is attached to this email for your records.'
].join('\n');

module.exports = {
    name: 'Standard Fee Payment',
    eventType: 'feePayment',
    subject: 'Fee Payment Received - Receipt {{receiptNo}}',
    body: generateEmailLayout({
        title: 'Payment Received',
        subtitle: 'Your fee payment has been confirmed.',
        messageBody: 'We have successfully received your fee payment. Your receipt information is included below.',
        rows: [
            { label: 'Amount Paid', value: 'Rs {{amountPaid}}' },
            { label: 'Receipt Number', value: '{{receiptNo}}' }
        ],
        ctaText: 'View Payment History',
        ctaLink: 'https://student.defactoinstitute.in/'
    }),
    subjectPush: '₹{{amountPaid}} जमा हो गया',
    bodyPush: 'Hello {{studentName}}, your payment of ₹{{amountPaid}} has been successfully received',
    placeholders: ['studentName', 'amountPaid', 'receiptNo', 'instituteName'],
    legacyBodies: [legacyBody]
};
