/**
 * Staging Queue Viewer & CSV Exporter
 */

let allLeads = [];

const leadsTableBody = document.getElementById("leadsTableBody");
const emptyState = document.getElementById("emptyState");
const leadCount = document.getElementById("leadCount");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterIndustry = document.getElementById("filterIndustry");
const btnExportCSV = document.getElementById("btnExportCSV");
const btnClear = document.getElementById("btnClear");

document.addEventListener("DOMContentLoaded", () => {
  loadLeads();

  searchInput.addEventListener("input", renderLeads);
  filterStatus.addEventListener("change", renderLeads);
  filterIndustry.addEventListener("change", renderLeads);
  btnExportCSV.addEventListener("click", exportToCSV);
  btnClear.addEventListener("click", clearAllLeads);
});

async function loadLeads() {
  const { sdr_staging_leads = [] } = await chrome.storage.local.get("sdr_staging_leads");
  allLeads = sdr_staging_leads;
  renderLeads();
}

function renderLeads() {
  const q = searchInput.value.toLowerCase().trim();
  const st = filterStatus.value;
  const ind = filterIndustry.value;

  const filtered = allLeads.filter(l => {
    const matchesSearch = !q || (l.companyName || "").toLowerCase().includes(q) ||
                          (l.phone || "").includes(q) ||
                          (l.address || "").toLowerCase().includes(q);

    const matchesStatus = st === "ALL" ||
      (st === "HOT" && l.isHotLead) ||
      (l.status === st);

    const matchesIndustry = ind === "ALL" || (l.industry === ind);

    return matchesSearch && matchesStatus && matchesIndustry;
  });

  leadCount.textContent = filtered.length;

  if (filtered.length === 0) {
    leadsTableBody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  leadsTableBody.innerHTML = filtered.map(lead => {
    const d = new Date(lead.createdAt);
    const dateStr = `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    
    const hotBadge = lead.isHotLead ? '<span class="tag tag-hot">🔥 HOT LEAD</span>' : '';
    const statusBadge = `<span class="tag tag-status">${lead.status === "APPROVED_STAGING" ? "STAGING" : "DRAFT"}</span>`;
    
    const servicesTags = (lead.servicesOffered || []).map(s => `<span class="tag tag-service">${s}</span>`).join(" ");
    const gapsTags = (lead.digitalGaps || []).map(g => `<span class="tag" style="background:#fee2e2;color:#991b1b;">${g}</span>`).join(" ");

    return `
      <tr>
        <td style="color:var(--muted); font-size:11px; white-space:nowrap;">${dateStr}</td>
        <td>
          <div style="font-weight:700; font-size:14px;">${lead.companyName}</div>
          <div style="font-size:11px; color:var(--muted);">${lead.industry} · ${lead.ratingReviews || ''}</div>
          <div style="margin-top:4px;">${statusBadge} ${hotBadge}</div>
        </td>
        <td>
          <div style="font-size:11px; font-weight:600; margin-bottom:4px;">Status Web: ${lead.websiteStatus.toUpperCase()}</div>
          ${lead.website ? `<div style="font-size:11px;"><a href="${lead.website}" target="_blank">${lead.website}</a></div>` : '<div style="color:var(--danger); font-size:11px;">(Tidak ada website)</div>'}
          <div style="margin-top:4px;">${gapsTags}</div>
        </td>
        <td>
          <div style="margin-bottom:4px;">${servicesTags || '-'}</div>
          <div style="font-size:11px; color:var(--muted); font-weight:600;">Size: ${lead.dealSize}</div>
        </td>
        <td style="font-size:11px;">
          <div>📞 <strong>${lead.phone || '-'}</strong></div>
          ${lead.whatsapp ? `<div>💬 WA: ${lead.whatsapp}</div>` : ''}
          ${lead.instagram ? `<div>📷 IG: ${lead.instagram}</div>` : ''}
          <div style="color:var(--muted); margin-top:4px; max-width:200px;">${lead.address || '-'}</div>
        </td>
        <td style="font-size:11px; max-width:220px;">
          ${lead.picName ? `<div>👤 <strong>${lead.picName}</strong> (${lead.picRole || 'PIC'})</div>` : ''}
          <div style="color:var(--muted); margin-top:2px; font-style:italic;">"${lead.notes || '-'}"</div>
        </td>
        <td>
          <button onclick="deleteLead('${lead.id}')" style="color:var(--danger); background:none; border:none; padding:4px; cursor:pointer;" title="Hapus">✕</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.deleteLead = async function(id) {
  if (!confirm("Hapus lead ini dari staging?")) return;
  allLeads = allLeads.filter(l => l.id !== id);
  await chrome.storage.local.set({ sdr_staging_leads: allLeads });
  renderLeads();
};

async function clearAllLeads() {
  if (allLeads.length === 0) return;
  if (!confirm("Yakin ingin menghapus SEMUA data lead di staging queue?")) return;
  allLeads = [];
  await chrome.storage.local.set({ sdr_staging_leads: [] });
  renderLeads();
}

function exportToCSV() {
  if (allLeads.length === 0) {
    alert("Tidak ada data lead untuk diekspor!");
    return;
  }

  const headers = [
    "ID", "Waktu Submit", "Nama Perusahaan", "Industri", "Cabang",
    "Google Rating", "Alamat", "Telepon", "WhatsApp", "Email",
    "Website", "Instagram", "PIC Nama", "PIC Jabatan",
    "Status Website", "Digital Gaps", "Solusi Ditawarkan",
    "Deal Size", "Priority", "Notes", "Status Lead"
  ];

  const rows = allLeads.map(l => [
    l.id,
    l.createdAt,
    `"${(l.companyName || '').replace(/"/g, '""')}"`,
    `"${l.industry || ''}"`,
    `"${l.branches || ''}"`,
    `"${l.ratingReviews || ''}"`,
    `"${(l.address || '').replace(/"/g, '""')}"`,
    `'${l.phone || ''}`,
    `'${l.whatsapp || ''}`,
    `"${l.email || ''}"`,
    `"${l.website || ''}"`,
    `"${l.instagram || ''}"`,
    `"${l.picName || ''}"`,
    `"${l.picRole || ''}"`,
    `"${l.websiteStatus || ''}"`,
    `"${(l.digitalGaps || []).join('; ')}"`,
    `"${(l.servicesOffered || []).join('; ')}"`,
    `"${l.dealSize || ''}"`,
    l.priority,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
    l.status
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
    [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `SDR_Leads_Staging_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
