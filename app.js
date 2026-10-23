// 报销记录在浏览器 localStorage 里的保存键名。
const STORAGE_KEY = "reimbursement_records_v1";

// 费用类别选项。
const expenseCategories = [
  "餐费",
  "交通费",
  "住宿费",
  "信息技术服务",
  "设备采购费",
  "快递费",
  "稿费",
  "会务费",
  "其他",
];

// 发票类别选项。这里不再单独问“有没有发票”，因为“无发票”本身就是一种选项。
const invoiceCategories = [
  "电子发票",
  "定额发票",
  "出租车机打发票",
  "纸质发票",
  "无发票",
  "其他",
];

// 问答流程。key 是最终保存到记录对象里的字段名。
const steps = [
  {
    key: "amount",
    title: "花了多少钱？",
    help: "请输入数字，例如 28、35.5、120.00。",
    type: "number",
    placeholder: "请输入金额",
  },
  {
    key: "expenseCategory",
    title: "这笔费用属于哪一类？",
    help: "选择一个最接近的费用类别。",
    type: "options",
    options: expenseCategories,
  },
  {
    key: "merchant",
    title: "这笔钱花在什么地方？",
    help: "可以写商户、用途或地点，例如：滴滴打车、午餐、打印资料。",
    type: "text",
    placeholder: "请输入用途/商户",
  },
  {
    key: "invoiceCategory",
    title: "发票类别是什么？",
    help: "如果没有发票，直接选择“无发票”。",
    type: "options",
    options: invoiceCategories,
  },
  {
    key: "reimbursementDate",
    title: "报销日期是哪天？",
    help: "默认是今天，也可以手动修改。",
    type: "date",
  },
];

let currentStepIndex = 0;
let currentRecord = createEmptyRecord();
let recordsVisible = false;

const stepLabel = document.getElementById("step-label");
const progressLabel = document.getElementById("progress-label");
const progressFill = document.getElementById("progress-fill");
const questionTitle = document.getElementById("question-title");
const questionHelp = document.getElementById("question-help");
const answerArea = document.getElementById("answer-area");
const backBtn = document.getElementById("back-btn");
const nextBtn = document.getElementById("next-btn");
const newRecordBtn = document.getElementById("new-record-btn");
const toggleRecordsBtn = document.getElementById("toggle-records-btn");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const summaryList = document.getElementById("summary-list");
const recordsCard = document.getElementById("records-card");
const recordsBody = document.getElementById("records-body");

// 页面首次加载时渲染第一题和已有记录汇总。
renderStep();
renderSummary();
renderRecords();

backBtn.addEventListener("click", () => {
  saveCurrentAnswer();
  if (currentStepIndex > 0) {
    currentStepIndex -= 1;
    renderStep();
  }
});

nextBtn.addEventListener("click", () => {
  const isValid = saveCurrentAnswer();
  if (!isValid) return;

  if (currentStepIndex < steps.length - 1) {
    currentStepIndex += 1;
    renderStep();
  } else {
    finishRecord();
  }
});

newRecordBtn.addEventListener("click", () => {
  startNewRecord();
});

toggleRecordsBtn.addEventListener("click", () => {
  recordsVisible = !recordsVisible;
  recordsCard.classList.toggle("hidden", !recordsVisible);
  toggleRecordsBtn.textContent = recordsVisible ? "隐藏全部记录" : "查看全部记录";
});

exportBtn.addEventListener("click", () => {
  exportExcel();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("确定要清空全部记录吗？这个操作不能恢复。")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderSummary();
  renderRecords();
});

function createEmptyRecord() {
  const today = getTodayString();
  return {
    date: today,
    amount: "",
    expenseCategory: "",
    merchant: "",
    invoiceCategory: "",
    note: "",
    applicant: "",
    reimbursementDate: today,
  };
}

function startNewRecord() {
  currentStepIndex = 0;
  currentRecord = createEmptyRecord();
  renderStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStep() {
  const step = steps[currentStepIndex];
  const totalSteps = steps.length;
  const currentNumber = currentStepIndex + 1;

  stepLabel.textContent = `第 ${currentNumber} 步`;
  progressLabel.textContent = `${currentNumber} / ${totalSteps}`;
  progressFill.style.width = `${(currentNumber / totalSteps) * 100}%`;
  questionTitle.textContent = step.title;
  questionHelp.textContent = step.help || "";
  answerArea.innerHTML = "";

  backBtn.disabled = currentStepIndex === 0;
  nextBtn.textContent = currentStepIndex === totalSteps - 1 ? "保存这一笔" : "下一步";

  if (step.type === "options") {
    renderOptionButtons(step);
    return;
  }

  if (step.type === "textarea") {
    const textarea = document.createElement("textarea");
    textarea.value = currentRecord[step.key] || "";
    textarea.placeholder = step.placeholder || "";
    textarea.id = "current-answer";
    answerArea.appendChild(textarea);
    textarea.focus();
    return;
  }

  const input = document.createElement("input");
  input.id = "current-answer";
  input.value = currentRecord[step.key] || "";
  input.placeholder = step.placeholder || "";

  if (step.type === "number") {
    input.type = "number";
    input.min = "0";
    input.step = "0.01";
    input.className = "number-input";
  } else if (step.type === "date") {
    input.type = "date";
    input.className = "date-input";
    if (!input.value) input.value = getTodayString();
  } else {
    input.type = "text";
    input.className = "text-input";
  }

  answerArea.appendChild(input);
  input.focus();
}

function renderOptionButtons(step) {
  const grid = document.createElement("div");
  grid.className = "option-grid";

  step.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.className = "option-btn";

    if (currentRecord[step.key] === option) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      currentRecord[step.key] = option;
      renderStep();
    });

    grid.appendChild(button);
  });

  answerArea.appendChild(grid);
}

function saveCurrentAnswer() {
  const step = steps[currentStepIndex];

  if (step.type === "options") {
    if (!currentRecord[step.key]) {
      alert("请先选择一个选项。");
      return false;
    }
    return true;
  }

  const input = document.getElementById("current-answer");
  const value = input.value.trim();

  if (!value) {
    alert("请先填写这一项。");
    input.focus();
    return false;
  }

  if (step.type === "number" && Number(value) <= 0) {
    alert("金额必须大于 0。");
    input.focus();
    return false;
  }

  currentRecord[step.key] = value;
  return true;
}

function finishRecord() {
  const records = loadRecords();
  const recordToSave = {
    ...currentRecord,
    amount: Number(currentRecord.amount).toFixed(2),
  };

  records.push(recordToSave);
  saveRecords(records);
  renderSummary();
  renderRecords();

  alert("已保存这一笔报销记录。你可以继续新增下一笔，或导出 Excel。");
  startNewRecord();
}

function loadRecords() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("读取记录失败：", error);
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function renderSummary() {
  const records = loadRecords();
  summaryList.innerHTML = "";

  if (records.length === 0) {
    summaryList.innerHTML = '<p class="small-note">暂无记录。</p>';
    return;
  }

  const totals = {};
  records.forEach((record) => {
    const category = record.expenseCategory || "未分类";
    const amount = Number(record.amount) || 0;
    totals[category] = (totals[category] || 0) + amount;
  });

  Object.keys(totals).forEach((category) => {
    const item = document.createElement("div");
    item.className = "summary-item";
    item.innerHTML = `<strong>${escapeHtml(category)}</strong><span>¥${totals[category].toFixed(2)}</span>`;
    summaryList.appendChild(item);
  });
}

function renderRecords() {
  const records = loadRecords();
  recordsBody.innerHTML = "";

  records.forEach((record, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(record.date)}</td>
      <td>¥${escapeHtml(record.amount)}</td>
      <td>${escapeHtml(record.expenseCategory)}</td>
      <td>${escapeHtml(record.merchant)}</td>
      <td>${escapeHtml(record.invoiceCategory)}</td>
      <td>${escapeHtml(record.note)}</td>
      <td>${escapeHtml(record.applicant)}</td>
      <td>${escapeHtml(record.reimbursementDate)}</td>
      <td><button class="delete-row-btn" type="button" data-index="${index}">删除</button></td>
    `;
    recordsBody.appendChild(row);
  });

  document.querySelectorAll(".delete-row-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      deleteRecord(index);
    });
  });
}

function deleteRecord(index) {
  const records = loadRecords();
  records.splice(index, 1);
  saveRecords(records);
  renderSummary();
  renderRecords();
}

function exportExcel() {
  const records = loadRecords();
  if (records.length === 0) {
    alert("还没有记录，无法导出。");
    return;
  }
  const blob = buildReimbursementWorkbook(records, expenseCategories);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `公司报销申请表_${getTodayString()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give browsers time to start the download before releasing the Blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getTodayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// A small, dependency-free XLSX export. Text is stored as text, never as formulas.
function buildReimbursementWorkbook(records, categories) {
  const xml = (value) => String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  const cell = (ref, value, style = 0) => typeof value === "number" && Number.isFinite(value)
    ? `<c r="${ref}" s="${style}"><v>${value}</v></c>`
    : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const dateCell = (ref, value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    return match ? cell(ref, (Date.UTC(+match[1], +match[2] - 1, +match[3]) - Date.UTC(1899, 11, 30)) / 86400000, 3) : cell(ref, value);
  };
  const cols = "ABCDEFGHIJKLMNO".split("");
  const header1 = ["申请日期", "报销金额", "", "", "", "", "", "", "", "", "", "发票类别", "备注/事由", "申请人", "报销日期"];
  const header2 = ["", ...categories, "合计", "", "", "", ""];
  const rows = [header1, header2].map((values, index) => `<row r="${index + 1}" ht="32" customHeight="1">${values.map((v, i) => cell(cols[i] + (index + 1), v, 1)).join("")}</row>`);
  records.forEach((record, index) => {
    const r = index + 3;
    const parsedAmount = Number(record.amount);
    const amount = Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) / 100 : 0;
    const category = categories.includes(record.expenseCategory) ? record.expenseCategory : "其他";
    const remark = [record.merchant, record.note].filter(Boolean).join("；");
    const lineCount = (text, capacity) => String(text || "").split(/\r?\n/).reduce((n, line) => n + Math.max(1, Math.ceil(Array.from(line).reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 2 : 1), 0) / capacity)), 0);
    const height = Math.min(409, Math.max(30, 17 * Math.max(lineCount(remark, 32), lineCount(record.invoiceCategory, 16), lineCount(record.applicant, 12)) + 8));
    const values = [dateCell(`A${r}`, record.date)];
    categories.forEach((name, i) => values.push(cell(`${cols[i + 1]}${r}`, name === category ? amount : "", 2)));
    values.push(`<c r="K${r}" s="2"><f>SUM(B${r}:J${r})</f><v>${amount}</v></c>`);
    values.push(cell(`L${r}`, record.invoiceCategory === "纸质发票" ? "纸质票" : record.invoiceCategory));
    values.push(cell(`M${r}`, remark, 4));
    values.push(cell(`N${r}`, record.applicant));
    values.push(dateCell(`O${r}`, record.reimbursementDate));
    rows.push(`<row r="${r}" ht="${height}" customHeight="1">${values.join("")}</row>`);
  });
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const widths = [15, 12, 12, 12, 18, 16, 12, 12, 12, 12, 14, 20, 36, 14, 15];
  const merges = ["A1:A2", "B1:K1", "L1:L2", "M1:M2", "N1:N2", "O1:O2"];
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${ns}><dimension ref="A1:O${records.length + 2}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>${widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData><mergeCells count="6">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet ${ns}><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><color rgb="FF17365D"/><name val="Microsoft YaHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EFF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = {
    "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook ${ns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="公司报销申请表" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'公司报销申请表'!$1:$2</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml": styles,
    "xl/worksheets/sheet1.xml": worksheet,
  };
  return new Blob([createWorkbookZip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// ZIP's stored method is supported by Excel and keeps export fully offline.
function createWorkbookZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const directory = [];
  let offset = 0;
  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  Object.entries(files).forEach(([path, content]) => {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true);
    l.setUint16(12, 33, true); l.setUint32(14, crc, true);
    l.setUint32(18, data.length, true); l.setUint32(22, data.length, true);
    l.setUint16(26, name.length, true); local.set(name, 30);
    parts.push(local, data);
    const central = new Uint8Array(46 + name.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint16(14, 33, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.set(name, 46); directory.push(central);
    offset += local.length + data.length;
  });
  const directorySize = directory.reduce((size, part) => size + part.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, directory.length, true);
  e.setUint16(10, directory.length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  const result = new Uint8Array(offset + directorySize + end.length);
  let position = 0;
  [...parts, ...directory, end].forEach(part => { result.set(part, position); position += part.length; });
  return result;
}

