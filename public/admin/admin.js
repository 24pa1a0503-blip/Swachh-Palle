// Signal Grid Admin Triage Logic

// Dynamic API Base URL resolution for separate deployment
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' && (window.location.port === '3000' || window.location.port === '')) {
    return '';
  }
  const savedUrl = localStorage.getItem('sp_backend_url');
  if (savedUrl) return savedUrl;
  return 'https://swachh-palle.onrender.com';
})();

let map;
let markers = {};
let tickets = [];
const defaultCenter = [16.5062, 80.6480]; // Andhra Pradesh, Vijayawada region

// DOM Elements
const triageTbody = document.getElementById('triage-tbody');
const activeCountBadge = document.getElementById('active-count-badge');
const btnRefresh = document.getElementById('btn-refresh');
const btnAdminLogout = document.getElementById('btn-admin-logout');

const navTriage = document.getElementById('nav-triage');
const navCitizens = document.getElementById('nav-citizens');
const navLeaderboard = document.getElementById('nav-leaderboard');
const triageView = document.getElementById('triage-view');
const citizensView = document.getElementById('citizens-view');
const leaderboardView = document.getElementById('leaderboard-view');
const navAnalytics = document.getElementById('nav-analytics');
const analyticsView = document.getElementById('analytics-view');
const citizensTbody = document.getElementById('citizens-tbody');
const leaderboardTbody = document.getElementById('leaderboard-tbody');
const btnClearDemoCitizens = document.getElementById('btn-clear-demo-citizens');

let selectedResolutionImageBase64 = '';

// Modal Elements
const ticketModal = document.getElementById('ticket-modal');
const modalTicketId = document.getElementById('modal-ticket-id');
const modalImg = document.getElementById('modal-img');
const modalCategory = document.getElementById('modal-category');
const modalReporter = document.getElementById('modal-reporter');
const modalCoords = document.getElementById('modal-coords');
const modalTimestamp = document.getElementById('modal-timestamp');
const modalStatus = document.getElementById('modal-status');
const modalActionsContainer = document.getElementById('modal-actions-container');
const btnModalClose = document.getElementById('btn-modal-close');

// Initialize Dashboard
function initializeDashboard() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'index.html';
    } else {
      document.body.style.display = 'block';
      
      // Initialize map and data ONLY after body is displayed
      if (!map) {
        initMap();
        loadData();
        setupEventListeners();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

// 1. Initialize Map
function initMap() {
  map = L.map('map-container').setView(defaultCenter, 13);

  // Add standard OpenStreetMap tiles (100% free, reliable, no API key required)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 200);
}

// 2. Load Tickets Data
async function loadData() {
  triageTbody.innerHTML = `<tr><td colspan="6" class="table-loading">SYS_CONNECT: DOWNLOADING REAL-TIME TICKETS FEED...</td></tr>`;
  
  try {
    const res = await fetch(`${API_BASE}/api/tickets`);
    const json = await res.json();
    if (json.success && json.data) {
      tickets = json.data;
      updateDashboardMetrics();
      renderTable();
      renderMarkers();
      if (analyticsView && analyticsView.style.display === 'block') {
        loadAdminAnalytics();
      }
    } else {
      triageTbody.innerHTML = `<tr><td colspan="6" class="table-loading" style="color: var(--primary-accent);">FEED_ERROR: FAILED TO FETCH DATA</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching tickets:', error);
    triageTbody.innerHTML = `<tr><td colspan="6" class="table-loading" style="color: var(--primary-accent);">FEED_ERROR: CONNECTION REFUSED</td></tr>`;
  }
}

function updateDashboardMetrics() {
  const pendingCount = tickets.filter(t => t.status === 'Pending').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
  const rejectedCount = tickets.filter(t => t.status === 'Rejected').length;
  
  const validTickets = resolvedCount + pendingCount;
  const cleanlinessIndex = validTickets > 0 ? Math.round((resolvedCount / validTickets) * 100) : 100;
  
  const elementPending = document.getElementById('metric-pending');
  const elementResolved = document.getElementById('metric-resolved');
  const elementRejected = document.getElementById('metric-rejected');
  const elementCleanliness = document.getElementById('metric-cleanliness');
  const elementCleanlinessBar = document.getElementById('metric-cleanliness-bar');

  if (elementPending) elementPending.textContent = pendingCount;
  if (elementResolved) elementResolved.textContent = resolvedCount;
  if (elementRejected) elementRejected.textContent = rejectedCount;
  if (elementCleanliness) elementCleanliness.textContent = `${cleanlinessIndex}%`;
  if (elementCleanlinessBar) elementCleanlinessBar.style.width = `${cleanlinessIndex}%`;
}

// 3. Render Table
function renderTable() {
  if (tickets.length === 0) {
    triageTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px;">QUEUE_EMPTY: NO CIVIC ISSUES REPORTED</td></tr>`;
    activeCountBadge.textContent = '00';
    return;
  }

  // Count pending tickets
  const pendingCount = tickets.filter(t => t.status === 'Pending').length;
  activeCountBadge.textContent = pendingCount < 10 ? `0${pendingCount}` : pendingCount;

  // Sort: Pending tickets first (ordered by upvotes/reports count descending), then resolved/rejected by date
  const sortedTickets = [...tickets].sort((a, b) => {
    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
    if (a.status === 'Pending' && b.status === 'Pending') {
      const aCount = (a.upvotes || []).length;
      const bCount = (b.upvotes || []).length;
      return bCount - aCount;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Render rows
  triageTbody.innerHTML = sortedTickets.map(ticket => {
    const isPending = ticket.status === 'Pending';
    const isResolved = ticket.status === 'Resolved';
    const isRejected = ticket.status === 'Rejected' || ticket.status === 'Spam';
    
    let statusText = 'PENDING';
    let statusClass = 'status-pending';
    let statusLabelClass = 'status-lbl-pending';
    
    if (isResolved) {
      statusText = 'RESOLVED';
      statusClass = 'status-resolved';
      statusLabelClass = 'status-lbl-resolved';
    } else if (isRejected) {
      statusText = 'REJECTED/SPAM';
      statusClass = 'status-rejected';
      statusLabelClass = 'status-lbl-rejected';
    }
    
    const formattedDate = new Date(ticket.createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).toUpperCase();

    const coordsStr = `${ticket.latitude.toFixed(4)},${ticket.longitude.toFixed(4)}`;
    
    let actionBtn = '';
    if (isPending) {
      actionBtn = `<button class="btn-action-resolve" onclick="event.stopPropagation(); focusTicket('${ticket.id}')">VERIFY</button>`;
    } else if (isResolved) {
      actionBtn = `<button class="btn-action-resolved" disabled>RESOLVED</button>`;
    } else {
      actionBtn = `<button class="btn-action-resolved" disabled style="color:var(--text-muted); border-color:var(--border);">REJECTED</button>`;
    }

    const idColClass = isPending ? 'col-ticket-id' : 'col-ticket-id text-strike';
    const cellClass = isPending ? '' : 'col-secondary-info';

    const upvoteCount = (ticket.upvotes || []).length;
    const priorityBadge = (isPending && upvoteCount > 0)
      ? `<span style="background-color: #fef3f2; color: #b42318; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 8px; border: 1px solid #fecdca; display: inline-flex; align-items: center; gap: 3px;"><span class="material-symbols-outlined" style="font-size: 12px;">priority_high</span>${upvoteCount + 1} REPORTS</span>`
      : '';

    return `
      <tr class="${statusClass}" onclick="focusTicket('${ticket.id}')">
        <td class="${idColClass}">${ticket.id}</td>
        <td class="${cellClass}" style="display: flex; align-items: center; border-bottom: none;">${ticket.category}${priorityBadge}</td>
        <td class="${cellClass}">${coordsStr}</td>
        <td class="${cellClass}">${formattedDate}</td>
        <td>
          <span class="${statusLabelClass}">
            ${statusText}
          </span>
        </td>
        <td style="text-align: right;">${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

// 4. Render Markers on Leaflet Map
function renderMarkers() {
  // Clear existing markers
  for (let id in markers) {
    map.removeLayer(markers[id]);
  }
  markers = {};

  if (tickets.length === 0) return;

  // Retrieve filter states
  const filterPending = document.getElementById('filter-pending')?.checked ?? true;
  const filterResolved = document.getElementById('filter-resolved')?.checked ?? true;
  const filterRejected = document.getElementById('filter-rejected')?.checked ?? true;
  const filterDustbin = document.getElementById('filter-dustbin')?.checked ?? true;
  const filterDrain = document.getElementById('filter-drain')?.checked ?? true;

  const filteredTickets = tickets.filter(ticket => {
    // 1. Status Filter
    const isPending = ticket.status === 'Pending';
    const isResolved = ticket.status === 'Resolved';
    const isRejected = ticket.status === 'Rejected' || ticket.status === 'Spam';
    
    if (isPending && !filterPending) return false;
    if (isResolved && !filterResolved) return false;
    if (isRejected && !filterRejected) return false;

    // 2. Category Filter
    const isDustbin = ticket.category.includes('Dustbin');
    const isDrain = ticket.category.includes('Drain');

    if (isDustbin && !filterDustbin) return false;
    if (isDrain && !filterDrain) return false;

    return true;
  });

  const bounds = [];

  filteredTickets.forEach(ticket => {
    const isPending = ticket.status === 'Pending';
    const isResolved = ticket.status === 'Resolved';
    const isRejected = ticket.status === 'Rejected' || ticket.status === 'Spam';

    let markerColor = 'red';
    if (isResolved) {
      markerColor = 'green';
    } else if (isRejected) {
      markerColor = 'grey';
    }

    // Create custom glowing marker using divIcon
    const customIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="pin-glow ${markerColor}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([ticket.latitude, ticket.longitude], { icon: customIcon }).addTo(map);

    // Setup marker popup layout
    const formattedDate = new Date(ticket.createdAt).toLocaleString().toUpperCase();
    
    let popupStatusHtml = '';
    if (isPending) {
      popupStatusHtml = `<button style="background: var(--primary); color: var(--surface); border: none; padding: 6px 10px; width: 100%; font-weight: 600; font-family: var(--font-sans); font-size: 11px; border-radius: 6px; cursor: pointer; transition: var(--transition);" onclick="focusTicket('${ticket.id}')">Verify Incident</button>`;
    } else if (isResolved) {
      popupStatusHtml = `<div style="color: var(--success-text); font-weight: 600; text-align: center; font-size: 11px; font-family: var(--font-sans);">Status: Resolved</div>`;
    } else {
      popupStatusHtml = `<div style="color: var(--text-muted); font-weight: 600; text-align: center; font-size: 11px; font-family: var(--font-sans);">Status: Rejected</div>`;
    }

    const popupHtml = `
      <div style="font-family: var(--font-sans); background-color: var(--surface); color: var(--text-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border); width: 220px; font-size: 12px; box-shadow: var(--shadow);">
        <div style="font-family: var(--font-mono); font-weight: bold; color: ${isPending ? 'var(--critical-text)' : (isResolved ? 'var(--success-text)' : 'var(--text-muted)')}; margin-bottom: 8px;">TICKET: ${ticket.id}</div>
        <div style="margin-bottom: 4px;"><b>Category:</b> ${ticket.category}</div>
        <div style="margin-bottom: 8px; font-size: 11px; color: var(--text-secondary);"><b>Time:</b> ${formattedDate}</div>
        ${ticket.imageUrl ? `<img src="${ticket.imageUrl}" style="width:100%; height:110px; object-fit:cover; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 6px;">` : ''}
        ${popupStatusHtml}
      </div>
    `;
    
    // Bind popup to marker
    marker.bindPopup(popupHtml, {
      closeButton: false,
      maxWidth: 240,
      className: 'custom-popup'
    });

    markers[ticket.id] = marker;
    bounds.push([ticket.latitude, ticket.longitude]);
  });

  // Fit map boundaries to fit all markers if we have any
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

// 5. Interaction: Focus on Ticket and open details
window.focusTicket = function(id) {
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;

  // Center map on location
  map.setView([ticket.latitude, ticket.longitude], 16);
  
  // Open Leaflet popup
  if (markers[id]) {
    markers[id].openPopup();
  }

  // Open Detailed Modal
  showModal(ticket);
};

// 6. Show Modal Details
function showModal(ticket) {
  modalTicketId.textContent = `Incident ID: ${ticket.id}`;
  modalImg.src = ticket.imageUrl || 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=300';
  modalCategory.textContent = ticket.category;
  const upvoteNum = (ticket.upvotes || []).length;
  if (upvoteNum > 0) {
    modalCategory.innerHTML = `${ticket.category} <span style="background-color: #fef3f2; color: #b42318; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 8px; border: 1px solid #fecdca; display: inline-flex; align-items: center; gap: 3px;"><span class="material-symbols-outlined" style="font-size: 13px;">priority_high</span>REPORTED BY ${upvoteNum + 1} CITIZENS</span>`;
  }
  modalReporter.textContent = ticket.reporterId;
  modalCoords.textContent = `${ticket.latitude.toFixed(6)}, ${ticket.longitude.toFixed(6)}`;
  
  const formattedDate = new Date(ticket.createdAt).toLocaleString();
  modalTimestamp.textContent = formattedDate;

  const isPending = ticket.status === 'Pending';
  const isResolved = ticket.status === 'Resolved';
  const isRejected = ticket.status === 'Rejected' || ticket.status === 'Spam';

  modalStatus.textContent = ticket.status.toUpperCase();
  if (isPending) {
    modalStatus.style.color = 'var(--status-critical-text)';
  } else if (isResolved) {
    modalStatus.style.color = 'var(--status-success-text)';
  } else {
    modalStatus.style.color = 'var(--text-secondary)';
  }

  // Reset file upload field & preview
  selectedResolutionImageBase64 = '';
  const resUploadGroup = document.getElementById('resolution-upload-group');
  const fileInput = document.getElementById('modal-resolve-file');
  const cameraInput = document.getElementById('modal-resolve-camera');
  const previewContainer = document.getElementById('modal-resolve-preview-container');
  const previewImg = document.getElementById('modal-resolve-preview');
  if (fileInput) fileInput.value = '';
  if (cameraInput) cameraInput.value = '';
  if (previewContainer) previewContainer.style.display = 'none';
  if (previewImg) previewImg.src = '';

  if (isPending) {
    if (resUploadGroup) resUploadGroup.style.display = 'flex';
    modalActionsContainer.innerHTML = `
      <div class="verification-actions">
        <button class="btn-verify-resolve" onclick="handleResolveIncident('${ticket.id}')">Approve & Resolve</button>
        <button class="btn-verify-spam" onclick="updateTicketVerification('${ticket.id}', 'Fake/Spam Report')">Mark as Fake/Spam</button>
      </div>
    `;
  } else if (isResolved) {
    if (resUploadGroup) resUploadGroup.style.display = 'none';
    let resolvedImageHtml = '';
    if (ticket.resolvedImageUrl) {
      resolvedImageHtml = `
        <div style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; text-align: left;">
          <span class="info-lbl" style="font-weight: 600; font-size: 11px; display: block; margin-bottom: 6px;">RESOLUTION SNAPSHOT (CLEANED UP)</span>
          <img src="${ticket.resolvedImageUrl}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);">
        </div>
      `;
    }
    modalActionsContainer.innerHTML = `
      ${resolvedImageHtml}
      <div class="status-alert-resolved" style="margin-top: 12px;">Incident Resolved & Points Disbursed</div>
    `;
  } else {
    if (resUploadGroup) resUploadGroup.style.display = 'none';
    modalActionsContainer.innerHTML = `
      <div class="status-alert-rejected">Incident Rejected as Spam/Fake</div>
    `;
  }

  ticketModal.classList.add('active');
}

// 7. Verify / Resolve Ticket Call to updated status endpoint
window.updateTicketVerification = async function(id, verificationStatus, resolvedImage) {
  try {
    const payload = { ticketId: id, status: verificationStatus };
    if (resolvedImage) {
      payload.resolvedImage = resolvedImage;
    }
    const res = await fetch(`${API_BASE}/api/tickets/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      console.log(`[SYS] Ticket ${id} verification updated to ${verificationStatus}`);
      
      // Close modal if open
      ticketModal.classList.remove('active');
      
      // Reload all data
      await loadData();
    } else {
      alert(`Error updating ticket status: ${json.error}`);
    }
  } catch (error) {
    console.error('Failed to update ticket verification:', error);
    alert('Resolution API failed.');
  }
};

window.handleResolveIncident = async function(id) {
  if (!selectedResolutionImageBase64) {
    alert('Please capture a photo or upload a resolution file demonstrating the clean-up before resolving this incident.');
    return;
  }
  
  await updateTicketVerification(id, 'Valid & Resolved', selectedResolutionImageBase64);
};

// 7b. Citizen Management API interactions
async function loadCitizens() {
  citizensTbody.innerHTML = `<tr><td colspan="5" class="table-loading">SYS_CONNECT: DOWNLOADING REGISTERED CITIZENS...</td></tr>`;
  try {
    const res = await fetch(`${API_BASE}/api/users`);
    const json = await res.json();
    if (json.success && json.data) {
      const users = json.data;
      if (users.length === 0) {
        citizensTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">REGISTRY_EMPTY: NO CITIZENS REGISTERED</td></tr>`;
        return;
      }
      citizensTbody.innerHTML = users.map(user => {
        const formattedDate = new Date(user.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).toUpperCase();
        
        return `
          <tr>
            <td class="col-ticket-id">${user.id}</td>
            <td>${user.name}</td>
            <td>${user.civicPoints || 0}</td>
            <td class="col-secondary-info">${formattedDate}</td>
            <td style="text-align: right;">
              <button class="btn-action-resolve" style="background-color: #ef4444; border-color: #ef4444;" onclick="event.stopPropagation(); deleteCitizen('${user.id}')">DELETE</button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      citizensTbody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color: var(--primary-accent);">FEED_ERROR: FAILED TO FETCH USERS</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching citizens:', error);
    citizensTbody.innerHTML = `<tr><td colspan="5" class="table-loading" style="color: var(--primary-accent);">FEED_ERROR: CONNECTION REFUSED</td></tr>`;
  }
}

// 7c. Leaderboard API interactions
async function loadLeaderboard() {
  leaderboardTbody.innerHTML = `<tr><td colspan="4" class="table-loading">SYS_CONNECT: DOWNLOADING CITIZEN LEADERBOARD...</td></tr>`;
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const json = await res.json();
    if (json.success && json.data) {
      const standings = json.data;
      if (standings.length === 0) {
        leaderboardTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px;">LEADERBOARD_EMPTY: NO CIVIC STANDINGS RECORDED</td></tr>`;
        return;
      }
      leaderboardTbody.innerHTML = standings.map((citizen, index) => {
        const rankNum = index + 1;
        let rankBadge = `${rankNum}`;
        if (rankNum === 1) rankBadge = '🥇 1';
        else if (rankNum === 2) rankBadge = '🥈 2';
        else if (rankNum === 3) rankBadge = '🥉 3';

        return `
          <tr>
            <td style="font-weight: 700;">${rankBadge}</td>
            <td class="col-ticket-id">${citizen.id}</td>
            <td>${citizen.name}</td>
            <td style="font-weight: 600; color: var(--success-text);">${citizen.civicPoints || 0}</td>
          </tr>
        `;
      }).join('');
    } else {
      leaderboardTbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color: var(--primary-accent);">FEED_ERROR: FAILED TO FETCH LEADERBOARD</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    leaderboardTbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color: var(--primary-accent);">FEED_ERROR: CONNECTION REFUSED</td></tr>`;
  }
}

// 7d. Admin Analytics interactions
function loadAdminAnalytics() {
  const pendingCount = tickets.filter(t => t.status === 'Pending').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
  const rejectedCount = tickets.filter(t => t.status === 'Rejected').length;
  const totalCount = tickets.length;
  
  const validTickets = resolvedCount + pendingCount;
  const cleanlinessIndex = validTickets > 0 ? Math.round((resolvedCount / validTickets) * 100) : 100;
  const spamRate = totalCount > 0 ? Math.round((rejectedCount / totalCount) * 100) : 0;
  
  const dustbinsCount = tickets.filter(t => t.category.includes('Dustbin')).length;
  const drainsCount = tickets.filter(t => t.category.includes('Drain')).length;
  
  const maxCategory = Math.max(dustbinsCount, drainsCount, 1);
  const dustbinsPercent = Math.round((dustbinsCount / maxCategory) * 100);
  const drainsPercent = Math.round((drainsCount / maxCategory) * 100);

  const elTotal = document.getElementById('admin-analytics-total');
  const elRate = document.getElementById('admin-analytics-rate');
  const elSpamRate = document.getElementById('admin-analytics-spam-rate');
  const elDustbins = document.getElementById('admin-analytics-dustbins');
  const elDustbinsBar = document.getElementById('admin-analytics-dustbins-bar');
  const elDrains = document.getElementById('admin-analytics-drains');
  const elDrainsBar = document.getElementById('admin-analytics-drains-bar');
  
  const elPending = document.getElementById('admin-analytics-pending');
  const elResolved = document.getElementById('admin-analytics-resolved');
  const elRejected = document.getElementById('admin-analytics-rejected');

  if (elTotal) elTotal.textContent = totalCount;
  if (elRate) elRate.textContent = `${cleanlinessIndex}%`;
  if (elSpamRate) elSpamRate.textContent = `${spamRate}%`;
  
  if (elDustbins) elDustbins.textContent = dustbinsCount;
  if (elDustbinsBar) elDustbinsBar.style.width = `${dustbinsPercent}%`;
  if (elDrains) elDrains.textContent = drainsCount;
  if (elDrainsBar) elDrainsBar.style.width = `${drainsPercent}%`;
  
  if (elPending) elPending.textContent = pendingCount;
  if (elResolved) elResolved.textContent = resolvedCount;
  if (elRejected) elRejected.textContent = rejectedCount;
}

window.deleteCitizen = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this citizen? This action cannot be undone.')) {
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      console.log(`[SYS] Citizen ${id} deleted successfully`);
      await loadCitizens();
    } else {
      alert(`Error deleting citizen: ${json.error}`);
    }
  } catch (error) {
    console.error('Failed to delete citizen:', error);
    alert('Deletion API failed.');
  }
};

// 8. Event Listeners
function setupEventListeners() {
  btnRefresh.addEventListener('click', loadData);
  
  // Logout action
  btnAdminLogout.addEventListener('click', async () => {
    if (confirm('Are you sure you want to log out?')) {
      await auth.signOut().catch(() => {});
      window.location.href = 'index.html';
    }
  });

  // Sidebar tab toggling
  if (navTriage && navCitizens && navLeaderboard) {
    navTriage.addEventListener('click', (e) => {
      e.preventDefault();
      navTriage.classList.add('active');
      navCitizens.classList.remove('active');
      navLeaderboard.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      triageView.style.display = 'block';
      citizensView.style.display = 'none';
      leaderboardView.style.display = 'none';
      if (analyticsView) analyticsView.style.display = 'none';
      if (map) {
        map.invalidateSize();
      }
    });

    navCitizens.addEventListener('click', (e) => {
      e.preventDefault();
      navCitizens.classList.add('active');
      navTriage.classList.remove('active');
      navLeaderboard.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      triageView.style.display = 'none';
      citizensView.style.display = 'block';
      leaderboardView.style.display = 'none';
      if (analyticsView) analyticsView.style.display = 'none';
      loadCitizens();
    });

    navLeaderboard.addEventListener('click', (e) => {
      e.preventDefault();
      navLeaderboard.classList.add('active');
      navTriage.classList.remove('active');
      navCitizens.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      triageView.style.display = 'none';
      citizensView.style.display = 'none';
      leaderboardView.style.display = 'block';
      if (analyticsView) analyticsView.style.display = 'none';
      loadLeaderboard();
    });

    if (navAnalytics) {
      navAnalytics.addEventListener('click', (e) => {
        e.preventDefault();
        navAnalytics.classList.add('active');
        navTriage.classList.remove('active');
        navCitizens.classList.remove('active');
        navLeaderboard.classList.remove('active');
        triageView.style.display = 'none';
        citizensView.style.display = 'none';
        leaderboardView.style.display = 'none';
        analyticsView.style.display = 'block';
        loadAdminAnalytics();
      });
    }
  }

  if (btnClearDemoCitizens) {
    btnClearDemoCitizens.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete all demo users starting with "Villager #" or "Citizen #"? This will remove them from the database and leaderboard.')) {
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/users/clear-demos`, { method: 'POST' });
        const json = await res.json();
        if (json.success) {
          alert(`Successfully cleared ${json.count} demo citizens!`);
          await loadCitizens();
        } else {
          alert(`Error clearing demo citizens: ${json.error}`);
        }
      } catch (error) {
        console.error('Failed to clear demo citizens:', error);
        alert('Clear Demo API failed.');
      }
    });
  }

  const btnClearProcessedTickets = document.getElementById('btn-clear-processed-tickets');
  if (btnClearProcessedTickets) {
    btnClearProcessedTickets.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete all Resolved and Rejected/Spam reports? This will permanently remove them from the database.')) {
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/tickets/clear-processed`, { method: 'POST' });
        const json = await res.json();
        if (json.success) {
          alert(`Successfully cleared ${json.count} resolved/spam reports!`);
          await loadData();
        } else {
          alert(`Error clearing reports: ${json.error}`);
        }
      } catch (error) {
        console.error('Failed to clear processed tickets:', error);
        alert('Clear Reports API failed.');
      }
    });
  }

  // Close Modal triggers
  btnModalClose.addEventListener('click', () => {
    ticketModal.classList.remove('active');
  });

  const resolveFileInput = document.getElementById('modal-resolve-file');
  const resolveCameraInput = document.getElementById('modal-resolve-camera');
  const resolvePreviewContainer = document.getElementById('modal-resolve-preview-container');
  const resolvePreview = document.getElementById('modal-resolve-preview');
  const selectedSourceBadge = document.getElementById('selected-source-badge');

  const btnResolveCamera = document.getElementById('btn-resolve-camera');
  const btnResolveFile = document.getElementById('btn-resolve-file');

  if (btnResolveCamera) {
    btnResolveCamera.addEventListener('click', () => resolveCameraInput.click());
  }
  if (btnResolveFile) {
    btnResolveFile.addEventListener('click', () => resolveFileInput.click());
  }

  const processFile = (file, sourceName) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        selectedResolutionImageBase64 = evt.target.result;
        resolvePreview.src = selectedResolutionImageBase64;
        resolvePreviewContainer.style.display = 'block';
        if (selectedSourceBadge) {
          selectedSourceBadge.textContent = sourceName;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (resolveFileInput) {
    resolveFileInput.addEventListener('change', (e) => {
      processFile(e.target.files[0], 'Gallery/File');
      if (resolveCameraInput) resolveCameraInput.value = '';
    });
  }
  if (resolveCameraInput) {
    resolveCameraInput.addEventListener('change', (e) => {
      processFile(e.target.files[0], 'Camera');
      if (resolveFileInput) resolveFileInput.value = '';
    });
  }

  // Hamburger menu toggle for mobile
  const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  if (btnSidebarToggle && sidebar && sidebarBackdrop) {
    btnSidebarToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
      sidebarBackdrop.classList.add('active');
    });

    const closeDrawer = () => {
      sidebar.classList.remove('active');
      sidebarBackdrop.classList.remove('active');
    };

    sidebarBackdrop.addEventListener('click', closeDrawer);

    // Close drawer when sidebar nav link is clicked
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', closeDrawer);
    });
  }

  ticketModal.addEventListener('click', (e) => {
    if (e.target === ticketModal) {
      ticketModal.classList.remove('active');
    }
  });

  // Map filter checkbox change listeners
  const filterIds = ['filter-pending', 'filter-resolved', 'filter-rejected', 'filter-dustbin', 'filter-drain'];
  filterIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', renderMarkers);
    }
  });

  // Hotkey refresh (e.g. press R to refresh)
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') {
      loadData();
    }
  });
}
