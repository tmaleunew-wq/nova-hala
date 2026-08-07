import { createServerFn } from "@tanstack/react-start";
import type { GarageParams } from "./types";

interface InquiryData {
  name: string;
  email: string;
  phone: string;
  message: string;
  params: GarageParams;
  origin: string;
}

export const sendInquiry = createServerFn({ method: "POST" })
  .validator((data: InquiryData) => data)
  .handler(async ({ data }) => {
    const { name, email, phone, message, params, origin } = data;

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "info@steelshedforge.com";
    const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";

    // Build the /vyhodnotenie link containing all query parameters
    const searchParams = new URLSearchParams();
    const keys = Object.keys(params) as (keyof GarageParams)[];
    for (const key of keys) {
      let val = String(params[key]);
      if ((key === "claddingColor" || key === "roofColor" || key === "steelColor" || key === "doorColor" || key === "sectionalDoorColor" || key === "trimmingColor") && val.startsWith("#")) {
        val = val.substring(1);
      }
      searchParams.set(key, val);
    }
    const evaluationUrl = `${origin}/vyhodnotenie?${searchParams.toString()}`;

    // Construct email content for admin
    const adminHtml = `
      <div style="font-family: monospace; padding: 20px; background-color: #0b0f14; color: #f1f5f9; border-radius: 8px;">
        <h2 style="color: #34d399; border-bottom: 1px solid #334155; padding-bottom: 10px;">NOVÝ DOPYT - GARÁŽ</h2>
        
        <p><strong>Meno klienta:</strong> ${name}</p>
        <p><strong>E-mail:</strong> <a href="mailto:${email}" style="color: #34d399;">${email}</a></p>
        <p><strong>Telefón:</strong> ${phone}</p>
        <p><strong>Poznámka:</strong> ${message || "Bez poznámky"}</p>
        
        <h3 style="color: #34d399; margin-top: 20px;">Špecifikácia projektu:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          <li>Rozmer: ${params.width} x ${params.length} x ${params.clearHeight} m</li>
          <li>Strecha: ${params.roofType === "gable" ? "Sedlová" : "Pultová"} (${params.roofPitchDeg}°)</li>
          <li>Opláštenie: ${params.panelType} (Steny: ${params.claddingColor}, Strecha: ${params.roofColor})</li>
          <li>Otvory: Brána ${params.doorWidth}x${params.doorHeight}m, Dvere: ${params.hasPersonalDoor ? "Áno" : "Nie"}, Okná: ${params.hasWindows ? params.windowCount : 0}</li>
          <li>Základová doska: ${params.showFoundation ? "Áno" : "Nie"}</li>
        </ul>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${evaluationUrl}" style="background-color: #34d399; color: #0f172a; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
            OTVORIŤ VYHODNOTENIE A UPRAVIŤ CENY
          </a>
        </div>
      </div>
    `;

    // Construct email content for client
    const clientHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #334155;">
        <h2 style="color: #10b981;">Ďakujeme za váš dopyt!</h2>
        <p>Vážený zákazník ${name},</p>
        <p>úspešne sme zaregistrovali váš dopyt na oceľovú garáž s nasledujúcimi parametrami:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Šírka x Dĺžka</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.width} x ${params.length} m</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Svetlá výška</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.clearHeight} m</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Typ strechy</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.roofType === "gable" ? "Sedlová" : "Pultová"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Opláštenie</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">${params.panelType === "sandwich" ? "Sendvičové panely" : "Trapézový plech"}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Garážová brána</td>
            <td style="padding: 8px; border: 1px solid #e2e8f0;">1x (${params.doorWidth} x ${params.doorHeight} m)</td>
          </tr>
        </table>

        <p>Náš obchodný zástupca pripraví presnú cenovú ponuku a bude vás kontaktovať e-mailom alebo telefonicky.</p>
        <p>S pozdravom,<br/><strong>Tím Steel Shed Forge</strong></p>
      </div>
    `;

    if (!resendApiKey) {
      console.warn("Chýba RESEND_API_KEY. E-maily neboli odoslané reálne, iba vypísané do konzoly.");
      console.log("=== ADMIN EMAIL ===");
      console.log(`To: ${adminEmail}\nSubject: Nový dopyt od ${name}\nBody:\n`, adminHtml);
      console.log(`To: ${email}\nSubject: Potvrdenie dopytu - Steel Shed Forge\nBody:\n`, clientHtml);
      return { success: true, simulated: true };
    }

    try {
      // Send to Admin
      const adminResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: adminEmail,
          subject: `Nový dopyt: ${name} (${params.width}x${params.length}m)`,
          html: adminHtml,
        }),
      });

      // Send to Client
      const clientResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderEmail,
          to: email,
          subject: "Potvrdenie prijatia dopytu — Steel Shed Forge",
          html: clientHtml,
        }),
      });

      const adminOk = adminResponse.ok;
      const clientOk = clientResponse.ok;

      return { success: adminOk && clientOk, simulated: false };
    } catch (error) {
      console.error("Chyba pri odosielaní e-mailov cez Resend:", error);
      return { success: false, error: String(error) };
    }
  });
