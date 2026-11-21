// Embed the rendered statement as a high-resolution image so employee names in
// any browser-supported script remain readable without external font downloads.
export function salaryPdfBytes(jpeg, width, height) {
  const encoder = new TextEncoder(), chunks = [], offsets = [0];
  let length = 0;
  const append = (value) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
  const object = (id, value) => { offsets[id] = length; append(`${id} 0 obj\n${value}\nendobj\n`); };
  append("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Statement 4 0 R >> >> /Contents 5 0 R >>");
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg); append("\nendstream\nendobj\n");
  const content = "q\n595.28 0 0 841.89 0 0 cm\n/Statement Do\nQ\n";
  object(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
  const xref = length;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id++) append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const result = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.length; }
  return result;
}

export async function downloadSalaryPdf(slip) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1684; canvas.height = 2382;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to prepare the PDF. Please retry in your browser.");
  ctx.scale(2, 2);
  const text = (value, x, y, size = 13, color = "#35415b", weight = "400", maxWidth = 690) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.fillText(String(value), x, y, maxWidth);
  };
  const box = (x, y, width, height, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
  const money = (value) => `INR ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const month = new Date(`${slip.salary_month.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  box(0, 0, 842, 1191, "#ffffff");
  box(40, 55, 762, 680, "#f3fcfc");
  const border = (x1, y1, x2, y2) => { ctx.strokeStyle = "#39485c"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  border(40,55,802,55); border(40,55,40,735); border(802,55,802,735); border(40,735,802,735);
  ctx.fillStyle = "#08bba9"; ctx.beginPath(); ctx.arc(68, 90, 13, 0, Math.PI * 2); ctx.fill();
  text(slip.school_name, 91, 97, 18, "#19324e", "700", 420);
  text("PAYSLIP FOR", 558, 83, 10, "#8296a5", "600"); text(month.toUpperCase(), 558, 104, 14, "#344458", "700", 225);
  border(40,125,802,125);
  const info = (label, value, x, y) => { text(label, x, y, 12, "#8296a5", "600", 100); text(value, x + 107, y, 13, "#19324e", "700", 225); };
  info("Emp No.", slip.employee_code, 62, 165); info("Designation", "Teacher", 442, 165);
  info("Name", slip.employee_name, 62, 203); info("PF number", slip.pf_number || "Not applicable", 442, 203);
  border(40,230,802,230);
  text("Total days: " + slip.total_days, 62, 258, 12); text("Payable days: " + slip.paid_days, 310, 258, 12); text((slip.attendance_based ? "Unpaid days: " : "LWP days: ") + slip.lwp_days, 580, 258, 12);
  border(40,278,802,278);
  const xs = [40, 270, 421, 651, 802];
  for (const x of xs.slice(1,4)) border(x,278,x,556);
  text("EARNINGS", 57, 304, 12, "#32a960", "700"); text("PER MONTH", 288, 304, 11, "#344458", "700");
  text("DEDUCTIONS", 438, 304, 12, "#ed7045", "700"); text("PER MONTH", 669, 304, 11, "#344458", "700");
  border(40,320,802,320);
  const amount = (value, x, y, color = "#19324e") => { ctx.textAlign = "right"; text(money(value), x, y, 12, color, "600", 133); ctx.textAlign = "left"; };
  text("Basic", 57, 355, 13, "#19324e", "600"); amount(slip.basic_salary, 408, 355);
  text("Allowances", 57, 397, 13, "#19324e", "600"); amount(slip.allowances, 408, 397);
  text("PF", 438, 355, 13, "#19324e", "600"); amount(slip.pf_deduction, 789, 355);
  text("Other deductions", 438, 397, 13, "#19324e", "600"); amount(slip.other_deductions, 789, 397);
  text((slip.attendance_based ? "Unpaid days (" : "Leave without pay (") + slip.lwp_days + " days)", 438, 439, 12, "#19324e", "600", 205); amount(slip.lwp_deduction, 789, 439);
  border(40,510,802,510);
  text("Gross earnings (A)", 57, 538, 12, "#32a960", "700"); amount(slip.gross_salary, 408, 538, "#32a960");
  text("Gross deductions (B)", 438, 538, 12, "#ed7045", "700"); amount(slip.total_deductions, 789, 538, "#ed7045");
  border(40,556,802,556);
  text("Net salary payable (A - B)", 57, 591, 15, "#344458", "700");
  ctx.textAlign = "right"; text(money(slip.net_salary), 780, 593, 24, "#32a960", "700", 300); ctx.textAlign = "left";
  border(40,615,802,615);
  text((slip.attendance_based ? "Basic unpaid-day deduction: " : "LWP deduction: ") + money(slip.attendance_based ? slip.basic_salary : slip.gross_salary) + " / " + slip.total_days + " days x " + slip.lwp_days + " unpaid days = " + money(slip.lwp_deduction), 57, 644, 11, "#718596", "400", 725);
  text("Generated: " + new Date(slip.generated_at).toLocaleDateString("en-IN"), 57, 680, 10, "#8296a5");
  text("Slip ID: " + slip.id, 57, 708, 10, "#8296a5");
  text("Computer-generated salary statement. This document does not confirm a bank transfer.", 40, 775, 10, "#8296a5");
  const encoded = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  const jpeg = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([salaryPdfBytes(jpeg, canvas.width, canvas.height)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url; link.download = `Salary-${slip.employee_code.replace(/[^a-zA-Z0-9_-]/g, "_")}-${slip.salary_month.slice(0, 7)}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
