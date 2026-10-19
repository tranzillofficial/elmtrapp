export async function makePdf(blobs: Blob[], name: string): Promise<File> {
  const filename = `${
    name
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
      .replace(/\.[^.]+$/, "")
      .slice(0, 100) || "document"
  }.pdf`;
  if (blobs.length === 1 && blobs[0].type === "application/pdf")
    return new File(blobs, filename, { type: "application/pdf" });
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ compress: true });
  for (let i = 0; i < blobs.length; i++) {
    if (!blobs[i].type.startsWith("image/"))
      throw new Error("لا يمكن تحويل هذا النوع إلى PDF");
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blobs[i]);
    } catch {
      throw new Error("تعذر قراءة الصورة؛ أعد رفع صورة صالحة");
    }
    try {
      if (bitmap.width * bitmap.height > 60000000)
        throw new Error("الصورة كبيرة جدًا؛ استخدم صورة أصغر");
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("تعذر تجهيز الصورة");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (i) pdf.addPage();
      const ratio = Math.min(190 / canvas.width, 277 / canvas.height);
      const w = canvas.width * ratio,
        h = canvas.height * ratio;
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.9),
        "JPEG",
        (210 - w) / 2,
        (297 - h) / 2,
        w,
        h,
      );
      canvas.width = canvas.height = 0;
    } finally {
      bitmap.close();
    }
  }
  return new File([pdf.output("blob")], filename, { type: "application/pdf" });
}
