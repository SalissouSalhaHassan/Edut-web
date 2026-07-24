import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { DesignerElement, PageSize, Orientation, PAGE_DIMENSIONS } from "./types";

export async function exportDesignToPDF(elements: DesignerElement[], pageSize: PageSize, orientation: Orientation, name: string) {
  const element = document.querySelector(".bg-grid-pattern") || document.querySelector(".bg-white.shadow-2xl");
  if (!element) return;

  try {
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 3, // High DPI export
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: pageSize.toLowerCase(),
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    doc.save(`${name.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
  } catch (err) {
    console.error("Export PDF error:", err);
  }
}

export async function exportDesignToImage(format: "png" | "jpeg", name: string) {
  const element = document.querySelector(".bg-grid-pattern") || document.querySelector(".bg-white.shadow-2xl");
  if (!element) return;

  try {
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 3,
      useCORS: true,
      backgroundColor: format === "jpeg" ? "#ffffff" : null,
    });

    const imgData = canvas.toDataURL(`image/${format}`, 1.0);
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `${name.replace(/\s+/g, "_")}_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export Image error:", err);
  }
}

export function exportDesignToJSON(elements: DesignerElement[], pageSize: PageSize, orientation: Orientation, name: string) {
  const payload = {
    templateName: name,
    pageSize,
    orientation,
    elements,
    createdAt: new Date().toISOString(),
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `${name.replace(/\s+/g, "_")}_Template.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
