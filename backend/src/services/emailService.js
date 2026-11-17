const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your regular password)
  },
});

/**
 * Send an "outbid" notification to the supplier who just lost L1.
 * @param {object} opts
 * @param {string} opts.toEmail       - Supplier's email address
 * @param {string} opts.companyName   - Supplier's company name
 * @param {string} opts.rfqTitle      - RFQ title/item name
 * @param {string} opts.rfqId         - RFQ ID (for the link)
 * @param {number} opts.theirBid      - Their current best bid amount
 * @param {number} opts.newL1Amount   - The new L1 (winning) bid amount
 * @param {Date}   opts.bidClose      - Auction closing time
 * @param {number} opts.newRank       - Their new rank (2, 3, etc.)
 */
async function sendOutbidEmail({ toEmail, companyName, rfqTitle, rfqId, theirBid, newL1Amount, bidClose, newRank }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — skipping outbid email');
    return;
  }

  const fmt = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');
  const closeStr = new Date(bidClose).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const auctionUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/rfq/${rfqId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:28px 32px;">
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">British Auction &middot; RFQ Platform</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800;">&#x26A0;&#xFE0F; You've Been Outbid</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi <strong>${companyName}</strong>,</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        Another supplier has placed a lower bid and taken the <strong>Rank #1 (L1)</strong> position in the auction below.
        You are now at <strong>Rank #${newRank}</strong>.
      </p>

      <!-- RFQ Info -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Auction</p>
        <p style="margin:0 0 16px;color:#1e293b;font-size:16px;font-weight:700;">${rfqTitle}</p>
        
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:140px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
            <p style="margin:0 0 2px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;">Current L1 Bid</p>
            <p style="margin:0;color:#16a34a;font-size:20px;font-weight:800;">${fmt(newL1Amount)}</p>
          </div>
          <div style="flex:1;min-width:140px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;">
            <p style="margin:0 0 2px;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;">Your Bid</p>
            <p style="margin:0;color:#ef4444;font-size:20px;font-weight:800;">${fmt(theirBid)}</p>
          </div>
        </div>
        <p style="margin:14px 0 0;color:#94a3b8;font-size:12px;">&#x23F0; Auction closes: <strong style="color:#475569;">${closeStr} IST</strong></p>
      </div>

      <!-- CTA -->
      <a href="${auctionUrl}"
        style="display:block;text-align:center;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;
               font-size:15px;font-weight:700;padding:14px 24px;border-radius:12px;letter-spacing:0.3px;">
        &#x26A1; Counter-Bid Now &rarr;
      </a>

      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
        You are receiving this because you have an active bid in this auction.<br>
        Log in to your supplier account to update your quote.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#cbd5e1;font-size:11px;">British Auction &middot; RFQ Platform &middot; Real-time Reverse Procurement</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    await transporter.sendMail({
      from: `"British Auction Platform" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `You've been outbid — ${rfqTitle} (Rank #${newRank})`,
      html,
    });
    console.log(`[Email] Outbid notification sent to ${toEmail}`);
  } catch (err) {
    // Email failures must never break the auction
    console.error('[Email] Failed to send outbid email:', err.message);
  }
}

module.exports = { sendOutbidEmail };
