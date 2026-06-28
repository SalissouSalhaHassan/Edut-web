import { db } from "@/infrastructure/database";
import { messageLogs } from "@/infrastructure/database/schema/messaging";

export type MessageChannel = "SMS" | "WHATSAPP" | "EMAIL";

export interface MessagePayload {
  to: string;
  studentName: string;
  status: "Absent" | "En Retard" | "Présent";
  subject?: string;
  date: string;
  whatsapp?: string;
  sendSMS?: boolean;
  sendWhatsApp?: boolean;
}

export class MessagingService {
  static async sendAttendanceAlert(payload: MessagePayload) {
    const { to, studentName, status, subject, date, whatsapp, sendSMS, sendWhatsApp } = payload;
    const subText = subject ? ` (${subject})` : "";
    
    let messageAr = "";
    let messageFr = "";

    if (status === "Absent") {
      messageFr = `Cher Parent, nous vous informons que ${studentName} est ABSENT le ${date}${subText}. Veuillez justifier cette absence. - Edut Pro`;
      messageAr = `عزيزي ولي الأمر، نحيطكم علماً بأن الطالب ${studentName} كان غائباً يوم ${date}${subText}. يرجى توضيح سبب الغياب. - Edut Pro`;
    } else if (status === "En Retard") {
      messageFr = `Cher Parent, ${studentName} est arrivé EN RETARD le ${date}${subText}. Merci de veiller à la ponctualité. - Edut Pro`;
      messageAr = `عزيزي ولي الأمر، لقد وصل الطالب ${studentName} متأخراً يوم ${date}${subText}. يرجى الحرص على المواعيد. - Edut Pro`;
    } else {
      return; // No notification for presence by default
    }

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    // 1. Log and "Send" SMS
    if (sendSMS && to && to !== "N/A") {
      const success = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, success ? "Envoyé" : "Échec");
      console.log(`[SMS ${success ? 'SENT' : 'FAILED'}] to ${to}: ${fullMessage}`);
    }

    // 2. Log and "Send" WhatsApp
    const whatsappNumber = whatsapp || to;
    if (sendWhatsApp && whatsappNumber && whatsappNumber !== "N/A") {
      const success = await this.sendViaWhatsAppAPI(whatsappNumber, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${whatsappNumber})`, fullMessage, success ? "Envoyé" : "Échec");
      console.log(`[WHATSAPP ${success ? 'SENT' : 'FAILED'}] to ${whatsappNumber}: ${fullMessage}`);
    }
  }

  static async sendPaymentReminder(payload: {
    to: string;
    studentName: string;
    balance: number;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, studentName, balance, whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const balanceFormatted = Math.round(balance).toLocaleString("fr-FR");
    
    const messageFr = `Cher Parent, nous vous rappelons que le solde restant des frais de scolarité pour ${studentName} est de ${balanceFormatted} CFA. Veuillez procéder au règlement dans les plus brefs délais. - Edut Pro`;
    const messageAr = `عزيزي ولي الأمر، نود تذكيركم بأن الرصيد المتبقي من الرسوم الدراسية للطالب ${studentName} هو ${balanceFormatted} فرنك غرب أفريقي. يرجى السداد في أقرب وقت. - Edut Pro`;
    
    const fullMessage = `${messageFr}\n\n${messageAr}`;

    // 1. Log and "Send" SMS
    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const success = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, success ? "Envoyé" : "Échec");
      console.log(`[SMS ${success ? 'SENT' : 'FAILED'}] to ${to}: ${fullMessage}`);
    }

    // 2. Log and "Send" WhatsApp
    const whatsappNumber = whatsapp || to;
    if (sendWhatsApp && whatsappNumber && whatsappNumber !== "N/A" && whatsappNumber.trim() !== "") {
      const success = await this.sendViaWhatsAppAPI(whatsappNumber, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${whatsappNumber})`, fullMessage, success ? "Envoyé" : "Échec");
      console.log(`[WHATSAPP ${success ? 'SENT' : 'FAILED'}] to ${whatsappNumber}: ${fullMessage}`);
    }
  }

  private static async sendViaWhatsAppAPI(phone: string, message: string): Promise<boolean> {
    try {
      const token = process.env.WHATSAPP_API_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      if (!token || !phoneNumberId) {
        // Fallback or custom local gateway (e.g. Baileys / Evolution API)
        const localGatewayUrl = process.env.WHATSAPP_GATEWAY_URL || "http://192.168.1.100:9000/send-message";
        const response = await fetch(localGatewayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, message }),
        });
        return response.ok;
      }

      // Meta Cloud API call
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: { body: message }
        }),
      });
      return response.ok;
    } catch (err) {
      console.error("WhatsApp Gateway Error:", err);
      return false;
    }
  }

  private static async sendViaAndroidGateway(phone: string, message: string): Promise<boolean> {
    try {
      // يمكنك تغيير هذا الرابط لاحقاً من ملف .env
      const gatewayUrl = process.env.SMS_GATEWAY_URL || "http://192.168.1.100:8080/send";
      
      // منطق الإرسال عبر طلب HTTP للهاتف
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          message: message,
          // بعض التطبيقات تتطلب رمز أمان (API Key)
          key: process.env.SMS_GATEWAY_KEY || ""
        }),
      });

      return response.ok;
    } catch (err) {
      console.error("SMS Gateway Error:", err);
      return false;
    }
  }

  private static async logMessage(type: MessageChannel, target: string, content: string, status: string = "Envoyé") {
    try {
      await db.insert(messageLogs).values({
        msgType: type,
        targetAudience: target,
        content: content,
        sentBy: "Système Alerte Automatique",
        status: status,
      });
    } catch (err) {
      console.error(`Failed to log ${type} message:`, err);
    }
  }
}
