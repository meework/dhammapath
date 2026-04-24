// ═══════════════════════════════════════════════════════════
//  DHAMMAPATH — Google Apps Script (อัปเดตพร้อมระบบส่งอีเมล)
//
//  วิธีใช้:
//  1. เปิด Google Sheet → Extensions → Apps Script
//  2. วางโค้ดทั้งหมดนี้แทนที่โค้ดเดิม
//  3. บันทึก (Ctrl+S)
//  4. เรียกใช้ installTrigger() ครั้งเดียว (Run → installTrigger)
//     กด Review permissions → Allow
//  5. Deploy ใหม่เป็น Web App (Deploy → New Deployment)
//
//  โครงสร้างคอลัมน์ใน Sheet ชื่อ "Registrations":
//  A=Timestamp  B=Ref  C=Batch  D=Name  E=Nickname
//  F=Age  G=Phone  H=Email  I=Occupation  J=Province
//  K=Motivation  L=Status
// ═══════════════════════════════════════════════════════════

const SHEET_NAME    = 'Registrations';
const STATUS_COL    = 12;  // L — สถานะ
const EMAIL_COL     = 8;   // H — อีเมล
const NAME_COL      = 4;   // D — ชื่อ-นามสกุล
const NICKNAME_COL  = 5;   // E — ชื่อเล่น
const REF_COL       = 2;   // B — หมายเลขอ้างอิง
const BATCH_COL     = 3;   // C — รุ่น
const CONFIRM_VALUE = 'ยืนยัน';
const WEBSITE_URL   = 'https://dhammapath.vercel.app/participants.html';

// ─── ติดตั้ง Trigger (รันครั้งเดียว) ───────────────────────
function installTrigger() {
  // ลบ trigger เดิมที่ชื่อ onStatusChange ก่อน (ป้องกันซ้ำ)
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onStatusChange') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('onStatusChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  Logger.log('Trigger installed successfully.');
}

// ─── Trigger: ตรวจจับการเปลี่ยนสถานะ ───────────────────────
function onStatusChange(e) {
  try {
    const sheet = e.source.getActiveSheet();
    Logger.log('Sheet: ' + sheet.getName() + ' | Expected: ' + SHEET_NAME);
    if (sheet.getName() !== SHEET_NAME) { Logger.log('STOP: sheet name mismatch'); return; }

    const range = e.range;
    Logger.log('Col: ' + range.getColumn() + ' | Expected: ' + STATUS_COL);
    if (range.getColumn() !== STATUS_COL) { Logger.log('STOP: wrong column'); return; }
    if (range.getRow() <= 1) { Logger.log('STOP: header row'); return; }

    const newValue = String(range.getValue()).trim();
    Logger.log('Value: [' + newValue + '] | Expected: [' + CONFIRM_VALUE + ']');
    if (newValue !== CONFIRM_VALUE) { Logger.log('STOP: value mismatch'); return; }

    const row = range.getRow();
    const rowData = sheet.getRange(row, 1, 1, STATUS_COL).getValues()[0];

    const ref      = rowData[REF_COL - 1]      || '';
    const batch    = rowData[BATCH_COL - 1]    || '';
    const name     = rowData[NAME_COL - 1]     || '';
    const nickname = rowData[NICKNAME_COL - 1] || '';
    const email    = rowData[EMAIL_COL - 1]    || '';

    if (!email) {
      Logger.log('No email for row ' + row + ', skipping.');
      return;
    }

    sendConfirmationEmail(email, name, nickname, batch, ref);

  } catch (err) {
    Logger.log('onStatusChange error: ' + err.toString());
  }
}

// ─── ส่งอีเมลยืนยัน ─────────────────────────────────────────
function sendConfirmationEmail(email, name, nickname, batch, ref) {
  const displayName = nickname ? nickname : name.split(' ')[0];
  const subject = '🙏 ยืนยันการเข้าร่วมค่ายธรรมตามมรรค — ' + batch;

  const htmlBody = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f5ede0;font-family:'Helvetica Neue',Arial,sans-serif;}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(42,21,8,0.10);}
  .header{background:#2a1508;padding:40px 40px 32px;text-align:center;}
  .header-lotus{font-size:28px;margin-bottom:8px;}
  .header h1{color:#d4a855;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-weight:400;margin:0 0 4px;}
  .header p{color:rgba(255,255,255,0.35);font-size:11px;margin:0;letter-spacing:0.12em;}
  .body{padding:40px;}
  .greeting{font-size:20px;font-weight:600;color:#2a1508;margin-bottom:8px;}
  .greeting span{color:#c8762a;}
  .message{font-size:14px;color:#555;line-height:1.85;margin-bottom:24px;}
  .ref-box{background:#faf6ef;border:1px solid #e8d9c0;border-radius:6px;padding:16px 20px;margin:24px 0;}
  .ref-label{font-size:10px;color:#aaa;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px;}
  .ref-value{font-size:20px;color:#2a1508;font-weight:700;letter-spacing:0.06em;}
  .divider{height:1px;background:#f0e8dc;margin:28px 0;}
  .info-section h3{font-size:11px;color:#aaa;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px;}
  .info-row{display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;}
  .info-icon{font-size:16px;line-height:1.4;flex-shrink:0;}
  .info-text{font-size:13px;color:#555;line-height:1.65;}
  .info-text strong{color:#2a1508;font-weight:600;}
  .cta-section{text-align:center;padding:28px 0 8px;}
  .cta-btn{display:inline-block;background:#d4a855;color:#2a1508;text-decoration:none;padding:14px 36px;border-radius:3px;font-weight:700;font-size:14px;letter-spacing:0.02em;}
  .footer{background:#2a1508;padding:24px 40px;text-align:center;}
  .footer p{color:rgba(255,255,255,0.25);font-size:11px;margin:4px 0;line-height:1.7;}
  .footer a{color:rgba(212,168,85,0.6);text-decoration:none;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="header-lotus">🪷</div>
    <h1>ธรรมตามมรรค</h1>
    <p>Dhammapath Buddhist Youth Retreat</p>
  </div>
  <div class="body">
    <p class="greeting">สวัสดี <span>${displayName}</span> 🙏</p>
    <p class="message">
      ขอแสดงความยินดี! คุณ<strong>${name}</strong> ผ่านการคัดเลือกเข้าร่วม<strong>ค่ายธรรมตามมรรค ${batch}</strong> เรียบร้อยแล้ว
      ทีมงานดีใจที่จะได้ต้อนรับคุณในค่ายครั้งนี้
    </p>

    <div class="ref-box">
      <div class="ref-label">หมายเลขอ้างอิง</div>
      <div class="ref-value">${ref}</div>
    </div>

    <div class="divider"></div>

    <div class="info-section">
      <h3>ข้อมูลสำคัญ</h3>
      <div class="info-row">
        <span class="info-icon">📍</span>
        <span class="info-text"><strong>สถานที่</strong><br>วัดป่าศรีอุทุมพร อ.แก่งคอย จังหวัดสระบุรี</span>
      </div>
      <div class="info-row">
        <span class="info-icon">📅</span>
        <span class="info-text"><strong>รุ่น / วันที่</strong><br>${batch}</span>
      </div>
      <div class="info-row">
        <span class="info-icon">👗</span>
        <span class="info-text"><strong>เครื่องแต่งกาย</strong><br>ชุดขาวหรือสีเรียบ ไม่มีลวดลาย</span>
      </div>
      <div class="info-row">
        <span class="info-icon">📵</span>
        <span class="info-text"><strong>โทรศัพท์</strong><br>กรุณาลดการใช้โทรศัพท์ระหว่างค่าย</span>
      </div>
      <div class="info-row">
        <span class="info-icon">💬</span>
        <span class="info-text"><strong>ติดต่อทีมงาน</strong><br>LINE Official: <strong>@dhammapath</strong></span>
      </div>
    </div>

    <div class="cta-section">
      <a href="${WEBSITE_URL}" class="cta-btn">ดูรายชื่อผู้เข้าร่วมค่าย</a>
    </div>
  </div>
  <div class="footer">
    <p>อีเมลนี้ส่งอัตโนมัติจากระบบลงทะเบียนค่ายธรรมตามมรรค</p>
    <p>หากมีข้อสงสัย ติดต่อ <a href="mailto:meeworkofficial@gmail.com">meeworkofficial@gmail.com</a></p>
  </div>
</div>
</body>
</html>`;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody,
    name: 'ค่ายธรรมตามมรรค'
  });

  Logger.log('Confirmation email sent → ' + email + ' (' + name + ' | ' + ref + ')');
}

// ─── doGet: ส่งข้อมูลให้เว็บ ─────────────────────────────────
function doGet(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rows  = sheet.getDataRange().getValues();

    const result  = { counts: {}, totals: { '10': 15, '11': 15, '12': 15 } };
    const approved = { '10': [], '11': [], '12': [] };

    for (let i = 1; i < rows.length; i++) {
      const row    = rows[i];
      const batch  = String(row[BATCH_COL - 1] || '');
      const status = String(row[STATUS_COL - 1] || '').trim();
      const name   = String(row[NAME_COL - 1] || '').trim();
      const nick   = String(row[NICKNAME_COL - 1] || '').trim();

      ['10', '11', '12'].forEach(b => {
        if (batch.includes('รุ่น ' + b)) {
          result.counts[b] = (result.counts[b] || 0) + 1;
          if (status === CONFIRM_VALUE && name) {
            approved[b].push({ name: name, nickname: nick });
          }
        }
      });
    }

    result.approved_batch10 = approved['10'];
    result.approved_batch11 = approved['11'];
    result.approved_batch12 = approved['12'];

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── doPost: รับข้อมูลการสมัคร ───────────────────────────────
function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data  = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(),       // A — Timestamp
      data.ref,         // B — Ref
      data.batch,       // C — Batch
      data.name,        // D — Name
      data.nickname,    // E — Nickname  ← เพิ่มใหม่
      data.age,         // F — Age
      data.phone,       // G — Phone
      data.email,       // H — Email
      data.occupation,  // I — Occupation
      data.province,    // J — Province
      data.motivation,  // K — Motivation
      'รอตรวจสอบ'       // L — Status
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', ref: data.ref }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
