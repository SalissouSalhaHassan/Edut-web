import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PrintOptions, DocumentData } from '../types';

// Canvas pool for reuse to avoid memory leaks
const canvasPool: HTMLCanvasElement[] = [];
const MAX_POOL_SIZE = 5;

function getCanvas(): HTMLCanvasElement {
  return canvasPool.pop() || document.createElement('canvas');
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  if (canvasPool.length < MAX_POOL_SIZE) {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    canvasPool.push(canvas);
  }
}

export class PDFGenerator {
  private doc: jsPDF;
  private options: PrintOptions;

  constructor(options: PrintOptions) {
    this.options = options;
    this.doc = new jsPDF({
      orientation: options.orientation.toLowerCase() as 'p' | 'l',
      unit: 'mm',
      format: options.format === 'Ticket' ? [80, 297] : options.format.toLowerCase(),
    });
  }

  private async loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = getCanvas();
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        releaseCanvas(canvas);
        resolve(dataUrl);
      };
      img.onerror = (e) => {
        reject(e);
      };
      
      // Cleanup on error
      img.onload = img.onload || (() => {});
    });
  }

  private async loadTransparentImage(url: string, opacity: number = 0.08): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = getCanvas();
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0);
        }
        const dataUrl = canvas.toDataURL('image/png');
        releaseCanvas(canvas);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve("");
      };
      img.onload = img.onload || (() => {});
    });
  }

  public async generate(data: DocumentData): Promise<string> {
    const { type, payload } = data;

    switch (type) {
      case 'PaymentReceipt':
        await this.drawReceipt(payload);
        break;
      case 'StudentCard':
        await this.drawStudentCard(payload);
        break;
      // Add other cases here
      default:
        console.warn(`No generator for document type: ${type}`);
    }

    if (this.options.showWatermark) {
      this.addWatermark();
    }

    return this.doc.output('dataurlstring');
  }

  private addWatermark() {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setTextColor(240, 240, 240);
      this.doc.setFontSize(60);
      this.doc.text('OFFICIEL', 105, 148, {
        align: 'center',
        angle: 45,
      });
    }
  }

  private async drawReceipt(payload: any) {
    const { school, payment, student } = payload;
    
    // Header
    this.doc.setFontSize(14);
    this.doc.setTextColor(40, 44, 52);
    this.doc.text(school.name.toUpperCase(), 105, 15, { align: 'center' });
    
    this.doc.setFontSize(10);
    this.doc.text(`Tel: ${school.phone} | Email: ${school.email}`, 105, 22, { align: 'center' });
    
    this.doc.line(10, 25, 200, 25);
    
    // Draw School Logo Watermark in background
    if (school.logoPath) {
      try {
        const logoWatermark = await this.loadTransparentImage(school.logoPath, 0.06);
        if (logoWatermark) {
          this.doc.addImage(logoWatermark, 'PNG', 55, 60, 100, 100);
        }
      } catch (e) {
        console.warn("Failed to load logo watermark for receipt:", e);
      }
    }
    
    // Receipt Content
    this.doc.setFontSize(16);
    this.doc.text('REÇU DE PAIEMENT', 105, 35, { align: 'center' });

    // Draw QR Code
    try {
      const qrData = `RECU: ${payment.reference} | ELEVE: ${student.name} | CLASSE: ${student.class} | MONTANT: ${payment.amount} F CFA | DATE: ${payment.date}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      const qrBase64 = await this.loadImage(qrUrl);
      this.doc.addImage(qrBase64, 'PNG', 170, 30, 25, 25);
    } catch (e) {
      console.warn("Failed to load QR code for PaymentReceipt:", e);
    }
    
    this.doc.setFontSize(12);
    this.doc.text(`Référence: ${payment.reference}`, 20, 50);
    this.doc.text(`Date: ${payment.date}`, 150, 50);
    
    this.doc.text(`Étudiant: ${student.name}`, 20, 65);
    this.doc.text(`Classe: ${student.class}`, 20, 72);
    
    // Table
    (this.doc as any).autoTable({
      startY: 85,
      head: [['Description', 'Montant']],
      body: [
        [payment.description || 'Frais de scolarité', `${payment.amount} F CFA`],
        ['Réduction', `${payment.reduction || 0} F CFA`],
        ['Total Payé', `${payment.amount - (payment.reduction || 0)} F CFA`],
      ],
      theme: 'striped',
      headStyles: { fillGray: 40, textColor: 255 },
    });
  }

  private async drawStudentCard(payload: any) {
    const { student, school, primaryColor = '#1e3a8a' } = payload;
    const W = 54;
    const H = 86;
    const x = 78; // Center on A4 for single card or handle batch
    const y = 20;

    // Background & Border
    this.doc.setDrawColor(primaryColor);
    this.doc.setLineWidth(0.5);
    this.doc.rect(x, y, W, H);
    
    // Header
    this.doc.setFillColor(primaryColor);
    this.doc.rect(x, y, W, 14, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(school.name.toUpperCase(), x + W / 2, y + 8, { align: 'center', maxWidth: W - 10 });
    
    // Photo Placeholder
    const phW = 22;
    const phH = 26;
    const px = x + (W - phW) / 2;
    const py = y + 18;
    this.doc.setDrawColor(200);
    this.doc.rect(px, py, phW, phH);
    this.doc.setFontSize(6);
    this.doc.setTextColor(200);
    this.doc.text('PHOTO', px + phW / 2, py + phH / 2, { align: 'center' });
    
    // Student Info
    this.doc.setTextColor(0);
    this.doc.setFontSize(10);
    this.doc.text(student.name.toUpperCase(), x + W / 2, py + phH + 6, { align: 'center' });
    
    this.doc.setDrawColor(primaryColor);
    this.doc.line(x + 5, py + phH + 8, x + W - 5, py + phH + 8);
    
    this.doc.setFontSize(7);
    this.doc.text(`ID: ${student.id}`, x + 5, py + phH + 14);
    this.doc.text(`CLASSE: ${student.class}`, x + 5, py + phH + 19);

    // Draw QR Code
    try {
      const qrData = student.numAdmission || student.id || "";
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      const qrBase64 = await this.loadImage(qrUrl);
      this.doc.addImage(qrBase64, 'PNG', x + W - 17, py + phH + 10, 12, 12);
    } catch (e) {
      console.warn("Failed to load QR code for StudentCard:", e);
    }
    
    // Footer
    this.doc.setFillColor(primaryColor);
    this.doc.rect(x, y + H - 8, W, 8, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(`ANNÉE: ${payload.year || '2024-2025'}`, x + W / 2, y + H - 3, { align: 'center' });
  }

  private drawSchoolReport(payload: any) {
    const { student, school, results, stats } = payload;
    
    // Header (A4)
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(school.name.toUpperCase(), 105, 15, { align: 'center' });
    
    this.doc.setFontSize(10);
    this.doc.text(`BULLETIN DE NOTES - ${payload.term.toUpperCase()}`, 105, 22, { align: 'center' });
    
    this.doc.setLineWidth(0.5);
    this.doc.line(10, 25, 200, 25);
    
    // Student Info Box
    this.doc.setFontSize(11);
    this.doc.text(`NOM: ${student.name}`, 15, 35);
    this.doc.text(`CLASSE: ${student.class}`, 150, 35);
    
    // Results Table
    (this.doc as any).autoTable({
      startY: 45,
      head: [['DISCIPLINES', 'MOY/20', 'COEF', 'MOY x COEF', 'RANG', 'APPRÉCIATION']],
      body: results.map((r: any) => [
        r.subject,
        r.moy,
        r.coef,
        (r.moy * r.coef).toFixed(2),
        r.rank,
        r.appreciation
      ]),
      theme: 'grid',
      headStyles: { fillGray: 50, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });
    
    const finalY = (this.doc as any).lastAutoTable.finalY;
    
    // Stats Summary
    this.doc.setFontSize(10);
    this.doc.rect(15, finalY + 10, 180, 20);
    this.doc.text(`MOYENNE GÉNÉRALE: ${stats.average}/20`, 20, finalY + 18);
    this.doc.text(`RANG: ${stats.rank} sur ${stats.total}`, 100, finalY + 18);
    this.doc.text(`DÉCISION: ${stats.decision}`, 20, finalY + 25);
  }
}