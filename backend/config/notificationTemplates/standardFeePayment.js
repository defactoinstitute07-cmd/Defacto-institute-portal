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
    body: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fee Payment Received</title>
    <style>
        body {
            margin: 0;
            padding: 24px 12px;
            background: #f0fdf4;
         font-family: "DM Sans", Arial, sans-serif;
            color: #0f172a;
        }

        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 5px;
            overflow: hidden;
            border: 1px solid #dcfce7;
            box-shadow: 0 14px 32px rgba(22, 163, 74, 0.10);
        }

        .hero {
            padding: 28px;
            background: linear-gradient(135deg, #15803d, #14532d);
            color: #ffffff;
        }

        .title {
            margin: 0;
            font-size: 26px;
            line-height: 1.2;
        }

        .subtitle {
            margin: 8px 0 0;
            color: #dcfce7;
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

        .summary {
            background: #f7fee7;
            border: 1px solid #bbf7d0;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 22px;
        }

        .amount {
            font-size: 24px;
            font-weight: 800;
            color: #166534;
            margin-bottom: 10px;
        }

        .receipt {
            font-size: 14px;
            color: #166534;
        }

        .note {
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
                    src="https://res.cloudinary.com/dmswb6fya/image/upload/f_auto,q_auto,c_limit,w_240/v1775635083/erp_uploads/fwp2aeerokjfljm2aw2a.png" />
            </div>
            <h1 class="title">Payment Received</h1>
            <p class="subtitle">Your fee payment has been confirmed.</p>
        </div>
        <div class="content">
            <p class="greeting">Hello {{studentName}},</p>
            <p class="copy">We have successfully received your fee payment. Your receipt information is included below.
            </p>
            <div class="summary">
                <div class="amount">Rs {{amountPaid}}</div>
                <div class="receipt">Receipt Number: {{receiptNo}}</div>
            </div>
            <p class="note">Your payment receipt is attached to this email for your records.</p>
        </div>
        <div class="footer">Sent by {{instituteName}}.</div>
    </div>
</body>

</html>`,
    subjectPush: 'Fee Payment Received',
    bodyPush: 'We have received the payment..',
    placeholders: ['studentName', 'amountPaid', 'receiptNo', 'instituteName'],
    legacyBodies: [legacyBody]
};
