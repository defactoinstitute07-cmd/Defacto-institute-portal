/**
 * Master Email Layout for Defacto ERP
 * Provides a unified, premium, responsive design for all system emails.
 */

const generateDetailsTable = (rows = []) => {
    if (!rows || rows.length === 0) return '';

    let tableHtml = `
    <div style="background:#fffaf5; border:1px solid #fed7aa; border-radius:16px; padding:20px; margin-bottom:22px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
    `;

    rows.forEach((row, index) => {
        const isLast = index === rows.length - 1;
        const borderStyle = isLast ? 'border-top:1px solid #fed7aa; padding-top:12px;' : 'padding-bottom:12px;';
        const labelColor = row.labelColor || '#9a3412';
        const valueColor = row.valueColor || '#0f172a';

        tableHtml += `
            <tr>
                <td style="${borderStyle} color:${labelColor}; font-weight:700; font-size:14px; text-align:left;">${row.label}</td>
                <td style="${borderStyle} color:${valueColor}; font-weight:700; font-size:14px; text-align:right;">${row.value}</td>
            </tr>
        `;

        if (!isLast && !row.noSpacing) {
            tableHtml += '<tr><td height="4"></td></tr>';
        }
    });

    tableHtml += `
        </table>
    </div>
    `;
    return tableHtml;
};

const generateEmailLayout = ({
    eyebrow = '',
    title = '',
    subtitle = '',
    greeting = 'Hello {{studentName}},',
    messageBody = '',
    rows = [],
    ctaText = '',
    ctaLink = '',
    footerText = 'Sent by {{instituteName}}.',
    theme = {
        primaryGradient: 'linear-gradient(135deg, #12449a, #072143)',
        accentColor: '#fdba74',
        cardBg: '#ffffff',
        heroTextColor: '#ffffff'
    }
}) => {
    const detailsTable = generateDetailsTable(rows);
    const ctaButton = ctaLink ? `
        <a class="cta" href="${ctaLink}" target="_blank" rel="noopener noreferrer">${ctaText || 'View Details'}</a>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 24px 12px; font-family: "DM Sans", Arial, sans-serif; background: #f8fafc; color: #1e293b; }
        .card { max-width: 560px; margin: 0 auto; background: ${theme.cardBg}; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .hero { padding: 32px; background: ${theme.primaryGradient}; color: ${theme.heroTextColor}; }
        .eyebrow { display: inline-block; padding: 4px 12px; border-radius: 99px; background: rgba(255, 255, 255, 0.15); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; color: ${theme.accentColor}; }
        .title { margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2; }
        .subtitle { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 15px; }
        .content { padding: 32px; }
        .greeting { margin: 0 0 12px; font-size: 18px; font-weight: 700; color: #0f172a; }
        .copy { margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #475569; }
        .cta { display: inline-block; padding: 14px 28px; border-radius: 8px; background: ${theme.primaryGradient}; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; text-align: center; }
        .footer { padding: 0 32px 32px; font-size: 12px; color: #94a3b8; text-align: center; }
        
        .logo-container { display: flex; align-items: center; gap: 15px; margin-bottom: 24px; flex-wrap: wrap; }
        .logo-box { width: 60px; height: 60px; background: linear-gradient(145deg, #0a0f2c, #000); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 215, 0, 0.3); }
        .logo-box img { width: 45px; height: 45px; object-fit: contain; }
        .logo-text h2 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; }
        .logo-text p { margin: 0; font-size: 12px; color: ${theme.accentColor}; text-transform: uppercase; letter-spacing: 1px; }

        @media (max-width: 480px) {
            .hero { padding: 24px; }
            .content { padding: 24px; }
            .title { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="hero">
            <div class="logo-container">
                <div class="logo-text">
                    <h2>Defacto</h2>
                    <p>Institute Portal</p>
                </div>
            </div>
            ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}
            <h1 class="title">${title}</h1>
            <p class="subtitle">${subtitle}</p>
        </div>
        <div class="content">
            <p class="greeting">${greeting}</p>
            <div class="copy">${messageBody}</div>
            ${detailsTable}
            ${ctaButton}
        </div>
        <div class="footer">${footerText}</div>
    </div>
</body>
</html>`;
};

module.exports = { generateEmailLayout, generateDetailsTable };
