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

  static async sendPaymentReceiptWhatsApp(payload: {
    to: string;
    studentName: string;
    amountPaid: number;
    receiptNumber?: string;
    remainingBalance: number;
    schoolName?: string;
    receiptUrl?: string;
    whatsapp?: string;
  }) {
    const { to, studentName, amountPaid, receiptNumber, remainingBalance, schoolName, receiptUrl, whatsapp } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const amountFmt = Math.round(amountPaid).toLocaleString("fr-FR");
    const balFmt = Math.round(remainingBalance).toLocaleString("fr-FR");
    const school = schoolName || "Edut Pro";
    const recNo = receiptNumber ? ` (Reçu N° ${receiptNumber})` : "";
    const linkText = receiptUrl ? `\n\n📄 Télécharger le reçu officiel : ${receiptUrl}` : "";

    const messageFr = `✅ *Confirmation de Paiement - ${school}*\n\nCher Parent, nous confirmons la réception d'un paiement de *${amountFmt} CFA* pour l'élève *${studentName}*${recNo}.\n\nSolde restant : *${balFmt} CFA*.${linkText}\n\nMerci pour votre confiance.`;
    const messageAr = `✅ *تأكيد استلام الدفعة - ${school}*\n\nعزيزي ولي الأمر، نؤكد استلام مبلغ *${amountFmt} فرنك* لصالح التلميذ *${studentName}*${recNo}.\n\nالرصيد المتبقي : *${balFmt} فرنك*.\n\nشكراً لثقتكم بنا.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;
    const success = await this.sendViaWhatsAppAPI(phone, fullMessage);
    await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, success ? "Envoyé" : "Échec");
    return success;
  }

  static async sendBulletinPublishedWhatsApp(payload: {
    to: string;
    studentName: string;
    periodName: string;
    generalAverage?: number;
    rank?: string;
    bulletinUrl?: string;
    schoolName?: string;
    whatsapp?: string;
  }) {
    const { to, studentName, periodName, generalAverage, rank, bulletinUrl, schoolName, whatsapp } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const school = schoolName || "Edut Pro";
    const avgText = generalAverage !== undefined ? `\nMoyenne générale : *${generalAverage.toFixed(2)}/20*` : "";
    const rankText = rank ? ` (Rang : *${rank}*)` : "";
    const linkText = bulletinUrl ? `\n\n📊 Consulter le bulletin en ligne : ${bulletinUrl}` : "";

    const messageFr = `🎓 *Publication du Bulletin Scolaire - ${school}*\n\nCher Parent, le bulletin de notes de *${studentName}* pour la période *${periodName}* est désormais disponible.${avgText}${rankText}${linkText}\n\nL'administration reste à votre disposition.`;
    const messageAr = `🎓 *صدور كشف النقاط - ${school}*\n\nعزيزي ولي الأمر، كشف نقاط التلميذ *${studentName}* للفترة *${periodName}* متوفر الآن.${avgText}${rankText}\n\nمع تحيات إدارة المؤسسة.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;
    const success = await this.sendViaWhatsAppAPI(phone, fullMessage);
    await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, success ? "Envoyé" : "Échec");
    return success;
  }

  static async sendInfirmaryAlert(payload: {
    to: string;
    studentName: string;
    symptoms: string;
    temperature?: number | null;
    severity?: string;
    outcome?: string;
    careProvided?: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, studentName, symptoms, temperature, severity = "Modéré", outcome = "Retour en classe", careProvided, schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const tempText = temperature ? ` (Température : ${temperature}°C)` : "";
    const careText = careProvided ? `\nSoins prodigués : ${careProvided}` : "";
    const isUrgent = severity.toLowerCase().includes("urgent");
    const headerEmoji = isUrgent ? "🚨" : "🏥";

    const messageFr = `${headerEmoji} *Avis Infirmerie Scolaire - ${schoolName}*\n\nCher Parent, nous vous informons que votre enfant *${studentName}* a été admis à l'infirmerie ce jour.\n• Symptômes : *${symptoms}*${tempText}\n• Gravité : *${severity}*\n• Décision : *${outcome}*${careText}\n\n${isUrgent ? "⚠️ Merci de contacter l'école ou de venir récupérer l'élève si nécessaire." : "L'équipe médicale scolaire veille sur sa santé."}`;
    const messageAr = `${headerEmoji} *تنبيه من العيادة المدرسية - ${schoolName}*\n\nعزيزي ولي الأمر، نحيطكم علماً بأن التلميذ *${studentName}* قد توجه إلى العيادة المدرسية اليوم.\n• الأعراض : *${symptoms}*${tempText}\n• الحالة : *${severity}*\n• الإجراء : *${outcome}*\n\nنتمنى له دوام الصحة والعافية.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendDisciplineSanctionAlert(payload: {
    to: string;
    studentName: string;
    incidentType: string;
    sanctionType: string;
    severity?: string;
    durationDays?: number;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, studentName, incidentType, sanctionType, severity = "Majeur", durationDays, schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const durationText = durationDays && durationDays > 0 ? ` (Durée : ${durationDays} jour${durationDays > 1 ? 's' : ''})` : "";
    const isCritical = severity.toLowerCase().includes("critique") || sanctionType.toLowerCase().includes("exclusion");
    const emoji = isCritical ? "🚨" : "⚠️";

    const messageFr = `${emoji} *Avis Disciplinaire - ${schoolName}*\n\nCher Parent, nous vous informons que votre enfant *${studentName}* a fait l'objet d'une mesure disciplinaire ce jour.\n• Motif : *${incidentType}*\n• Sanction prononcée : *${sanctionType}*${durationText}\n\nL'administration vous prie de sensibiliser votre enfant au respect du règlement intérieur de l'établissement.`;
    const messageAr = `${emoji} *إشعار انضباطي وسلوكي - ${schoolName}*\n\nعزيزي ولي الأمر، نحيطكم علماً بأنه قد تم اتخاذ إجراء تأديبي بحق التلميذ *${studentName}* اليوم.\n• المخالفة : *${incidentType}*\n• العقوبة المطبقة : *${sanctionType}*${durationText}\n\nيرجى حث التلميذ على الالتزام بالنظام الداخلي للمؤسسة.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendParentConvocationAlert(payload: {
    to: string;
    studentName: string;
    reason: string;
    convocationDate: string;
    location?: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, studentName, reason, convocationDate, location = "Bureau du Censeur / Surveillant Général", schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const messageFr = `📋 *Convocation des Parents - ${schoolName}*\n\nCher Parent, vous êtes instamment prié(e) de vous présenter à l'établissement concernant votre enfant *${studentName}*.\n• Date & Heure : *${convocationDate}*\n• Lieu : *${location}*\n• Motif : *${reason}*\n\nVotre présence est indispensable pour le suivi de l'élève. Merci de votre ponctualité.`;
    const messageAr = `📋 *استدعاء رسمي لولي الأمر - ${schoolName}*\n\nعزيزي ولي الأمر، يرجى الحضور إلى إدارة المؤسسة بخصوص التلميذ *${studentName}*.\n• الموعد : *${convocationDate}*\n• المكان : *${location}*\n• السبب : *${reason}*\n\nحضوركم ضروري لمتابعة التلميذ.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendAdmissionReceivedAlert(payload: {
    to: string;
    parentName: string;
    studentName: string;
    applicationNumber: string;
    targetClass: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, parentName, studentName, applicationNumber, targetClass, schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const messageFr = `📝 *Dossier d'Admission Reçu - ${schoolName}*\n\nCher(e) ${parentName}, nous accusons bonne réception de la demande d'inscription pour l'élève *${studentName}* en classe de *${targetClass}*.\n• N° de dossier : *${applicationNumber}*\n• Statut : *En cours d'examen*\n\nLa commission pédagogique examine les pièces fournies. Vous serez notifié(e) par ce même canal de la suite accordée.`;
    const messageAr = `📝 *تأكيد استلام طلب التسجيل - ${schoolName}*\n\nعزيزي ولي الأمر ${parentName}، تم استلام طلب تسجيل التلميذ *${studentName}* في فصل *${targetClass}* بنجاح.\n• رقم الملف : *${applicationNumber}*\n• الحالة : *قيد الدراسة والمراجعة*\n\nسيتم إشعاركم فور اتخاذ القرار النهائي من الإدارة.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendAdmissionApprovedAlert(payload: {
    to: string;
    parentName: string;
    studentName: string;
    matricule: string;
    targetClass: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, parentName, studentName, matricule, targetClass, schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const messageFr = `🎉 *FÉLICITATIONS ! Admission Accordée - ${schoolName}*\n\nCher(e) ${parentName}, nous avons le grand plaisir de vous informer que l'élève *${studentName}* a été officiellement *ADMIS(E)* en classe de *${targetClass}* !\n• Matricule Officiel attribué : *${matricule}*\n\nVous pouvez dès à présent finaliser l'inscription et le paiement des frais de scolarité via Mobile Money sur l'application Edut.\nBienvenue dans notre communauté éducative ! 🌟`;
    const messageAr = `🎉 *تهانينا ! تم قبول طلب التسجيل - ${schoolName}*\n\nعزيزي ولي الأمر ${parentName}، يسرنا إعلامكم بقبول التلميذ *${studentName}* رسمياً في فصل *${targetClass}* !\n• رقم القيد الرسمي (Matricule) : *${matricule}*\n\nيمكنكم استكمال إجراءات التسجيل وتسديد الرسوم المدرسية عبر تطبيق Edut.\nأهلاً بكم في مؤسستنا ! 🌟`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendHrRequestDecisionAlert(payload: {
    to: string;
    employeeName: string;
    requestType: string;
    decision: string; // 'Approuvé' | 'Rejeté'
    adminComment?: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, employeeName, requestType, decision, adminComment, schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const isApproved = decision.toLowerCase().includes("approuv") || decision.toLowerCase().includes("accord");
    const emoji = isApproved ? "✅" : "⚠️";
    const commentText = adminComment ? `\n• Remarque Direction : *${adminComment}*` : "";

    const messageFr = `${emoji} *Décision RH - ${schoolName}*\n\nBonjour M./Mme *${employeeName}*,\nVotre demande de *${requestType}* a été *${decision.toUpperCase()}* par l'administration.${commentText}\n\nConsultez votre espace personnel RH pour les détails.`;
    const messageAr = `${emoji} *إشعار الموارد البشرية - ${schoolName}*\n\nمرحباً بالأستاذ/الموظف *${employeeName}*،\nتم *${decision}* طلبكم المتعلق بـ *${requestType}* من قبل الإدارة.${commentText}\n\nيمكنكم مراجعة بوابتكم الذاتية للاطلاع على التفاصيل.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${employeeName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${employeeName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendHostelNightAbsenceAlert(payload: {
    to: string;
    parentName: string;
    studentName: string;
    roomNumber: string;
    buildingName: string;
    date: string;
    time?: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, parentName, studentName, roomNumber, buildingName, date, time = "21:30", schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    const messageFr = `⚠️ *ALERTE INTERNAT - Absence Nocturne Inexpliquée*\n\nCher(e) ${parentName},\nLors de l'appel du soir du *${date}* à *${time}*, l'élève *${studentName}* (Chambre ${roomNumber}, Pavillon ${buildingName}) a été constaté *ABSENT(E)* du dortoir sans autorisation préalable.\n\nMerci de contacter d'urgence la surveillance générale de l'internat de ${schoolName}.`;
    const messageAr = `⚠️ *تنبيه أمني - السكن الداخلي (${schoolName})*\n\nعزيزي ولي الأمر ${parentName}،\nأثناء تفقد الحضور الليلي بتاريخ *${date}* الساعة *${time}*، تبين *غياب* التلميذ *${studentName}* (الغرفة ${roomNumber}، مبنى ${buildingName}) دون إذن مسبق.\n\nيرجى التواصل الفوري والعاجل مع إدارة السكن الداخلي.`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static async sendHostelExitAlert(payload: {
    to: string;
    parentName: string;
    studentName: string;
    permissionType: string;
    status: "Sorti" | "Retourné" | "Approuvé";
    departureDate?: string;
    returnDateExpected?: string;
    time?: string;
    schoolName?: string;
    whatsapp?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }) {
    const { to, parentName, studentName, permissionType, status, departureDate, returnDateExpected, time = "17:00", schoolName = "Edut Pro", whatsapp, sendSMS = true, sendWhatsApp = true } = payload;
    const phone = whatsapp || to;
    if (!phone || phone === "N/A" || phone.trim() === "") return false;

    let messageFr = "";
    let messageAr = "";

    if (status === "Sorti") {
      messageFr = `🚪 *INTERNAT : Départ de l'Élève - ${schoolName}*\n\nCher(e) ${parentName},\nVotre enfant *${studentName}* vient de quitter l'internat ce jour à *${time}* dans le cadre d'une *${permissionType}*.\n• Retour attendu au dortoir : *${returnDateExpected || "Dimanche soir"}*.`;
      messageAr = `🚪 *السكن الداخلي : تسجيل مغادرة الطالب - ${schoolName}*\n\nعزيزي ولي الأمر ${parentName}،\nغادر التلميذ *${studentName}* السكن الداخلي اليوم الساعة *${time}* بتصريح *${permissionType}*.\n• موعد العودة المتوقع : *${returnDateExpected || "مساء الأحد"}*.`;
    } else if (status === "Retourné") {
      messageFr = `✅ *INTERNAT : Retour Sécurisé - ${schoolName}*\n\nCher(e) ${parentName},\nNous vous confirmons que votre enfant *${studentName}* est bien rentré(e) et réintégré(e) au dortoir de l'internat ce jour à *${time}* en toute sécurité.`;
      messageAr = `✅ *السكن الداخلي : عودة سالمة - ${schoolName}*\n\nعزيزي ولي الأمر ${parentName}،\nنحيطكم علماً بوصول وعودة التلميذ *${studentName}* إلى غرفته بالسكن الداخلي بسلام وأمان اليوم الساعة *${time}*.`;
    } else {
      messageFr = `📋 *INTERNAT : Autorisation de Sortie Accordée - ${schoolName}*\n\nCher(e) ${parentName},\nLa demande de *${permissionType}* pour l'élève *${studentName}* du *${departureDate}* au *${returnDateExpected}* a été *VALIDÉE* par la direction.`;
      messageAr = `📋 *السكن الداخلي : الموافقة على تصريح الخروج - ${schoolName}*\n\nعزيزي ولي الأمر ${parentName}،\nتمت *الموافقة* على تصريح *${permissionType}* للتلميذ *${studentName}* للفترة من *${departureDate}* إلى *${returnDateExpected}*.`;
    }

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  // ─── 8. Transport & Boarding Alerts ─────────────────────────────────────────

  static async sendTransportBoardingAlert(data: {
    to?: string;
    whatsapp?: string;
    parentName?: string;
    studentName: string;
    eventType: string; // 'Montée Matin', 'Descente Matin (École)', 'Montée Soir (École)', 'Descente Soir (Maison)'
    routeName: string;
    vehicleNumber: string;
    time: string;
    stopName?: string;
    schoolName?: string;
    sendSMS?: boolean;
    sendWhatsApp?: boolean;
  }): Promise<boolean> {
    const {
      to,
      whatsapp,
      parentName = "Parent d'élève",
      studentName,
      eventType,
      routeName,
      vehicleNumber,
      time,
      stopName = "Arrêt désigné",
      schoolName = "Edut Pro",
      sendSMS = true,
      sendWhatsApp = true,
    } = data;

    const phone = (whatsapp || to)?.replace(/[^0-9+]/g, "");
    if (!phone && !to) return false;

    let eventDescriptionFr = "";
    let eventDescriptionAr = "";

    if (eventType.includes("Montée Matin")) {
      eventDescriptionFr = `est *monté(e) dans le bus scolaire* (${vehicleNumber}, ${routeName}) à l'arrêt *${stopName}* à *${time}*. Trajet vers l'école en cours.`;
      eventDescriptionAr = `قد *صعد(ت) إلى حافلة النقل المدرسي* (${vehicleNumber} - ${routeName}) عند المحطة *${stopName}* في تمام الساعة *${time}*، والحافلة في طريقها للمدرسة.`;
    } else if (eventType.includes("Descente Matin") || eventType.includes("École")) {
      eventDescriptionFr = `est *bien arrivé(e) et descendu(e) à l'école* sécuritairement à *${time}*.`;
      eventDescriptionAr = `قد *وصل(ت) بسلام ونزل(ت) داخل حرم المدرسة* في تمام الساعة *${time}*.`;
    } else if (eventType.includes("Montée Soir")) {
      eventDescriptionFr = `a *embarqué dans le bus de retour* (${vehicleNumber}, ${routeName}) à *${time}*. En route pour le domicile.`;
      eventDescriptionAr = `قد *ركب(ت) حافلة العودة المدرسية* (${vehicleNumber} - ${routeName}) في تمام الساعة *${time}* متوجهاً نحو المنزل.`;
    } else {
      eventDescriptionFr = `a *été déposé(e) à l'arrêt* (${stopName}) en toute sécurité à *${time}*.`;
      eventDescriptionAr = `تم *إنزاله(ا) بسلام عند محطة التوقف* (${stopName}) في تمام الساعة *${time}*.`;
    }

    const messageFr = `🚌 *[${schoolName} - Transport Scolaire]*\nBonjour M./Mme ${parentName},\nNous vous informons que votre enfant *${studentName}* ${eventDescriptionFr}`;
    const messageAr = `🚌 *[النقل المدرسي - ${schoolName}]*\nعزيزي ولي الأمر ${parentName}،\nنحيطكم علماً بأن ابنكم/ابنتكم *${studentName}* ${eventDescriptionAr}`;

    const fullMessage = `${messageFr}\n\n${messageAr}`;

    if (sendSMS && to && to !== "N/A" && to.trim() !== "") {
      const smsSuccess = await this.sendViaAndroidGateway(to, fullMessage);
      await this.logMessage("SMS", `${studentName} (${to})`, fullMessage, smsSuccess ? "Envoyé" : "Échec");
    }

    if (sendWhatsApp && phone) {
      const waSuccess = await this.sendViaWhatsAppAPI(phone, fullMessage);
      await this.logMessage("WHATSAPP", `${studentName} (${phone})`, fullMessage, waSuccess ? "Envoyé" : "Échec");
    }

    return true;
  }

  static generateWhatsAppShareUrl(phone: string, text: string): string {
    const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    const encodedText = encodeURIComponent(text);
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
  }

  public static async sendViaWhatsAppAPI(phone: string, message: string): Promise<boolean> {
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
