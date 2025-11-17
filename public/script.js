/* public/script.js
   IVS Admission Form — signature pad + PDF export + print + WhatsApp (app) share
*/
document.addEventListener("DOMContentLoaded", () => {
  initSignaturePad();
  wireButtons();
  initSingleGradeSelect();

  // ✅ تھوڑا زیادہ delay تاکہ DOM مکمل load ہو جائے
  setTimeout(() => {
    autoFillRegDate();
  }, 1500);
});

// ✅ یہ function add کرنا ضروری ہے تاکہ error ختم ہو
function initSingleGradeSelect() {
  // اگر grade selection کا کوئی code نہیں ہے، تو فی الحال کچھ مت کریں
  return;
}
/* ---------- NEW: Auto-fill DATE OF REGISTRATION (MM/DD/YYYY boxes) ---------- */
function autoFillRegDate() {
  const container = document.getElementById("regBoxes");
  if (!container) return;

  const boxes = Array.from(container.querySelectorAll(".box"));
  if (!boxes.length) return;

  const anyFilled = boxes.some(b => (b.value || "").trim() !== "");
  if (anyFilled) return;

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = String(now.getFullYear());

  const seq = (mm + dd + yyyy).split("");
  boxes.forEach((b, i) => { if (i < seq.length) b.value = seq[i]; });

  const hidden = document.getElementById("regDate");
  if (hidden) hidden.value = `${yyyy}-${mm}-${dd}`;
}

/* ---------- 1) SIGNATURE PAD (mouse + touch) ---------- */
let sigCanvas, sigCtx, isDrawing = false, lastPoint = null;

function initSignaturePad() {
  sigCanvas = document.getElementById("sig");
  if (!sigCanvas) return;

  sigCtx = sigCanvas.getContext("2d");
  sigCtx.lineWidth = 2;
  sigCtx.lineCap  = "round";
  sigCtx.strokeStyle = "#0f172a";

  const getPos = (e) => {
    const t = e.touches ? e.touches[0] : e;
    const r = sigCanvas.getBoundingClientRect();
    return {
      x: (t.clientX - r.left) * (sigCanvas.width  / r.width),
      y: (t.clientY - r.top)  * (sigCanvas.height / r.height)
    };
  };

  const start = (e) => { isDrawing = true; lastPoint = getPos(e); e.preventDefault(); };
  const move  = (e) => {
    if (!isDrawing) return;
    const p = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(lastPoint.x, lastPoint.y);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    lastPoint = p;
    e.preventDefault();
  };
  const end   = () => { isDrawing = false; lastPoint = null; };

  sigCanvas.addEventListener("mousedown", start);
  sigCanvas.addEventListener("mousemove", move);
  document.addEventListener("mouseup", end);

  sigCanvas.addEventListener("touchstart", start, { passive: false });
  sigCanvas.addEventListener("touchmove", move,   { passive: false });
  sigCanvas.addEventListener("touchend", end);

  const clr = document.getElementById("clearSig");
  if (clr) clr.addEventListener("click", () => {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  });
}

/* ---------- 2) BUTTON: PDF  ---------- */
const SCHOOL_WHATSAPP = "923355245551";

function wireButtons() {
  const pdfBtn = document.getElementById("btnPdf");
  if (pdfBtn) pdfBtn.addEventListener("click", () => exportPdfAndOpenWhatsAppApp());
}

/* Utility for signature if needed elsewhere */
function getSignatureDataURL() {
  if (!sigCanvas) return "";
  const blank = document.createElement("canvas");
  blank.width = sigCanvas.width;
  blank.height = sigCanvas.height;
  if (sigCanvas.toDataURL() === blank.toDataURL()) return "";
  return sigCanvas.toDataURL("image/png");
}

/* ---------- 3) Build PDF from .page elements ---------- */
async function buildPdfFromPages() {
  const { jsPDF } = window.jspdf;
  const pages = Array.from(document.querySelectorAll(".page"));
  if (!pages.length) return null;

  document.body.classList.add("pdf-export");
  const infoBar = document.querySelector(".info-bar");
  const prevBarDisp = infoBar ? infoBar.style.display : null;
  if (infoBar) infoBar.style.display = "none";

  await Promise.all(
    Array.from(document.images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(res => { img.onload = img.onerror = res; });
    })
  );

  const pdf = new jsPDF("p", "pt", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const M = 18;

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];
    const canvas = await html2canvas(el, {
      scale: 2.2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 980,
      scrollX: 0,
      scrollY: 0
    });

    const img = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, 595, 842);
  }

  if (infoBar) infoBar.style.display = prevBarDisp || "";
  document.body.classList.remove("pdf-export");

  const filename = `IVS-Admission-${new Date().toISOString().slice(0,10)}.pdf`;
  return { pdf, filename };
}

/* ---------- 4) Send Data + Export PDF + WhatsApp ---------- */
async function exportPdfAndOpenWhatsAppApp() {
  
  // ✅ پہلے فارم کا ڈیٹا سرور پر بھیجیں تاکہ n8n webhook تک پہنچے
  // await sendFormDataToServer();

  // پھر PDF بنائیں اور WhatsApp پر شئیر کریں
  const built = await buildPdfFromPages();
  if (!built) return;
  const { pdf, filename } = built;

  const blob = pdf.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  const student = document.getElementById("studentName")?.value?.trim() || "student";
  const caption =
    `IVS Tuition Form for ${student}\nSession: 2025–26\n\nPlease review the attached PDF. Thank you.`;

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "IVS Tuition Form", text: caption });
      try { pdf.save(filename); } catch {}
      return;
    }
  } catch (err) {
    console.warn("Native share failed:", err);
  }

  try { pdf.save(filename); } catch {}
  const helper = `Assalamu Alaikum. I have saved my tuition form PDF (${filename}). I will attach the file here and send.`;
  const deepLink = `whatsapp://send?text=${encodeURIComponent(helper)}`;
  window.location.href = deepLink;

  setTimeout(() => {
    alert("If WhatsApp didn’t open automatically, please open the WhatsApp app and attach the saved PDF from your downloads.");
  }, 1200);
}

/* ---------- 5) Send Form Data to n8n Webhook ---------- */
// async function sendFormDataToServer() {
//   const studentName = document.getElementById("studentName")?.value || "";
//   const fatherName = document.getElementById("fatherName")?.value || "";
//   const fatherOccupation = document.getElementById("fOcc")?.value || "";
//   const dob = document.getElementById("dob")?.value || "";
//   const gender = document.querySelector('input[name="gender"]:checked')?.value || "";
//   const religion = document.getElementById("religion")?.value || "";
//   const nationality = document.getElementById("nation")?.value || "";
//   const guardianWhatsapp = document.getElementById("guardianWhatsapp")?.value || "";
//   const CnicOrPassport = document.getElementById("guardianId")?.value || "";
//   const regDate = document.getElementById("regDate")?.value || "";
//   const grade = document.getElementById("grade")?.value || "";
//   const addr = document.getElementById("addr")?.value || "";
//   const city = document.getElementById("city")?.value || "";
//   const state = document.getElementById("state")?.value || "";
//   const zip = document.getElementById("zip")?.value || "";
//   const gContact = document.getElementById("gContact")?.value || "";
//   const sContact = document.getElementById("sContact")?.value || "";

//   const subjects = Array.from(document.querySelectorAll('input[name="subjects"]:checked'))
//     .map(el => el.value)
//     .join(", ");

//   const signatureDataUrl = getSignatureDataURL(); // اگر یہ تمہارے پاس define ہے تو ٹھیک

//   try {
//     const response = await fetch("------------------------------------------------------------", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         studentName,
//         fatherName,
//         fatherOccupation,
//         dob,
//         gender,
//         religion,
//         nationality,
//         guardianWhatsapp,
//         CnicOrPassport,
//         grade,
//         subjects,
//         addr,
//         city,
//         state,
//         zip,
//         gContact,
//         sContact,
//         regDate,
//         signatureDataUrl
//       }),
//     });

//     console.log("📤 Data sent to n8n:", await response.text());
//     alert("Form submitted successfully!");
//   } catch (err) {
//     console.error("⚠️ Error sending data to n8n:", err);
//   }
// }
/* ---------- LIVE INVOICE AUTO-FILL (updates while user fills page 1) ---------- */

const gradeFee = {
  "KG-1": 120, "KG-2": 120,
  "Grade 1": 120, "Grade 2": 120,
  "Grade 3": 130, "Grade 4": 130,
  "Grade 5": 130, "Grade 6": 130, "Grade 7": 130,
  "Grade 8(Fed)": 140, "Grade 9(Fed)": 140,
  "Grade 10(Fed)": 150, "Grade 11(Fed)": 150, "Grade 12(Fed)": 150,
  "Grade 8(IGCSE)": 180,
  "Grade 9(IGCSE)": 250, "Grade 10(IGCSE)": 250,
  "Grade 11(IGCSE)": 250, "Grade 12(IGCSE)": 250
};

// 🔹 حساب لگانے والا فنکشن
function calculateFee(grade, selectedSubjects) {
  const selectedCount = selectedSubjects.length;
  const fee = gradeFee[grade] || 0;
  const total = fee * selectedCount; // multiply per subject
  return total;
}
// 🔹 Invoice بھرنے والا فنکشن
function updateInvoice() {
  const studentName = document.getElementById("studentName")?.value || "";
  const fatherName  = document.getElementById("fatherName")?.value || "";
  const grade       = document.getElementById("grade")?.value || "";
  const selectedSubjects = Array.from(document.querySelectorAll('input[name="subjects"]:checked'));

  // 🆕 Other Subjects handle کرنے کے لیے
  const otherSubjectsInput = document.getElementById("igcse_text");
  let otherSubjectsCount = 0;
  if (otherSubjectsInput) {
    const others = otherSubjectsInput.value
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    otherSubjectsCount = others.length;
  }

  // اگر grade منتخب نہیں تو invoice صاف رکھیں
  if (!grade) {
    document.getElementById("invoiceNo").textContent = "";
    document.getElementById("parentName").textContent = "";
    document.getElementById("studentFor").textContent = "";
    document.getElementById("invoiceAmount").textContent = "";
    document.getElementById("totalAmount").textContent = "";
    return;
  }

  // Dates
  const today = new Date();
  const issuedOn = today.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
  const monthYear = today.toLocaleString("en-GB", { month:"short", year:"numeric" });
  const invoiceNo = Math.floor(100000 + Math.random() * 900000);
  
 // 💰 Fee Calculation (main change)
  const totalAmount =
    calculateFee(grade, selectedSubjects) +
    calculateFee(grade, Array(otherSubjectsCount).fill('extra'));

  // Fill invoice fields live
  document.getElementById("invoiceNo").textContent = invoiceNo;
  document.getElementById("parentName").textContent = fatherName;
  document.getElementById("issuedOn").textContent = issuedOn;
  document.getElementById("studentFor").textContent = `(${studentName})`;
  document.getElementById("monthYear").textContent = monthYear;
  document.getElementById("invoiceAmount").textContent = `${totalAmount} SAR/AED`;
  document.getElementById("totalAmount").textContent = totalAmount;
}

// 🔹 Real-time triggers
document.addEventListener("DOMContentLoaded", () => {
  const inputs = [
    "studentName", "fatherName", "grade"
  ];

  // Listen on text/grade changes
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateInvoice);
    if (el) el.addEventListener("change", updateInvoice);
  });

  // Listen on subjects checkboxes
  document.querySelectorAll('input[name="subjects"]').forEach(cb => {
    cb.addEventListener("change", updateInvoice);
  });

  // 🆕 Listen on other subjects input
const otherSubjectsInput = document.getElementById("igcse_text");
if (otherSubjectsInput) {
  otherSubjectsInput.addEventListener("input", updateInvoice);
  otherSubjectsInput.addEventListener("change", updateInvoice);
}
  // Initial fill (in case of reload)
  updateInvoice();
});
