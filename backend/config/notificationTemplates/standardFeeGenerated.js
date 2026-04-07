const legacyBody = [
    'Hello {{studentName}},',
    '',
    'A new fee of Rs {{amount}} has been generated for {{month}} {{year}}.',
    'Due date: {{dueDate}}.',
    '',
    'Please check your portal for complete fee details.'
].join('\n');

module.exports = {
    name: 'Standard Fee Generated',
    eventType: 'feeGenerated',
    subject: 'Fee Invoice Generated: {{month}} {{year}}',
    body: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fee Invoice Generated</title>
    <style>
        body {
            margin: 0;
            padding: 24px 12px;
            background: #f8fafc;
            font-family: "DM Sans", Arial, sans-serif;
            color: #0f172a;
        }

        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 5px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
        }

        .hero {
            padding: 28px;
            background: linear-gradient(135deg, #760f27, #5e1114);
            color: #ffffff;
        }

        .title {
            margin: 0;
            font-size: 26px;
            line-height: 1.2;
        }

        .subtitle {
            margin: 8px 0 0;
            color: #ccfbf1;
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

        .highlight {
            background: #ecfeff;
            border: 1px solid #a5f3fc;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 22px;
        }

        .amount-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
            color: #0f766e;
        }

        .amount-value {
            margin-top: 8px;
            font-size: 32px;
            font-weight: 800;
            color: #0f172a;
        }

        .meta {
            margin-top: 14px;
            font-size: 14px;
            color: #155e75;
        }

        .cta {
            display: inline-block;
            padding: 13px 20px;
            border-radius: 999px;
            background: linear-gradient(135deg, #760f27, #5e1114);
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 700;
        }

        .footer {
            padding: 0 28px 24px;
            font-size: 12px;
            color: #94a3b8;
        }

        .logo-box {
            padding: 4px;
            border-radius: 6px;
            margin-bottom: 16px;
            display: inline-block;
        }

        .logo-box img {
            height: 56px;
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
            <h1 class="title">Fee Invoice Generated</h1>
            <p class="subtitle">{{month}} {{year}}</p>
        </div>
        <div class="content">
            <p class="greeting">Hello {{studentName}},</p>
            <p class="copy">A new fee invoice has been generated for your account. Please review the amount and pay it
                before the due date.</p>
            <div class="highlight">
                <div class="amount-label">Amount Due</div>
                <div class="amount-value">Rs {{amount}}</div>
                <div class="meta">Due date: {{dueDate}}</div>
            </div>
            <a class="cta" href="https://student.Defactoinstitute.in/" target="_blank" rel="noopener noreferrer">View
                Fee Details In Portal & App</a>
        </div>
        <div class="footer">Sent by {{instituteName}}.</div>
    </div>
</body>

</html>`,
    subjectPush: 'New Fee Generated',
    bodyPush: 'Fee of Rs {{amount}} generated for {{month}} {{year}}. Due date: {{dueDate}}.',
    placeholders: ['studentName', 'amount', 'month', 'year', 'dueDate', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
