import { createServerFn } from "@tanstack/react-start";
import { type GarageParams, resolveColorName } from "./types";
import { getCladdingConfig } from "./configHelper";

function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface InquiryData {
  name: string;
  email: string;
  phone: string;
  message: string;
  params: GarageParams;
  origin: string;
  totalPrice?: string;
  quoteUrl?: string;
}

export const sendInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: InquiryData) => data)
  .handler(async ({ data }) => {
    const { name, email, phone, message, params, origin, totalPrice } = data;

    const claddingCfg = getCladdingConfig();
    const dealerInfo = claddingCfg.dealer || {};
    const companyName = dealerInfo.name || "VBAU s.r.o.";
    const companyPhone = dealerInfo.phone || "(+421) 902 565 100";
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || dealerInfo.email || "tmal.eu.new@gmail.com";
    const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeMessage = escapeHtml(message);

    // Build the query parameters for both the admin evaluation and customer online offer
    const searchParams = new URLSearchParams();
    const keys = Object.keys(params) as (keyof GarageParams)[];
    for (const key of keys) {
      let val = String(params[key]);
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "trimmingColor") && val.startsWith("#")) {
        val = val.substring(1);
      }
      searchParams.set(key, val);
    }
    if (name) searchParams.set("client_name", name);
    if (email) searchParams.set("client_email", email);
    if (phone) searchParams.set("client_phone", phone);
    if (message) searchParams.set("client_note", message);

    const evaluationUrl = `${origin}/vyhodnotenie?${searchParams.toString()}`;
    const quoteUrl = data.quoteUrl || `${origin}/ponuka?${searchParams.toString()}`;
    const modelName = params.roofType === "gable" ? "Garáž so sedlovou strechou" : "Garáž s pultovou strechou";
    const primaryColor = "#10b981";

    // Construct email content for admin
    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <h1 style="color: #0f172a; font-size: 24px;">Nový dopyt prijatý</h1>
        <p>Dostali ste novú konfiguráciu od zákazníka.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p><strong>Zákazník:</strong> ${safeName}</p>
          <p><strong>E-mail:</strong> <a href="mailto:${safeEmail}" style="color: ${primaryColor}; text-decoration: none;">${safeEmail}</a></p>
          <p><strong>Telefón:</strong> ${safePhone}</p>
          <p><strong>Poznámka:</strong> ${safeMessage || "Bez poznámky"}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
          <p><strong>Model:</strong> ${modelName}</p>
          <p><strong>Rozmery:</strong> ${params.width} x ${params.length} x ${params.clearHeight} m</p>
          <p><strong>Opláštenie:</strong> ${params.panelType === "sandwich" ? "Sendvičové panely" : "Trapézový plech"} (Steny: ${resolveColorName(params.claddingColor)}, Strecha: ${resolveColorName(params.roofColor)})</p>
          <p><strong>Garážová brána:</strong> ${params.gateCount === 2 ? "2x" : "1x"} (${params.doorWidth}x${params.doorHeight}m, ${resolveColorName(params.sectionalDoorColor)})</p>
          <p><strong>Lemovanie & odkvapy:</strong> ${resolveColorName(params.trimmingColor)}</p>
          ${params.hasExtension ? `<p><strong>Bočný prístrešok:</strong> ${params.extensionType === "garage" ? "2. garáž" : params.extensionType === "storage" ? "Sklad" : "Carport"} (${params.extensionWidth ?? 3.5}m, ${params.extensionSide === "left" ? "vľavo" : "vpravo"})</p>` : ""}
          <p><strong>Osobné dvere:</strong> ${params.hasPersonalDoor ? `Áno (${resolveColorName(params.doorColor)})` : "Nie"}</p>
          <p><strong>Okná:</strong> ${params.hasWindows ? `${params.windowCount}x (${params.windowWidth}x${params.windowHeight}m)` : "Žiadne"}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${evaluationUrl}" style="background: ${primaryColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Zobraziť interaktívnu ponuku
          </a>
        </div>
        
        <p style="font-size: 12px; color: #64748b;">Tento dopyt bol vygenerovaný konfigurátorom ${escapeHtml(companyName)}</p>
      </div>
    `;

    // Construct email content for client matching Pergola Pro attachment exactly
    const clientHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 6px 0;">Ďakujeme za váš dopyt</h1>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: ${primaryColor}; font-weight: 800; margin: 0 0 20px 0;">${escapeHtml(companyName.toUpperCase())}</p>
        
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">Dobrý deň ${safeName || "zákazník"}, váš dopyt sme úspešne prijali do nášho systému.</p>
        
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 22px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b;"><strong>Váš model:</strong> ${modelName}</p>
          <p style="margin: 0; font-size: 14px; color: #1e293b;"><strong>Rozmery:</strong> ${params.width} x ${params.length} x ${params.clearHeight} m</p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${quoteUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 16px 36px; border-radius: 10px; font-weight: 800; text-decoration: none; display: inline-block; font-size: 14px;">
            Zobraziť moju ponuku online
          </a>
          <p style="margin-top: 14px; font-size: 12px; color: #64748b;">Cez tento odkaz si môžete ponuku kedykoľvek otvoriť a stiahnuť ako PDF.</p>
        </div>

        <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0 0 24px 0;">Náš obchodný zástupca vás bude čoskoro kontaktovať pre dohodnutie ďalšieho postupu.</p>
        
        <div style="border-top: 1px solid #e2e8f0; margin-bottom: 20px;"></div>
        
        <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
          <p style="margin: 0 0 4px 0; font-weight: 800; color: #0f172a;">${escapeHtml(companyName)}</p>
          <p style="margin: 0 0 4px 0;"><a href="tel:${escapeHtml(companyPhone)}" style="color: #0284c7; text-decoration: none;">✆ ${escapeHtml(companyPhone)}</a></p>
          <p style="margin: 0;"><a href="mailto:${escapeHtml(adminEmail)}" style="color: ${primaryColor}; text-decoration: none;">✉ ${escapeHtml(adminEmail)}</a></p>
        </div>
      </div>
    `;

    let gmailSent = false;
    const gmailUser = process.env.GMAIL_SMTP_USER || "pergolaconfigurator@gmail.com";
    const gmailPass = (process.env.GMAIL_APP_PASSWORD || "mwjp iniv piep tcdf").replace(/\s+/g, "");

    if (gmailUser && gmailPass) {
      try {
        const tls = await import("node:tls");
        const readline = await import("node:readline");

        function buildMime(msg: { to: string; subject: string; html: string; fromName?: string }) {
          const boundary = "boundary_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
          const fromHeader = msg.fromName
            ? ` =?UTF-8?B?${Buffer.from(msg.fromName, "utf8").toString("base64")}?= <${gmailUser}>`
            : gmailUser;
          const subjectHeader = ` =?UTF-8?B?${Buffer.from(msg.subject, "utf8").toString("base64")}?=`;

          return [
            `From: ${fromHeader}`,
            `To: ${msg.to}`,
            `Reply-To: ${adminEmail}`,
            `Subject: ${subjectHeader}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            'Content-Type: text/html; charset="UTF-8"',
            "Content-Transfer-Encoding: 8bit",
            "",
            msg.html,
            "",
            `--${boundary}--`,
            "",
          ].join("\r\n");
        }

        async function sendOneMail(toAddr: string, subject: string, html: string) {
          const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com", rejectUnauthorized: true });
          socket.setTimeout(3000);

          await new Promise((res, rej) => {
            const tm = setTimeout(() => { socket.destroy(); rej(new Error("SMTP timeout")); }, 4000);
            socket.once("secureConnect", () => { clearTimeout(tm); res(null); });
            socket.once("error", (e) => { clearTimeout(tm); rej(e); });
          });

          socket.setEncoding("utf8");
          const rl = readline.createInterface({ input: socket, crlfDelay: Infinity });
          const it = rl[Symbol.asyncIterator]();

          async function readResp() {
            while (true) {
              const nx = await it.next();
              if (nx.done) throw new Error("SMTP closed unexpectedly");
              const line = String(nx.value || "");
              const m = line.match(/^(\d{3})([ -])(.*)$/);
              if (m && m[2] === " ") return { code: Number(m[1]), message: m[3] };
            }
          }

          async function sendCmd(cmd: string, okCodes: number[]) {
            socket.write(cmd + "\r\n");
            const r = await readResp();
            if (!okCodes.includes(r.code)) throw new Error(`SMTP fail (${cmd.split(" ")[0]}): ${r.code} ${r.message}`);
            return r;
          }

          try {
            await readResp();
            await sendCmd("EHLO smtp.gmail.com", [250]);
            await sendCmd("AUTH LOGIN", [334]);
            await sendCmd(Buffer.from(gmailUser).toString("base64"), [334]);
            await sendCmd(Buffer.from(gmailPass).toString("base64"), [235]);
            await sendCmd(`MAIL FROM:<${gmailUser}>`, [250]);
            await sendCmd(`RCPT TO:<${toAddr.trim()}>`, [250, 251]);
            await sendCmd("DATA", [354]);
            socket.write(buildMime({ to: toAddr, subject, html, fromName: companyName }) + "\r\n.\r\n");
            await readResp();
            await sendCmd("QUIT", [221]);
          } finally {
            rl.close();
            socket.end();
          }
        }

        console.log(`[SMTP] Sending inquiry emails via Gmail (${gmailUser})...`);
        let anySent = false;

        // 1. Send to Admin
        if (adminEmail) {
          try {
            await sendOneMail(adminEmail, `Nový dopyt: ${name || "Zákazník"} - ${companyName}`, adminHtml);
            anySent = true;
            console.log("[SMTP] Admin email sent successfully!");
          } catch (e) {
            console.error("[SMTP] Failed to send admin email:", e);
          }
        }

        // 2. Send to Customer
        if (email) {
          try {
            await sendOneMail(email, `Ďakujeme za váš dopyt - ${companyName}`, clientHtml);
            anySent = true;
            console.log(`[SMTP] Customer email sent successfully to ${email}!`);
          } catch (e) {
            console.error(`[SMTP] Failed to send customer email to ${email}:`, e);
          }
        }

        if (anySent) {
          gmailSent = true;
        }
      } catch (smtpErr) {
        console.warn("[SMTP] Gmail SMTP error, falling back to Resend:", smtpErr);
      }
    }

    if (gmailSent) {
      return { success: true, method: "gmail_smtp" };
    }

    if (!resendApiKey) {
      console.warn("Chýba RESEND_API_KEY. E-maily neboli odoslané reálne, iba vypísané do konzoly.");
      console.log("=== ADMIN EMAIL ===");
      console.log(`To: ${adminEmail}\nSubject: Nový dopyt od ${name}\nBody:\n`, adminHtml);
      console.log(`To: ${email}\nSubject: Potvrdenie dopytu - Steel Shed Forge\nBody:\n`, clientHtml);
      return { success: true, simulated: true };
    }

    try {
      console.log("[Resend] Sending admin email...", { from: senderEmail, to: adminEmail });

      // Send to Admin
      const adminResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [adminEmail],
          subject: `Nový dopyt: ${name} (${params.width}x${params.length}m)`,
          html: adminHtml,
        }),
      });

      const adminBody = await adminResponse.json();
      console.log("[Resend] Admin response:", adminResponse.status, JSON.stringify(adminBody));

      // Send to Client
      console.log("[Resend] Sending client email...", { from: senderEmail, to: email });
      const clientResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [email],
          subject: "Potvrdenie prijatia dopytu — Steel Shed Forge",
          html: clientHtml,
        }),
      });

      const clientBody = await clientResponse.json();
      console.log("[Resend] Client response:", clientResponse.status, JSON.stringify(clientBody));

      const adminOk = adminResponse.ok;
      const clientOk = clientResponse.ok;

      return { success: adminOk && clientOk, simulated: false, adminResult: adminBody, clientResult: clientBody };
    } catch (error) {
      console.error("Chyba pri odosielaní e-mailov cez Resend:", error);
      return { success: false, error: String(error) };
    }
  });

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || "admin123";
    if (data.password && data.password === adminPassword) {
      return { success: true };
    }
    return { success: false };
  });

