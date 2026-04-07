const legacyBody = [
    'Hello {{studentName}},',
    '',
    'Your fee of Rs {{pendingAmount}} for {{month}} {{year}} is overdue.',
    'Please settle it by {{deadline}}.',
    'Contact the institute if you need any support.'
].join('\n');

module.exports = {
    name: 'Standard Fee Overdue',
    eventType: 'feeOverdue',
    subject: 'Reminder: Fee Overdue for {{month}} {{year}}',
    body: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fee Overdue Reminder</title>
    <style>
        body {
            margin: 0;
            padding: 24px 12px;
            background: #fff7ed;
            font-family: "DM Sans", Arial, sans-serif;
            color: #0f172a;
        }

        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 5px;
            overflow: hidden;
            border: 1px solid #fed7aa;
            box-shadow: 0 14px 30px rgba(234, 88, 12, 0.10);
        }

        .hero {
            padding: 28px;
            background: linear-gradient(135deg, #c2410c, #7c2d12);
            color: #ffffff;
        }

        .title {
            margin: 0;
            font-size: 26px;
            line-height: 1.2;
        }

        .subtitle {
            margin: 8px 0 0;
            color: #ffedd5;
            font-size: 14px;
        }

        .content {
            padding: 28px;
        }

        .greeting {
            margin: 0 0 12px;
            font-size: 18px;
            font-weight: 700;
        }

        .copy {
            margin: 0 0 22px;
            font-size: 15px;
            line-height: 1.7;
            color: #334155;
        }

        .warning {
            background: #fff7ed;
            border: 1px solid #fdba74;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 22px;
        }

        .amount {
            font-size: 24px;
            font-weight: 800;
            color: #c2410c;
            margin-bottom: 10px;
        }

        .meta {
            font-size: 14px;
            color: #9a3412;
        }

        .cta {
            display: inline-block;
            padding: 13px 20px;
            border-radius: 999px;
            background: #c2410c;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 700;
        }

        .note {
            margin-top: 18px;
            font-size: 13px;
            color: #64748b;
        }

        .footer {
            padding: 0 28px 24px;
            font-size: 12px;
            color: #94a3b8;
        }

        .logo-box {

            /* border-white/10 */
            padding: 4px;
            /* p-1 */
            border-radius: 6px;
            /* rounded-md */
            margin-bottom: 16px;

            /* shadow-md */
            display: inline-block;
        }

        .logo-box img {
            height: 56px;
            /* h-14 */
            width: auto;
            object-fit: contain;
        }
    </style>
</head>

<body>
    <div class="card">
        <div class="hero">
            <div class="logo-box">
                <img
                    src="https://res.cloudinary.com/dsks5swu1/image/upload/v1775542094/erp_uploads/w2nxiqtmiugmebfaag3k.png" />
            </div>
            <h1 class="title">Fee Overdue Reminder</h1>
            <p class="subtitle">{{month}} {{year}}</p>
        </div>
        <div class="content">
            <p class="greeting">Hello {{studentName}},</p>
            <p class="copy">Your fee payment is overdue. Please clear the balance before the deadline to avoid any
                further action.</p>
            <div class="warning">
                <div class="amount">Rs {{pendingAmount}}</div>
                <div class="meta">Deadline: {{deadline}}</div>
            </div>

            <p class="note">If you need support, please contact {{instituteName}}.</p>
        </div>
        <div class="footer">Sent by {{instituteName}}.</div>
    </div>
</body>

</html>`,
    subjectPush: 'Fee Overdue Alert',
    bodyPush: 'Fee of Rs {{pendingAmount}} for {{month}} {{year}} is overdue. Please pay by {{deadline}}.',
    placeholders: ['studentName', 'pendingAmount', 'month', 'year', 'deadline', 'dueDate', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
