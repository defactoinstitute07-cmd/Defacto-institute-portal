const legacyBody = [
    'Hello {{studentName}},',
    '',
    'The result for {{examName}} held on {{examDate}} has been published.',
    'Your score: {{score}}/{{totalMarks}}',
    'Status: {{passStatus}}',
    '',
    'Please review your detailed result in the portal.'
].join('\n');

module.exports = {
    name: 'Standard Exam Result',
    eventType: 'examResult',
    subject: 'Exam Result Published: {{examName}}',
    body: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Result Published</title>
    <style>
        body {
            margin: 0;
            padding: 24px 0px;
            background: #eff6ff;
            font-family: "DM Sans", sans-serif;
            color: #f9fafb;
        }

        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 5px;
            overflow: hidden;
            border: 1px solid #dbeafe;
            box-shadow: 0 16px 34px rgba(37, 99, 235, 0.12);
        }

        .hero {
            padding: 28px;
            background: linear-gradient(135deg, #5e118f, #54174f);
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
            font-size: 14px;
            color: #dbeafe;
        }

        .content {
            padding: 28px;
        }

        .greeting {
            margin: 0 0 12px;
            font-size: 18px;
            font-weight: 700;
            color: #172554;
        }

        .copy {
            margin: 0 0 22px;
            font-size: 15px;
            line-height: 1.7;
            color: #334155;
        }

        .score-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 22px;
        }

        .score-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
            color: #64748b;
        }

        .score-value {
            margin-top: 8px;
            font-size: 34px;
            font-weight: 800;
            color: #2563eb;
        }

        .score-total {
            font-size: 18px;
            color: #94a3b8;
            font-weight: 600;
        }

        .status {
            display: inline-block;
            margin-top: 16px;
            padding: 8px 14px;
            border-radius: 999px;
            background: #dbeafe;
            color: #1d4ed8;
            font-size: 13px;
            font-weight: 700;
        }

        .cta {
            display: inline-block;
            padding: 13px 20px;
            border-radius: 999px;
            background: linear-gradient(135deg, #901dd8, #54174f);
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 700;
        }

        .footer {
            padding: 0 28px 24px;
            font-size: 12px;
            color: #64748b;
        }

               .logo-container {
    display: flex;
    align-items: center;
    gap: 20px;
    background: #000;
    padding: 20px 30px;
}

/* Logo Box Styling */
.logo-box {
    width: 90px;
    height: 90px;
    background: linear-gradient(145deg, #0a0f2c, #000);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
        0 0 15px rgba(255, 215, 0, 0.4),
        inset 0 0 10px rgba(255, 215, 0, 0.2);
    border: 2px solid rgba(255, 215, 0, 0.5);
}

.logo-box img {
    width: 100%;
    height: auto;
     border-radius: 20px;
    object-fit: contain;
}

/* Text Styling */
.logo-text h1 {
    font-size: 48px;
    font-weight: bold;
    margin: 0;
    background: linear-gradient(90deg, #FFD700, #FFA500);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.logo-text p {
    margin: 0;
    font-size: 20px;
    color: #ddd;
    letter-spacing: 1px;
}
    </style>
</head>

<body>
    <div class="card">
        <div class="hero">
                       <div class="logo-container">
  
  <div class="logo-box">
        <img src="https://res.cloudinary.com/dmswb6fya/image/upload/v1775799826/teacher_profiles/gxiptwcbpk2aaclrufol.png" alt="Logo">
    </div>
    <div class="logo-text">
        <h1>Defacto</h1>
        <p>Institute | BHANIYAWALA</p>
    </div>
</div>
            <div class="eyebrow">Exam Result</div>
            <h1 class="title">{{examName}}</h1>
            <p class="subtitle">Published on {{examDate}}</p>
        </div>
        <div class="content">
            <p class="greeting">Hello {{studentName}},</p>
            <p class="copy">Your result has been published. A quick summary is below, and the full breakdown is
                available in your portal.</p>
            <div class="score-card">
                <div class="score-label">Your Score</div>
                <div class="score-value">{{score}} <span class="score-total">/ {{totalMarks}}</span></div>
                <div class="status">Status: {{passStatus}}</div>
            </div>
            <a class="cta" href="{{portalUrl}}" target="_blank" rel="noopener noreferrer">View Full Result</a>
        </div>
        <div class="footer">Issued by {{instituteName}}.</div>
    </div>
</body>

</html>`,
    subjectPush: 'Exam Result are OUT ! ',
    bodyPush: '{{examName}} result is out—you can check your score.',
    placeholders: ['studentName', 'examName', 'examDate', 'score', 'totalMarks', 'passStatus', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
