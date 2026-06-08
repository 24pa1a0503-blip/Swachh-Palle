const firestore = firebase.firestore();

// Dynamic API Base URL resolution for APK or separate deployment
const API_BASE = (() => {
  if (window.location.hostname === 'localhost' && (window.location.port === '3000' || window.location.port === '')) {
    return '';
  }
  const savedUrl = localStorage.getItem('sp_backend_url');
  if (savedUrl) return savedUrl;
  return 'https://swachh-palle.onrender.com';
})();

// Translation Dictionary
const translations = {
  en: {
    app_title: "Swachh Palle",
    welcome_back: "Namaskaram!",
    welcome_sub: "Let's keep our village clean today.",
    points_label: "Points",
    clean_index: "Village Cleanliness",
    clean_index_sub: "Level Up! 5 reports resolved this week.",
    nav_analytics: "Analytics",
    analytics_title: "Village Analytics Dashboard",
    how_it_works: "How to Earn Rewards:",
    step_1: "Click 'REPORT' and take a clear picture of trash or blocked drains.",
    step_2: "Ensure GPS location is enabled before submitting.",
    step_3: "Get 50 Civic Points once the admin resolves your ticket!",
    report_button: "REPORT",
    recent_activity: "Recent Reports",
    leaderboard_title: "Top Swachh Citizens",
    civic_points: "Civic Points",
    total_reports: "Submitted",
    edit_profile: "Edit Profile",
    full_name: "Full Name",
    save_changes: "Save Changes",
    app_footer: "Building cleaner villages, together.",
    nav_home: "Home",
    nav_activity: "Activity",
    nav_profile: "Profile",
    submit_issue: "Report Waste/Issue",
    tap_photo: "Tap to capture live photo (Camera Only)",
    select_category: "Select Category",
    opt_dustbin: "🗑️ Full Dustbin",
    opt_drain: "💧 Blocked Drain",
    gps_title: "GPS Geolocation",
    gps_fetching: "Fetching current location...",
    gps_success: "GPS Location Attached Successfully",
    cancel: "Cancel",
    submit: "Submit Report",
    report_success: "Report Filed!",
    success_sub: "Thank you for helping keep our village clean. You will receive 50 points upon approval.",
    ok_button: "Awesome",
    loading: "Loading...",
    no_data: "No records found.",
    account_security: "Account Security",
    account_security_desc: "Link both your Email and Phone number so you can log in using either method without losing your points.",
    linked_email: "Linked Email",
    linked_phone: "Linked Phone",
    not_linked: "Not Linked",
    link_email: "Link Email",
    link_phone: "Link Phone",
    link_account: "Link Account",
    enter_mobile: "Enter Mobile Number",
    send_otp: "Send Verification OTP",
    enter_otp: "Enter 6-Digit OTP",
    verify_link_phone: "Verify & Link Phone",
    email_address: "Email Address",
    choose_password: "Choose Password",
    link_email_account: "Link Email Account",
    password_placeholder: "Min. 6 characters"
  },
  te: {
    app_title: "స్వచ్ఛ పల్లె",
    welcome_back: "నమస్కారం!",
    welcome_sub: "మన గ్రామాన్ని శుభ్రంగా ఉంచుకుందాం.",
    points_label: "పాయింట్లు",
    clean_index: "గ్రామ పరిశుభ్రత",
    clean_index_sub: "లెవెల్ అప్! ఈ వారం 5 నివేదికలు పరిష్కరించబడ్డాయి.",
    nav_analytics: "విశ్లేషణ",
    analytics_title: "గ్రామ విశ్లేషణ డాష్‌బోర్డ్",
    how_it_works: "రివార్డులు ఎలా సంపాదించాలి:",
    step_1: " 'నివేదించు' పై క్లిక్ చేసి, చెత్త లేదా మూసుకుపోయిన కాలువను ఫోటో తీయండి.",
    step_2: "సమర్పించే ముందు GPS లొకేషన్ ఆన్ లో ఉందని నిర్ధారించుకోండి.",
    step_3: "అడ్మిన్ మీ సమస్యను పరిష్కరించిన తర్వాత 50 సివిక్ పాయింట్లు పొందండి!",
    report_button: "నివేదించు",
    recent_activity: "ఇటీవలి నివేదికలు",
    leaderboard_title: "అగ్ర స్వచ్ఛ పౌరులు",
    civic_points: "సివిక్ పాయింట్లు",
    total_reports: "సమర్పించినవి",
    edit_profile: "ప్రొఫైల్ సవరించండి",
    full_name: "పూర్తి పేరు",
    save_changes: "మార్పులను సేవ్ చేయి",
    app_footer: "కలిసికట్టుగా మన గ్రామాన్ని శుభ్రంగా ఉంచుకుందాం.",
    nav_home: "హోమ్",
    nav_activity: "యాక్టివిటీ",
    nav_profile: "ప్రొఫైల్",
    submit_issue: "సమస్యను నివేదించండి",
    tap_photo: "లైవ్ ఫోటో తీయడానికి ట్యాప్ చేయండి (కెమెరా మాత్రమే)",
    select_category: "వర్గాన్ని ఎంచుకోండి",
    opt_dustbin: "🗑️ నిండిన చెత్తబుట్ట",
    opt_drain: "💧 మూసుకుపోయిన కాలువ",
    gps_title: "GPS జియోలొకేషన్",
    gps_fetching: "ప్రస్తుత స్థానాన్ని గుర్తిస్తోంది...",
    gps_success: "GPS లొకేషన్ జోడించబడింది",
    cancel: "రద్దు చేయి",
    submit: "సమర్పించండి",
    report_success: "నివేదిక దాఖలైంది!",
    success_sub: "మన గ్రామాన్ని శుభ్రంగా ఉంచడంలో సహాయపడినందుకు ధన్యవాదాలు. ఆమోదం పొందిన తర్వాత మీకు 50 పాయింట్లు వస్తాయి.",
    ok_button: "అద్భుతం",
    loading: "లోడ్ అవుతోంది...",
    no_data: "రికార్డులు ఏవీ లేవు.",
    account_security: "ఖాతా భద్రత",
    account_security_desc: "మీ పాయింట్లను కోల్పోకుండా ఏ పద్ధతి ద్వారా అయినా లాగిన్ అవ్వడానికి మీ ఈమెయిల్ మరియు ఫోన్ నంబర్ రెండింటినీ లింక్ చేయండి.",
    linked_email: "లింక్ చేసిన ఈమెయిల్",
    linked_phone: "లింక్ చేసిన ఫోన్",
    not_linked: "లింక్ చేయబడలేదు",
    link_email: "ఈమెయిల్ లింక్ చేయి",
    link_phone: "ఫోన్ లింక్ చేయి",
    link_account: "ఖాతాను లింక్ చేయి",
    enter_mobile: "మొబైల్ నంబర్ నమోదు చేయండి",
    send_otp: "ధృవీకరణ OTP పంపండి",
    enter_otp: "6-అంకెల OTPని నమోదు చేయండి",
    verify_link_phone: "ఫోన్ ధృవీకరించి లింక్ చేయి",
    email_address: "ఈమెయిల్ చిరునామా",
    choose_password: "పాస్‌వర్డ్ ఎంచుకోండి",
    link_email_account: "ఈమెయిల్ ఖాతాను లింక్ చేయి",
    password_placeholder: "కనీసం 6 అక్షరాలు"
  }
};

// State Variables
let currentLang = 'en';
let currentUser = {
  id: '',
  name: 'Citizen',
  civicPoints: 0
};
let currentCoords = {
  latitude: 16.5062,
  longitude: 80.6480
};
let base64Image = '';
let confirmationResult = null;

// Dom Elements
const langToggleBtn = document.getElementById('lang-toggle');
const tabPanels = document.querySelectorAll('.tab-panel');
const userPointsDisplay = document.getElementById('user-points-display');
const profilePointsDisplay = document.getElementById('profile-points-display');
const profileReportsCount = document.getElementById('profile-reports-count');
const profileNameTitle = document.getElementById('profile-name-title');
const profileIdDisplay = document.getElementById('profile-id-display');
const inputDisplayName = document.getElementById('input-display-name');
const editProfileForm = document.getElementById('edit-profile-form');

const btnReportFab = document.getElementById('btn-report-fab');
const reportDialog = document.getElementById('report-dialog');
const btnDialogClose = document.getElementById('btn-dialog-close');
const btnReportCancel = document.getElementById('btn-report-cancel');
const reportForm = document.getElementById('report-form');
const photoUploadZone = document.getElementById('photo-upload-zone');
const cameraInput = document.getElementById('camera-input');
const capturedPreview = document.getElementById('captured-preview');
const uploadPromptText = document.getElementById('upload-prompt-text');
const locCoordsDisplay = document.getElementById('loc-coords-display');
const locIcon = document.getElementById('loc-icon');

const successDialog = document.getElementById('success-dialog');
const btnSuccessClose = document.getElementById('btn-success-close');

// Authentication Elements
const btnLogout = document.getElementById('btn-logout');

// Initial Setup
function initializeApp() {
  setupLanguage();
  setupTabs();
  setupUploadFlow();
  setupAuthMonitor();
  setupAccountLinking();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 1. Authentication Monitor
function setupAuthMonitor() {
  // Monitor Auth State
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      console.log('[AUTH] User is active:', user.uid);
      await syncUserProfile(user);
      fetchTickets();
      btnLogout.style.display = 'block';
    } else {
      console.log('[AUTH] No user logged in, redirecting...');
      window.location.href = 'login.html';
    }
  });

  // Logout button listener
  btnLogout.addEventListener('click', async () => {
    if (confirm('Are you sure you want to log out?')) {
      await auth.signOut().catch(() => {});
      window.location.href = 'login.html';
    }
  });
}

async function syncUserProfile(firebaseUser) {
  currentUser.id = firebaseUser.uid;
  profileIdDisplay.textContent = currentUser.id;

  const identifier = firebaseUser.email || firebaseUser.phoneNumber || 'N/A';
  const displayIdField = document.getElementById('input-display-identifier');
  if (displayIdField) {
    displayIdField.value = identifier;
  }

  // Set default display name if localstorage has one, otherwise fallback
  const cachedName = localStorage.getItem('sp_user_name') || `Villager #${firebaseUser.uid.slice(-4)}`;
  currentUser.name = cachedName;

  // Account Security status updates
  const providerData = firebaseUser.providerData || [];
  let emailVal = '';
  let phoneVal = '';
  providerData.forEach(p => {
    if (p.providerId === 'password') emailVal = p.email;
    if (p.providerId === 'phone') phoneVal = p.phoneNumber;
  });
  if (!emailVal && firebaseUser.email) emailVal = firebaseUser.email;
  if (!phoneVal && firebaseUser.phoneNumber) phoneVal = firebaseUser.phoneNumber;

  const linkedEmailStatus = document.getElementById('linked-email-status');
  const btnLinkEmailEl = document.getElementById('btn-link-email');
  const linkedPhoneStatus = document.getElementById('linked-phone-status');
  const btnLinkPhoneEl = document.getElementById('btn-link-phone');

  if (linkedEmailStatus && btnLinkEmailEl) {
    if (emailVal) {
      linkedEmailStatus.textContent = emailVal;
      linkedEmailStatus.removeAttribute('data-i18n');
      btnLinkEmailEl.style.display = 'none';
    } else {
      linkedEmailStatus.setAttribute('data-i18n', 'not_linked');
      linkedEmailStatus.textContent = translations[currentLang].not_linked;
      btnLinkEmailEl.style.display = 'block';
    }
  }

  if (linkedPhoneStatus && btnLinkPhoneEl) {
    if (phoneVal) {
      linkedPhoneStatus.textContent = phoneVal;
      linkedPhoneStatus.removeAttribute('data-i18n');
      btnLinkPhoneEl.style.display = 'none';
    } else {
      linkedPhoneStatus.setAttribute('data-i18n', 'not_linked');
      linkedPhoneStatus.textContent = translations[currentLang].not_linked;
      btnLinkPhoneEl.style.display = 'block';
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: firebaseUser.uid, name: currentUser.name })
    });
    const json = await res.json();
    if (json.success && json.data) {
      currentUser = json.data;
      updateUIWithUserData();
    }
  } catch (error) {
    console.error('Error syncing user profile with backend:', error);
  }
}

function updateUIWithUserData() {
  userPointsDisplay.textContent = currentUser.civicPoints || 0;
  profilePointsDisplay.textContent = currentUser.civicPoints || 0;
  profileNameTitle.textContent = currentUser.name;
  inputDisplayName.value = currentUser.name;
}

// 2. Language Handling
function setupLanguage() {
  langToggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'te' : 'en';
    langToggleBtn.textContent = currentLang === 'en' ? 'తెలుగు' : 'English';
    translatePage();
  });
}

function translatePage() {
  const dict = translations[currentLang];
  
  // Find all elements with data-i18n and replace text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'OPTION') {
        el.text = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Handle placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  if (currentLang === 'te') {
    inputDisplayName.placeholder = "మీ పేరు నమోదు చేయండి";
  } else {
    inputDisplayName.placeholder = "Enter your name";
  }
}

// 3. Tab Navigation & Rendering lists
function setupTabs() {
  const tabButtons = document.querySelectorAll('.nav-item');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      if (!targetTab) return;

      // Sync active state on all buttons targeting targetTab
      tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === targetTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Show target tab panel
      tabPanels.forEach(panel => {
        if (panel.id === targetTab) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });

      if (targetTab === 'tab-activity') {
        fetchTickets();
        fetchLeaderboard();
      } else if (targetTab === 'tab-analytics') {
        fetchTickets();
      } else if (targetTab === 'tab-profile') {
        loadUserProfile();
      }
    });
  });

  // Profile Edit form listener
  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = inputDisplayName.value.trim();
    if (!newName) return;

    try {
      const res = await fetch(`${API_BASE}/api/users/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, name: newName })
      });
      const json = await res.json();
      if (json.success) {
        currentUser = json.data;
        localStorage.setItem('sp_user_name', currentUser.name);
        updateUIWithUserData();
        alert(currentLang === 'en' ? 'Profile updated successfully!' : 'ప్రొఫైల్ విజయవంతంగా నవీకరించబడింది!');
      }
    } catch (e) {
      console.error(e);
    }
  });
}

async function fetchTickets() {
  const ticketsList = document.getElementById('tickets-list');
  ticketsList.innerHTML = `<div class="list-placeholder">${translations[currentLang].loading}</div>`;

  try {
    const res = await fetch(`${API_BASE}/api/tickets`);
    const json = await res.json();
    if (json.success && json.data) {
      const tickets = json.data;
      
      // Update submitted count in profile
      const userTickets = tickets.filter(t => t.reporterId === currentUser.id);
      profileReportsCount.textContent = userTickets.length;

      // Calculate Cleanliness Index and Analytics
      const pendingCount = tickets.filter(t => t.status === 'Pending').length;
      const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
      const validTickets = resolvedCount + pendingCount;
      const cleanlinessIndex = validTickets > 0 ? Math.round((resolvedCount / validTickets) * 100) : 100;

      // Update home card
      const pctEl = document.getElementById('cleanliness-percentage');
      const barEl = document.getElementById('cleanliness-progress-bar');
      const footerEl = document.getElementById('cleanliness-footer');
      if (pctEl) pctEl.textContent = `${cleanlinessIndex}%`;
      if (barEl) barEl.style.width = `${cleanlinessIndex}%`;
      if (footerEl) {
        if (currentLang === 'en') {
          footerEl.textContent = `${resolvedCount} of ${validTickets} issues resolved`;
        } else {
          footerEl.textContent = `${validTickets} సమస్యలలో ${resolvedCount} పరిష్కరించబడ్డాయి`;
        }
      }

      // Update Analytics tab
      const dustbinCount = tickets.filter(t => t.category.includes('Dustbin')).length;
      const drainCount = tickets.filter(t => t.category.includes('Drain')).length;
      const totalCount = tickets.length;
      
      const maxCount = Math.max(dustbinCount, drainCount, 1);
      const dustbinPercent = Math.round((dustbinCount / maxCount) * 100);
      const drainPercent = Math.round((drainCount / maxCount) * 100);

      const elTotal = document.getElementById('analytics-total-count');
      const elResolved = document.getElementById('analytics-resolved-count');
      const elPending = document.getElementById('analytics-pending-count');
      const elScore = document.getElementById('analytics-cleanliness-score');
      const elBar = document.getElementById('analytics-cleanliness-bar');
      const elDustbinCount = document.getElementById('analytics-dustbin-count');
      const elDustbinBar = document.getElementById('analytics-dustbin-bar');
      const elDrainCount = document.getElementById('analytics-drain-count');
      const elDrainBar = document.getElementById('analytics-drain-bar');
      const elMyReports = document.getElementById('analytics-my-reports');
      const elMyPoints = document.getElementById('analytics-my-points');

      if (elTotal) elTotal.textContent = totalCount;
      if (elResolved) elResolved.textContent = resolvedCount;
      if (elPending) elPending.textContent = pendingCount;
      if (elScore) elScore.textContent = `${cleanlinessIndex}%`;
      if (elBar) elBar.style.width = `${cleanlinessIndex}%`;
      
      if (elDustbinCount) elDustbinCount.textContent = dustbinCount;
      if (elDustbinBar) elDustbinBar.style.width = `${dustbinPercent}%`;
      if (elDrainCount) elDrainCount.textContent = drainCount;
      if (elDrainBar) elDrainBar.style.width = `${drainPercent}%`;

      if (elMyReports) elMyReports.textContent = userTickets.length;
      if (elMyPoints) elMyPoints.textContent = currentUser.civicPoints || 0;

      if (tickets.length === 0) {
        ticketsList.innerHTML = `<div class="list-placeholder">${translations[currentLang].no_data}</div>`;
        return;
      }

      ticketsList.innerHTML = tickets.map(ticket => {
        const isResolved = ticket.status === 'Resolved';
        const isRejected = ticket.status === 'Rejected';
        
        let badgeClass = 'ongoing';
        let badgeText = currentLang === 'en' ? 'Ongoing' : 'ప్రగతిలో ఉంది';
        let badgeIcon = 'pending';

        if (isResolved) {
          badgeClass = 'resolved';
          badgeText = currentLang === 'en' ? 'Resolved' : 'పరిష్కరించబడింది';
          badgeIcon = 'check_circle';
        } else if (isRejected) {
          badgeClass = 'rejected';
          badgeText = currentLang === 'en' ? 'Spam' : 'నిరాకరించబడింది';
          badgeIcon = 'cancel';
        }

        const categoryTranslation = ticket.category.includes('Drain') 
          ? (currentLang === 'en' ? '💧 Blocked Drain' : '💧 మూసుకుపోయిన కాలువ')
          : (currentLang === 'en' ? '🗑️ Full Dustbin' : '🗑️ నిండిన చెత్తబుట్ట');

        // Formatted Date
        const dateStr = new Date(ticket.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Set fallback thumbnail image
        const imgUrl = ticket.imageUrl || 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=100';

        let imageHtml = `<img src="${imgUrl}" class="ticket-image-thumb" alt="waste photo">`;
        if (isResolved && ticket.resolvedImageUrl) {
          imageHtml = `
            <div class="ticket-images-comparison" style="display: flex; gap: 6px; margin-right: 12px;">
              <div style="position: relative; width: 48px; height: 48px;">
                <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);" alt="Before">
                <span style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 7px; text-align: center; font-weight: 800; padding: 1px 0; border-radius: 0 0 6px 6px;">BEFORE</span>
              </div>
              <div style="position: relative; width: 48px; height: 48px;">
                <img src="${ticket.resolvedImageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);" alt="After">
                <span style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(22, 163, 74, 0.9); color: white; font-size: 7px; text-align: center; font-weight: 800; padding: 1px 0; border-radius: 0 0 6px 6px;">AFTER</span>
              </div>
            </div>
          `;
        }

        return `
          <div class="ticket-card">
            <div class="ticket-left">
              ${imageHtml}
              <div class="ticket-details">
                <span class="ticket-cat">${categoryTranslation}</span>
                <span class="ticket-id">ID: ${ticket.id}</span>
                <span class="ticket-time">${dateStr}</span>
              </div>
            </div>
            <div class="status-badge ${badgeClass}">
              <span class="material-symbols-outlined">${badgeIcon}</span>
              ${badgeText}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error fetching tickets:', error);
    ticketsList.innerHTML = `<div class="list-placeholder">Error loading tickets.</div>`;
  }
}

async function fetchLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');
  leaderboardList.innerHTML = `<div class="list-placeholder">${translations[currentLang].loading}</div>`;

  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`);
    const json = await res.json();
    if (json.success && json.data) {
      const leaders = json.data;

      if (leaders.length === 0) {
        leaderboardList.innerHTML = `<div class="list-placeholder">${translations[currentLang].no_data}</div>`;
        return;
      }

      leaderboardList.innerHTML = leaders.map((user, idx) => {
        const isSelf = user.id === currentUser.id ? 'style="background-color: rgba(22, 163, 74, 0.05); font-weight: bold;"' : '';
        const name = user.name + (user.id === currentUser.id ? ' (You)' : '');
        return `
          <div class="leaderboard-row" ${isSelf}>
            <div class="leader-left">
              <span class="leader-rank">${idx + 1}</span>
              <span class="leader-name">${name}</span>
            </div>
            <span class="leader-points">
              ${user.civicPoints || 0}
              <span class="material-symbols-outlined">stars</span>
            </span>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  }
}

// 4. Report & Upload Flow
function setupUploadFlow() {
  // Open dialog
  btnReportFab.addEventListener('click', () => {
    reportDialog.classList.add('active');
    triggerLocation();
    resetUploadForm();
  });

  // Close dialog buttons
  btnDialogClose.addEventListener('click', () => reportDialog.classList.remove('active'));
  btnReportCancel.addEventListener('click', () => reportDialog.classList.remove('active'));

  // Trigger file picker
  photoUploadZone.addEventListener('click', () => {
    cameraInput.click();
  });

  // Capture Image
  cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        base64Image = evt.target.result;
        capturedPreview.src = base64Image;
        capturedPreview.style.display = 'block';
        uploadPromptText.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  // Submit form
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!base64Image) {
      alert(currentLang === 'en' ? 'Please upload a photo of the issue first!' : 'దయచేసి ముందుగా సమస్య ఫోటోను అప్‌లోడ్ చేయండి!');
      return;
    }

    const category = document.getElementById('category-select').value;
    const btnSubmit = document.getElementById('btn-report-submit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = currentLang === 'en' ? 'Submitting...' : 'సమర్పిస్తోంది...';

    const payload = {
      category: category,
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      image: base64Image,
      reporterId: currentUser.id
    };

    try {
      const res = await fetch(`${API_BASE}/api/tickets/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        // Success flow
        reportDialog.classList.remove('active');
        
        const successSub = document.querySelector('#success-dialog p');
        if (json.duplicate) {
          successSub.textContent = currentLang === 'en' 
            ? `Thank you for your report! Someone nearby has already reported this issue, and the cleanup is being scheduled. We have linked your report to help prioritize this cleanup. Thank you for helping keep our village clean!`
            : `మీ నివేదికకు ధన్యవాదాలు! సమీపంలో ఎవరో ఇప్పటికే ఈ సమస్యను నివేదించారు మరియు శుభ్రపరిచే ప్రక్రియ షెడ్యూల్ చేయబడింది. ఈ సమస్య పరిష్కార ప్రాధాన్యతను పెంచడానికి మీ నివేదికను కూడా దీనికి అనుసంధానించాము. మన పల్లెను శుభ్రంగా ఉంచడంలో సహాయపడినందుకు ధన్యవాదాలు!`;
        } else {
          successSub.textContent = translations[currentLang].success_sub;
        }

        successDialog.classList.add('active');
        loadUserProfile(); // Re-sync points
      } else {
        alert(json.error || (currentLang === 'en' ? 'Failed to submit report. Please try again.' : 'నివేదికను సమర్పించడంలో విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.'));
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting report. Check server connection.');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = translations[currentLang].submit;
    }
  });

  // Success dialog close
  btnSuccessClose.addEventListener('click', () => {
    successDialog.classList.remove('active');
  });
}

async function loadUserProfile() {
  if (auth.currentUser) {
    await syncUserProfile(auth.currentUser);
  }
}

function resetUploadForm() {
  base64Image = '';
  cameraInput.value = '';
  capturedPreview.src = '';
  capturedPreview.style.display = 'none';
  uploadPromptText.style.display = 'flex';
  document.getElementById('category-select').selectedIndex = 0;
}

// GPS Location Acquisition
function triggerLocation() {
  locCoordsDisplay.textContent = translations[currentLang].gps_fetching;
  locIcon.classList.remove('text-green');
  locIcon.classList.add('pulse-icon');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentCoords.latitude = position.coords.latitude;
        currentCoords.longitude = position.coords.longitude;
        
        locCoordsDisplay.textContent = `${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}`;
        locIcon.classList.add('text-green');
        locIcon.classList.remove('pulse-icon');
        console.log('GPS Coords attached:', currentCoords);
      },
      (error) => {
        console.warn('Geolocation failed or denied, using mock rural location. Code:', error.code);
        // Generate coordinates close to rural Vijayawada AP (16.5062, 80.6480) for testing
        const offsetLat = (Math.random() - 0.5) * 0.05;
        const offsetLng = (Math.random() - 0.5) * 0.05;
        currentCoords.latitude = 16.5062 + offsetLat;
        currentCoords.longitude = 80.6480 + offsetLng;

        locCoordsDisplay.textContent = `${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)} (Mock GPS)`;
        locIcon.classList.add('text-green');
        locIcon.classList.remove('pulse-icon');
      },
      { timeout: 8000 }
    );
  } else {
    // Geolocation not supported
    locCoordsDisplay.textContent = 'Geolocation not supported. Using Mock GPS.';
    locIcon.classList.add('text-green');
    locIcon.classList.remove('pulse-icon');
  }
}

// 5. Account Linking Setup & Logic
function setupAccountLinking() {
  const btnLinkEmail = document.getElementById('btn-link-email');
  const btnLinkPhone = document.getElementById('btn-link-phone');
  const linkDialog = document.getElementById('link-dialog');
  const btnLinkDialogClose = document.getElementById('btn-link-dialog-close');

  const linkPhoneFormContainer = document.getElementById('link-phone-form-container');
  const linkEmailFormContainer = document.getElementById('link-email-form-container');
  const linkDialogTitle = document.getElementById('link-dialog-title');

  const btnSendLinkOtp = document.getElementById('btn-send-link-otp');
  const btnVerifyLinkOtp = document.getElementById('btn-verify-link-otp');
  const btnSubmitLinkEmail = document.getElementById('btn-submit-link-email');

  if (!btnLinkEmail || !btnLinkPhone || !linkDialog || !btnLinkDialogClose) return;

  let linkRecaptchaVerifier = null;
  let linkConfirmationResult = null;

  btnLinkEmail.addEventListener('click', () => {
    linkDialog.classList.add('active');
    linkDialogTitle.setAttribute('data-i18n', 'link_email_account');
    linkDialogTitle.textContent = translations[currentLang].link_email_account;
    linkEmailFormContainer.style.display = 'flex';
    linkPhoneFormContainer.style.display = 'none';
    
    // Clear any previous values
    document.getElementById('link-email-input').value = '';
    document.getElementById('link-password-input').value = '';
  });

  btnLinkPhone.addEventListener('click', () => {
    linkDialog.classList.add('active');
    linkDialogTitle.setAttribute('data-i18n', 'link_phone');
    linkDialogTitle.textContent = translations[currentLang].link_phone;
    linkEmailFormContainer.style.display = 'none';
    linkPhoneFormContainer.style.display = 'flex';
    
    // Clear previous values
    document.getElementById('link-phone-input').value = '';
    document.getElementById('link-otp-input').value = '';
    document.getElementById('link-otp-group').style.display = 'none';

    // Initialize invisible recaptcha
    if (!linkRecaptchaVerifier) {
      try {
        linkRecaptchaVerifier = new firebase.auth.RecaptchaVerifier('link-recaptcha-container', {
          size: 'invisible',
          callback: (response) => {
            console.log('reCAPTCHA solved for linking');
          }
        });
      } catch (err) {
        console.error('Error creating linkRecaptchaVerifier:', err);
      }
    }
  });

  btnLinkDialogClose.addEventListener('click', () => {
    linkDialog.classList.remove('active');
  });

  // Handle Send OTP
  btnSendLinkOtp.addEventListener('click', async () => {
    let phoneNumber = document.getElementById('link-phone-input').value.trim();
    if (!phoneNumber) {
      alert('Please enter a valid phone number.');
      return;
    }
    
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.length === 10) {
        phoneNumber = '+91' + phoneNumber;
      } else {
        alert('Please enter a valid phone number with country code (e.g. +919876543210)');
        return;
      }
    }

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to link accounts.');
      return;
    }

    btnSendLinkOtp.disabled = true;
    btnSendLinkOtp.textContent = 'Sending...';

    user.linkWithPhoneNumber(phoneNumber, linkRecaptchaVerifier)
      .then((verificationResult) => {
        linkConfirmationResult = verificationResult;
        document.getElementById('link-otp-group').style.display = 'flex';
        alert('OTP sent successfully. Please enter the verification code.');
      })
      .catch((error) => {
        console.error('Phone linking send OTP error:', error);
        btnSendLinkOtp.disabled = false;
        btnSendLinkOtp.textContent = 'Send Verification OTP';
        
        // Reset/recreate recaptcha if it fails
        if (linkRecaptchaVerifier) {
          try {
            linkRecaptchaVerifier.clear();
          } catch(e) {}
          linkRecaptchaVerifier = null;
        }

        if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/phone-number-already-in-use') {
          alert('This phone number is already linked to another Swachh Palle account. Please use a different number or log in directly with this phone.');
        } else {
          alert('Error sending OTP: ' + error.message);
        }
      });
  });

  // Handle Verify OTP
  btnVerifyLinkOtp.addEventListener('click', async () => {
    const code = document.getElementById('link-otp-input').value.trim();
    if (!code || code.length !== 6) {
      alert('Please enter the 6-digit OTP code.');
      return;
    }

    if (!linkConfirmationResult) {
      alert('Please send OTP first.');
      return;
    }

    btnVerifyLinkOtp.disabled = true;
    btnVerifyLinkOtp.textContent = 'Verifying...';

    linkConfirmationResult.confirm(code)
      .then(async (result) => {
        alert('Phone number linked successfully!');
        linkDialog.classList.remove('active');
        await syncUserProfile(auth.currentUser);
      })
      .catch((error) => {
        console.error('OTP confirmation error:', error);
        btnVerifyLinkOtp.disabled = false;
        btnVerifyLinkOtp.textContent = 'Verify & Link Phone';
        if (error.code === 'auth/credential-already-in-use' || error.code === 'auth/phone-number-already-in-use') {
          alert('This phone number is already linked to another Swachh Palle account. Please use a different number or log in directly with this phone.');
        } else if (error.code === 'auth/requires-recent-login') {
          alert('This operation is sensitive and requires recent authentication. Please log out and log back in before attempting to link accounts.');
        } else {
          alert('Invalid verification code or link failed. Please try again.');
        }
      });
  });

  // Handle Link Email
  btnSubmitLinkEmail.addEventListener('click', async () => {
    const email = document.getElementById('link-email-input').value.trim();
    const password = document.getElementById('link-password-input').value.trim();

    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to link accounts.');
      return;
    }

    btnSubmitLinkEmail.disabled = true;
    btnSubmitLinkEmail.textContent = 'Linking...';

    const credential = firebase.auth.EmailAuthProvider.credential(email, password);

    user.linkWithCredential(credential)
      .then(async (result) => {
        alert('Email account linked successfully!');
        linkDialog.classList.remove('active');
        await syncUserProfile(auth.currentUser);
      })
      .catch((error) => {
        console.error('Email linking error:', error);
        btnSubmitLinkEmail.disabled = false;
        btnSubmitLinkEmail.textContent = 'Link Email Account';
        
        if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
          alert('This email address is already linked to another Swachh Palle account. Please use a different email.');
        } else if (error.code === 'auth/weak-password') {
          alert('Password is too weak. Please choose a password with at least 6 characters.');
        } else if (error.code === 'auth/invalid-email') {
          alert('Please enter a valid email address.');
        } else if (error.code === 'auth/requires-recent-login') {
          alert('This operation is sensitive and requires recent authentication. Please log out and log back in before attempting to link accounts.');
        } else {
          alert('Error linking email: ' + error.message);
        }
      });
  });
}
