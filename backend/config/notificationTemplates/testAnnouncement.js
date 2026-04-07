const legacyBody = [
    'Hello {{studentName}},',
    '',
    'A new test has been scheduled.',
    'Test: {{examName}}',
    'Subject: {{subject}}',
    'Date: {{date}}',
    'Total Marks: {{totalMarks}}',
    'Passing Marks: {{passingMarks}}',
    '',
    'Please prepare well and review the syllabus in your portal.'
].join('\n');

module.exports = {
    name: 'Test Announcement',
    eventType: 'testAnnouncement',
    subject: 'New Test Scheduled: {{examName}}',
    body: `<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Announcement</title>
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Font -->
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">

    <!-- Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body {
            margin: 0;
            padding: 24px 12px;

            font-family: "DM Sans", sans-serif;
            color: #f9fafb;
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
            background: linear-gradient(135deg, #12449a, #072143);
            color: #ffffff;
        }

        .eyebrow {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.16);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .title {
            margin: 14px 0 0;
            font-size: 26px;
            line-height: 1.2;
        }

        .subtitle {
            margin: 8px 0 0;
            color: #fdba74;
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

        .details {
            background: #fffaf5;
            border: 1px solid #fed7aa;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 22px;
        }

        .row {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 12px;
            font-size: 14px;
        }

        .row:last-child {
            margin-bottom: 0;
            padding-top: 12px;
            border-top: 1px solid #fed7aa;
        }

        .label {
            color: #9a3412;
            font-weight: 700;
        }

        .value {
            color: #0f172a;
            font-weight: 700;
            text-align: right;
        }

        .cta {
            display: inline-block;
            padding: 13px 20px;
            border-radius: 999px;
            background: linear-gradient(135deg, #12449a, #072143);
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 700;
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
    </style>
</head>

<body>
    <div class="card">
        <div class="hero">
            <div class="logo-box">
                <img
                    src="https://res.cloudinary.com/dsks5swu1/image/upload/v1775542094/erp_uploads/w2nxiqtmiugmebfaag3k.png" />
            </div>
            <div class="eyebrow">Upcoming Test</div>
            <h1 class="title">Test Scheduled</h1>
            <p class="subtitle">{{subject}}</p>
        </div>
        <div class="content">
            <p class="greeting">Hello {{studentName}},</p>
            <p class="copy">A new test has been scheduled. Please review the details below and prepare accordingly.</p>
            <div
                style="background:#fffaf5; border:1px solid #fed7aa; border-radius:16px; padding:20px; margin-bottom:22px;">

                <table width="100%" style="margin-bottom:12px;">
                    <tr>
                        <td style="color:#9a3412; font-weight:700;">Test Name</td>
                        <td style="color:#0f172a; font-weight:700; text-align:right;">{{examName}}</td>
                    </tr>
                </table>

                <table width="100%" style="margin-bottom:12px;">
                    <tr>
                        <td style="color:#9a3412; font-weight:700;">Subject</td>
                        <td style="color:#0f172a; font-weight:700; text-align:right;">{{subject}}</td>
                    </tr>
                </table>

                <table width="100%" style="margin-bottom:12px;">
                    <tr>
                        <td style="color:#9a3412; font-weight:700;">Date</td>
                        <td style="color:#0f172a; font-weight:700; text-align:right;">{{date}}</td>
                    </tr>
                </table>

                <table width="100%" style="margin-bottom:12px;">
                    <tr>
                        <td style="color:#9a3412; font-weight:700;">Total Marks</td>
                        <td style="color:#ea580c; font-weight:700; text-align:right;">{{totalMarks}}</td>
                    </tr>
                </table>

                <table width="100%" style="border-top:1px solid #fed7aa; padding-top:12px;">
                    <tr>
                        <td style="color:#9a3412; font-weight:700;">Passing Marks</td>
                        <td style="color:#16a34a; font-weight:700; text-align:right;">{{passingMarks}}</td>
                    </tr>
                </table>

            </div>
            <a class="cta" href="https://student.Defactoinstitute.in/" target="_blank" rel="noopener noreferrer"> View
                Full Result In Portal & App</a>
            <p class="note">Please review the syllabus and any latest updates in your portal.</p>
        </div>
        <div class="footer">Sent by {{instituteName}}.</div>
    </div>
</body>

</html>`,
     subjectPush: 'A new test has been announced: {{examName}}',
    bodyPush: 'Check your Defacto ERP app for details.',
    placeholders: ['studentName', 'examName', 'subject', 'date', 'totalMarks', 'passingMarks', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
