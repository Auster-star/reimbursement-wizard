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
  exportCsv();
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

  alert("已保存这一笔报销记录。你可以继续新增下一笔，或导出 CSV。");
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

function exportCsv() {
  const records = loadRecords();
  if (records.length === 0) {
    alert("还没有记录，无法导出。");
    return;
  }

  const headerRow1 = [
    "申请日期",
    "报销金额", "", "", "", "", "", "", "", "", "",
    "发票",
    "备注/事由",
    "申请人",
    "报销日期",
  ];

  const headerRow2 = [
    "",
    "餐费",
    "交通费",
    "住宿费",
    "信息技术服务",
    "设备采购费",
    "快递费",
    "稿费",
    "会务费",
    "其他",
    "合计",
    "技术公司电子发票/定额/出租车机打发票/纸质票/无发票",
    "",
    "",
    "",
  ];

  const rows = records.map((record) => {
    const amount = Number(record.amount || 0).toFixed(2);
    const amountColumns = expenseCategories.map((category) => (
      record.expenseCategory === category ? amount : ""
    ));

    return [
      record.date,
      ...amountColumns,
      amount,
      formatInvoiceCategoryForExport(record.invoiceCategory),
      formatRemarkForExport(record),
      record.applicant,
      record.reimbursementDate,
    ];
  });

  const csvContent = [headerRow1, headerRow2, ...rows]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");

  // 加 BOM 是为了让 Excel 更容易正确识别中文。
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `公司报销申请表_${getTodayString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatInvoiceCategoryForExport(invoiceCategory) {
  // 模板里写的是“纸质票”，这里把页面里的“纸质发票”转成模板叫法。
  if (invoiceCategory === "纸质发票") return "纸质票";
  return invoiceCategory || "";
}

function formatRemarkForExport(record) {
  // 模板只有“备注/事由”一列，所以把“用途/商户”和“备注/事由”合并，避免丢信息。
  const parts = [record.merchant, record.note].filter(Boolean);
  return parts.join("；");
}

function formatCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
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
