// ── Storage & helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "smartAcademicAgentTasksV1";
const $ = (id) => document.getElementById(id);

/** Returns today's date as YYYY-MM-DD in local time. */
const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/** Returns the date N days from today as YYYY-MM-DD in local time. */
const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/** Escapes HTML special characters to prevent XSS. */
const escapeHTML = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

// ── Data initialisation ────────────────────────────────────────────────────────
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { tasks = []; }

if (!Array.isArray(tasks) || !tasks.length) {
  tasks = [
    { id: crypto.randomUUID(), name: "Menyusun makalah sistem informasi", course: "Pengantar Sistem Informasi", due: plusDays(1), priority: "Tinggi",  status: "pending" },
    { id: crypto.randomUUID(), name: "Menyelesaikan latihan pemrograman",  course: "Pemrograman Web",           due: plusDays(3), priority: "Sedang",  status: "pending" },
    { id: crypto.randomUUID(), name: "Membaca materi untuk kuis",          course: "Sistem Informasi Akuntansi", due: plusDays(5), priority: "Sedang",  status: "pending" },
  ];
  save();
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

// ── Date / scoring utilities ───────────────────────────────────────────────────
/** Number of calendar days from today until `date` (negative = past due). */
function daysLeft(date) {
  if (!date) return Infinity;
  return Math.ceil((new Date(date + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 86400000);
}

/** Human-readable due-date label. */
function dueText(date) {
  const d = daysLeft(date);
  if (d < 0)  return `Terlambat ${Math.abs(d)} hari`;
  if (d === 0) return "Tenggat hari ini";
  if (d === 1) return "Tenggat besok";
  return `${d} hari lagi`;
}

/**
 * Priority score for sorting: higher = more urgent.
 * Factors: deadline proximity (weighted heavily), priority label, overdue penalty.
 */
function score(t) {
  if (t.status === "done") return -9999;
  const d   = daysLeft(t.due);
  const pri = t.priority === "Tinggi" ? 40 : t.priority === "Sedang" ? 25 : 10;
  // Urgency ramp: overdue gets the highest boost; each bracket decreases
  const urgency = d < 0 ? 120 : d === 0 ? 90 : d === 1 ? 70 : d <= 2 ? 50 : d <= 3 ? 30 : d <= 5 ? 15 : d <= 7 ? 7 : 0;
  return pri + urgency;
}

/** Pending tasks sorted by descending score. */
function sortedPending() {
  return tasks.filter((t) => t.status !== "done").sort((a, b) => score(b) - score(a));
}

/**
 * Returns a clear, specific reason why a task is ranked where it is,
 * combining deadline proximity with priority tier.
 */
function reasonFor(t) {
  const d = daysLeft(t.due);
  if (d < 0)   return `Sudah melewati tenggat ${Math.abs(d)} hari — harus segera ditangani.`;
  if (d === 0)  return "Tenggatnya hari ini — jadikan prioritas utama.";
  if (d === 1) {
    return t.priority === "Tinggi"
      ? "Tenggat besok dan prioritas tinggi — mulai sekarang."
      : "Tenggat besok — sisihkan waktu hari ini untuk menyelesaikannya.";
  }
  if (d <= 3) {
    return t.priority === "Tinggi"
      ? `Tersisa ${d} hari dengan prioritas tinggi — alokasikan sesi belajar dalam 1–2 hari ini.`
      : `Tersisa ${d} hari — jadwalkan pengerjaan mulai besok agar tidak terburu-buru.`;
  }
  if (t.priority === "Tinggi") return `Tenggat masih ${d} hari, namun prioritas tinggi — mulai cicil sekarang.`;
  if (t.priority === "Sedang") return `Tenggat masih ${d} hari. Kerjakan setelah tugas mendesak selesai.`;
  return `Tenggat masih ${d} hari dan prioritas rendah — bisa dikerjakan lebih santai.`;
}

// ── Render helpers ─────────────────────────────────────────────────────────────
function taskRow(t) {
  const overdue = t.status !== "done" && daysLeft(t.due) < 0;
  return `<div class="task-row${overdue ? " overdue-row" : ""}" data-id="${escapeHTML(t.id)}">
    <button class="task-check ${t.status === "done" ? "checked" : ""}" data-action="toggle" title="Ubah status">${t.status === "done" ? "✓" : ""}</button>
    <div class="task-main">
      <strong>${escapeHTML(t.name)}</strong>
      <p>${escapeHTML(t.course)} · ${t.status === "done" ? "Selesai" : "Belum selesai"}</p>
    </div>
    <div class="task-meta">
      <span class="priority-badge priority-${escapeHTML(t.priority)}">${escapeHTML(t.priority)}</span>
      <span class="due">${escapeHTML(dueText(t.due))}</span>
    </div>
    <div class="row-actions">
      <button class="icon-button" data-action="edit" title="Edit tugas">✎</button>
      <button class="icon-button" data-action="delete" title="Hapus tugas">⌫</button>
    </div>
  </div>`;
}

function emptyState(title, desc) {
  return `<div class="empty-state"><div class="empty-icon">✧</div><strong>${title}</strong><p>${desc}</p></div>`;
}

// ── Main render ────────────────────────────────────────────────────────────────
function render() {
  const pending = tasks.filter((t) => t.status !== "done");
  const done    = tasks.filter((t) => t.status === "done");

  $("totalCount").textContent   = tasks.length;
  $("doneCount").textContent    = done.length;
  $("pendingCount").textContent = pending.length;
  $("urgentCount").textContent  = pending.filter((t) => daysLeft(t.due) <= 2).length;
  $("doneSub").textContent      = tasks.length
    ? `${Math.round((done.length / tasks.length) * 100)}% dari seluruh tugas`
    : "Progres tugas kamu";

  const sorted = sortedPending();
  $("priorityList").innerHTML = sorted.length
    ? sorted.slice(0, 3).map(taskRow).join("")
    : emptyState("Semua tugas selesai!", "Bagus! Kamu bisa menambahkan tugas baru kapan saja.");

  $("allTasksList").innerHTML = renderAllTasks();

  if (sorted.length) {
    const top = sorted[0];
    $("recommendTitle").textContent = `Mulai dari: ${top.name}`;
    $("recommendText").textContent  = `${dueText(top.due)} · Prioritas ${top.priority}. ${reasonFor(top)}`;
  } else {
    $("recommendTitle").textContent = "Belum ada tugas yang perlu dikerjakan";
    $("recommendText").textContent  = "Tambahkan tugas baru atau nikmati waktu istirahatmu.";
  }
}

function renderAllTasks() {
  const q    = $("searchTask").value.toLowerCase();
  const f    = $("filterStatus").value;
  const list = tasks
    .filter((t) =>
      (f === "all" || (f === "done" ? t.status === "done" : t.status !== "done")) &&
      (t.name + " " + t.course).toLowerCase().includes(q)
    )
    .sort((a, b) => score(b) - score(a));
  return list.length
    ? list.map(taskRow).join("")
    : emptyState("Tugas tidak ditemukan", "Coba ubah kata pencarian atau tambahkan tugas baru.");
}

// ── Dialog ─────────────────────────────────────────────────────────────────────
function openDialog(task = null) {
  $("taskForm").reset();
  $("taskId").value          = task?.id || "";
  $("dialogTitle").textContent = task ? "Edit Tugas" : "Tambah Tugas Baru";
  $("taskName").value        = task?.name     || "";
  $("taskCourse").value      = task?.course   || "";
  $("taskDue").value         = task?.due      || plusDays(2);
  $("taskPriority").value    = task?.priority || "Sedang";
  $("taskStatus").value      = task?.status   || "pending";
  $("taskDialog").showModal();
}

function closeDialog() { $("taskDialog").close(); }

// ── Toast ──────────────────────────────────────────────────────────────────────
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2300);
}

// ── Navigation ─────────────────────────────────────────────────────────────────
function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(view + "View").classList.remove("hidden");
  document.querySelectorAll(".nav").forEach((n) =>
    n.classList.toggle("active", n.dataset.view === view)
  );
  $("pageTitle").textContent = { dashboard: "Dashboard", tasks: "Daftar Tugas", assistant: "AI Assistant" }[view];
}

// ── Task event delegation ──────────────────────────────────────────────────────
function handleTaskAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const row = btn.closest("[data-id]");
  const t   = tasks.find((x) => x.id === row.dataset.id);
  if (!t) return;

  if (btn.dataset.action === "toggle") {
    t.status = t.status === "done" ? "pending" : "done";
    save(); render();
    toast(t.status === "done" ? "Tugas ditandai selesai." : "Tugas dikembalikan ke daftar aktif.");
  }
  if (btn.dataset.action === "edit") openDialog(t);
  if (btn.dataset.action === "delete") {
    if (confirm(`Hapus tugas "${t.name}"?`)) {
      tasks = tasks.filter((x) => x.id !== t.id);
      save(); render();
      toast("Tugas berhasil dihapus.");
    }
  }
}

// ── Event listeners ────────────────────────────────────────────────────────────
document.querySelectorAll(".nav").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.goto)));

$("addTaskTop").addEventListener("click", () => openDialog());
$("addTaskButton").addEventListener("click", () => openDialog());
$("closeDialog").addEventListener("click", closeDialog);
$("cancelDialog").addEventListener("click", closeDialog);

$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id   = $("taskId").value;
  const item = {
    id:       id || crypto.randomUUID(),
    name:     $("taskName").value.trim(),
    course:   $("taskCourse").value.trim(),
    due:      $("taskDue").value,
    priority: $("taskPriority").value,
    status:   $("taskStatus").value,
  };
  if (!item.name || !item.course || !item.due) { toast("Lengkapi semua data tugas."); return; }
  if (id) tasks = tasks.map((t) => (t.id === id ? item : t));
  else    tasks.push(item);
  save(); render(); closeDialog();
  toast(id ? "Tugas berhasil diperbarui." : "Tugas berhasil ditambahkan.");
});

$("priorityList").addEventListener("click", handleTaskAction);
$("allTasksList").addEventListener("click", handleTaskAction);

$("searchTask").addEventListener("input", () => { $("allTasksList").innerHTML = renderAllTasks(); });
$("filterStatus").addEventListener("change", () => { $("allTasksList").innerHTML = renderAllTasks(); });

// ── AI Assistant ───────────────────────────────────────────────────────────────

/**
 * Tier label describing urgency level for a task.
 */
function urgencyTier(t) {
  const d = daysLeft(t.due);
  if (d < 0)   return "🔴 TERLAMBAT";
  if (d === 0)  return "🔴 HARI INI";
  if (d === 1)  return "🟠 BESOK";
  if (d <= 3)   return "🟡 SEGERA";
  return "🟢 AMAN";
}

/**
 * Builds a full priority analysis of all pending tasks,
 * explaining the ranking with concrete reasons.
 */
function buildAnalysis() {
  const pending = sortedPending();
  const done    = tasks.filter((t) => t.status === "done");

  if (!tasks.length)
    return "Kamu belum memiliki data tugas. Tambahkan tugas terlebih dahulu agar aku bisa memberikan rekomendasi.";

  if (!pending.length)
    return `Hebat! Semua ${done.length} tugas yang tersimpan sudah selesai. Kamu bisa mengecek kembali tugas mendatang atau beristirahat.`;

  const lines = pending.slice(0, 6).map((t, i) => {
    const tier = urgencyTier(t);
    return `${i + 1}. ${tier} ${t.name}\n   Mata kuliah: ${t.course}\n   Tenggat: ${dueText(t.due)} · Prioritas: ${t.priority}\n   → ${reasonFor(t)}`;
  });

  const intro = `Berdasarkan ${tasks.length} tugas yang tersimpan, berikut urutan tugas yang sebaiknya kamu kerjakan:\n`;
  const outro = `\n💡 Tips: Fokus selesaikan tugas teratas dulu, pecah menjadi sesi kecil 25–45 menit. Setelah selesai, evaluasi kembali urutan prioritas.`;
  return intro + lines.join("\n\n") + outro;
}

/**
 * Generates a simple day-by-day study schedule for pending tasks.
 */
function buildSchedule() {
  const pending = sortedPending();
  if (!pending.length)
    return "Tidak ada tugas aktif untuk dijadwalkan. Tambahkan tugas beserta tenggatnya terlebih dahulu.";

  const sessions = ["Pagi (07.00–09.00)", "Siang (13.00–15.00)", "Sore (16.00–18.00)", "Malam (19.00–21.00)"];
  let result = "Saran jadwal belajar berdasarkan urutan prioritas:\n";

  pending.slice(0, 4).forEach((t, i) => {
    const sesi  = sessions[i % sessions.length];
    const d     = daysLeft(t.due);
    const hari  = d <= 0 ? "Hari ini (segera!)" : d === 1 ? "Hari ini / besok" : `Mulai hari ini, selesai dalam ${Math.max(1, d - 1)} hari`;
    result += `\n${i + 1}. ${t.name} (${t.course})\n   Sesi: ${sesi} · ${hari}\n   Tenggat: ${dueText(t.due)} · Prioritas: ${t.priority}`;
  });

  result += "\n\n💡 Gunakan teknik Pomodoro: 25 menit fokus, 5 menit istirahat. Ulangi 3–4 siklus per sesi.";
  return result;
}

/**
 * Routes a user's chat question to the appropriate response function.
 */
function answerFor(q) {
  const s = q.toLowerCase();

  // Jadwal / schedule intent
  if (s.includes("jadwal") || s.includes("susun") || s.includes("belajar") || s.includes("schedule") || s.includes("sesi"))
    return buildSchedule();

  // Deadline / urgent intent
  if (s.includes("mendekati") || s.includes("tenggat") || s.includes("deadline") || s.includes("terlambat") || s.includes("dekat")) {
    const urgent = sortedPending().filter((t) => daysLeft(t.due) <= 2);
    if (!urgent.length) return "Tidak ada tugas aktif dengan tenggat dalam dua hari ke depan berdasarkan data saat ini.";
    return "Tugas yang perlu segera diperhatikan (≤ 2 hari):\n" +
      urgent.map((t, i) => `${i + 1}. ${urgencyTier(t)} ${t.name}\n   ${t.course} · ${dueText(t.due)} · Prioritas ${t.priority}`).join("\n\n");
  }

  // Priority / order intent
  if (s.includes("dulu") || s.includes("prioritas") || s.includes("kerjakan") || s.includes("mana") || s.includes("mulai") || s.includes("urutan") || s.includes("pertama"))
    return buildAnalysis();

  // Progress summary intent
  if (s.includes("selesai") || s.includes("progres") || s.includes("ringkasan") || s.includes("status") || s.includes("berapa")) {
    const done = tasks.filter((t) => t.status === "done");
    const pct  = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
    return `Ringkasan progres:\n• Total tugas: ${tasks.length}\n• Selesai: ${done.length} (${pct}%)\n• Belum selesai: ${tasks.filter((t) => t.status !== "done").length}\n• Mendekati tenggat (≤2 hari): ${tasks.filter((t) => t.status !== "done" && daysLeft(t.due) <= 2).length}`;
  }

  // Help / default
  return 'Aku bisa membantu dengan:\n• "Tugas mana yang harus dikerjakan dulu?" — urutan prioritas\n• "Bantu susun jadwal belajar" — jadwal harian\n• "Tugas apa yang mendekati tenggat?" — tugas mendesak\n• "Bagaimana progres tugasku?" — ringkasan status';
}

/**
 * Appends a message bubble to the chat panel.
 * @param {string} text - Message text (supports newlines).
 * @param {"user"|"agent"} who
 */
function addMessage(text, who) {
  const wrap = document.createElement("div");
  wrap.className = `message ${who === "user" ? "user-message" : ""}`;

  if (who !== "user") {
    const av = document.createElement("div");
    av.className   = "message-avatar";
    av.textContent = "✦";
    wrap.appendChild(av);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const p = document.createElement("p");
  p.textContent = text;
  bubble.appendChild(p);
  wrap.appendChild(bubble);

  $("chatMessages").appendChild(wrap);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
}

function sendChat(text) {
  const q = text.trim();
  if (!q) return;
  addMessage(q, "user");
  $("chatInput").value = "";
  // Small delay for natural feel
  setTimeout(() => addMessage(answerFor(q), "agent"), 220);
}

$("chatForm").addEventListener("submit", (e) => { e.preventDefault(); sendChat($("chatInput").value); });
document.querySelectorAll(".suggestion").forEach((b) => b.addEventListener("click", () => sendChat(b.textContent)));
$("clearChat").addEventListener("click", () => {
  $("chatMessages").innerHTML = "";
  addMessage("Percakapan dibersihkan. Apa yang ingin kamu tanyakan tentang tugasmu?", "agent");
});

// ── Boot ───────────────────────────────────────────────────────────────────────
render();
