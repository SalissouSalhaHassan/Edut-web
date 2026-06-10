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
      await this.logMessage("WHATSAPP", `${studentName} (${whatsappNumber})`, fullMessage, "Envoyé");
      console.log(`[WHATSAPP SENT] to ${whatsappNumber}: ${fullMessage}`);
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
      await this.logMessage("WHATSAPP", `${studentName} (${whatsappNumber})`, fullMessage, "Envoyé");
      console.log(`[WHATSAPP SENT] to ${whatsappNumber}: ${fullMessage}`);
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
