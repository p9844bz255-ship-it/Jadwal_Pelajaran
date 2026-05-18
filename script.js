// ==========================================================================
// TEMPELKAN URL DEPLOYMENT APPS SCRIPT ANDA DI BAWAH INI
// ==========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxvVZ_0HN5y6p4t1Ga654-SSdXGgMH-MWUe5g2BpqVYRWpRX3qBP7y49axCL2OJwXU8TA/exec";

let RAW_DATA = [];
let TEMATIK_DATA = null;
let isDataLoaded = false;
let isTematikLoaded = false;

// Variabel global untuk menyimpan nama lengkap hasil pencarian & deteksi tipe kelas
let currentExactMatch = "";
let isKelasSearch = false; 

window.onload = function() {
  // --------------------------------------------------------------------------
  // LOGIKA DETEKSI PERANGKAT UNTUK CETAK PDF (HP vs DESKTOP)
  // --------------------------------------------------------------------------
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobileDevice) {
    document.body.classList.add('cetak-hp');
  } else {
    document.body.classList.add('cetak-desktop');
  }
  // --------------------------------------------------------------------------

  const searchInput = document.getElementById('searchInput');
  
  searchInput.placeholder = "⏳ Memuat database jadwal...";
  searchInput.disabled = true;

  fetch(`${API_URL}?action=jadwalBiasa`)
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      RAW_DATA = data;
      isDataLoaded = true;
      searchInput.placeholder = "Ketik nama atau kelas...";
      searchInput.disabled = false;
    })
    .catch(error => {
      console.error("Gagal sinkronisasi data umum:", error);
      searchInput.placeholder = "❌ Sistem gagal terkoneksi.";
    });

  fetch(`${API_URL}?action=jadwalTematik`)
    .then(response => response.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      TEMATIK_DATA = data;
      isTematikLoaded = true;
      buildPekanDropdownOptions();
    })
    .catch(error => console.error("Gagal sinkronisasi data tematik:", error));
};

// ==========================================================================
// UTILITAS & EVENT LISTENER
// ==========================================================================
window.addEventListener('resize', () => {
  syncCardHeights('resultsGrid');
  syncCardHeights('resultsTematikGrid');
});

function getTodayString() {
  const dayIndex = new Date().getDay();
  const daysMap = ['SABTU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU'];
  return daysMap[dayIndex];
}

function parseRangeTanggal(strTanggalRaw) {
  if (!strTanggalRaw) return null;
  try {
    const cleanStr = strTanggalRaw.toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
    const tokens = cleanStr.split('-');
    if(tokens.length < 2) return null;

    const endPart = tokens[1].trim(); 
    const endTokens = endPart.split(/\s+/); 
    
    let tahun = parseInt(endTokens[endTokens.length - 1]);
    let namaBulan = endTokens[endTokens.length - 2];
    let tglAkhir = parseInt(endTokens[0]);
    let tglAwal = parseInt(tokens[0].trim());
    
    const daftarBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    let idxBulan = daftarBulan.indexOf(namaBulan);
    if(idxBulan === -1) {
      idxBulan = daftarBulan.findIndex(b => b.includes(namaBulan) || namaBulan.includes(b));
      if(idxBulan === -1) idxBulan = new Date().getMonth(); 
    }
    
    if(isNaN(tahun)) tahun = new Date().getFullYear();

    const dateAwal = new Date(tahun, idxBulan, tglAwal);
    const dateAkhir = new Date(tahun, idxBulan, tglAkhir);
    
    return { start: dateAwal, end: dateAkhir };
  } catch(e) {
    return null;
  }
}

function buildPekanDropdownOptions() {
  if (!TEMATIK_DATA || !TEMATIK_DATA.headers) return;
  const select = document.getElementById('pekanSelect');
  select.innerHTML = "";
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let targetDate = new Date(today);
  if(today.getDay() === 6) targetDate.setDate(today.getDate() + 2); 
  else if(today.getDay() === 0) targetDate.setDate(today.getDate() + 1); 

  let selectedPekanName = "";

  TEMATIK_DATA.headers.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.pekan;
    const range = parseRangeTanggal(h.tanggalRaw);
    const isCurrentWeek = (range && targetDate >= range.start && targetDate <= range.end);
    
    if(isCurrentWeek) {
      selectedPekanName = h.pekan;
      opt.text = `📌 ${h.pekan} (${h.tanggalRaw}) - Pekan Ini`;
      opt.className = "dropdown-current-week";
    } else {
      opt.text = `${h.pekan} (${h.tanggalRaw})`;
    }
    select.appendChild(opt);
  });

  if(selectedPekanName !== "") select.value = selectedPekanName;
  else if(TEMATIK_DATA.headers.length > 0) select.value = TEMATIK_DATA.headers[0].pekan;
}

function initTematikView() {
  if(!isTematikLoaded) {
    document.getElementById('initialStateTematik').style.display = "block";
    setTimeout(initTematikView, 400);
    return;
  }
  document.getElementById('initialStateTematik').style.display = "none";
  handleTematikGridFilter();
}

function clearTematikSearch() {
  document.getElementById('searchTematikInput').value = '';
  handleTematikGridFilter();
}

function formatTimeLeftColumn(timeStr) {
  if (!timeStr) return "-";
  let parts = timeStr.split('-');
  if (parts.length === 2) return `${parts[0].trim()} -\n${parts[1].trim()}`;
  return timeStr;
}

function syncCardHeights(containerId) {
  if (window.innerWidth <= 768) {
      const container = document.getElementById(containerId);
      if(container) container.querySelectorAll('.card').forEach(c => c.style.height = 'auto');
      return;
  }

  const container = document.getElementById(containerId);
  if (!container) return;

  const allCards = container.querySelectorAll('.card');
  if (allCards.length === 0) return;

  allCards.forEach(c => c.style.height = 'auto');

  let maxJpFound = 0;
  allCards.forEach(c => {
      const jpVal = parseInt(c.getAttribute('data-jp') || 0);
      if (jpVal > maxJpFound) maxJpFound = jpVal;
  });

  for (let i = 1; i <= maxJpFound; i++) {
      const cardsInRow = container.querySelectorAll(`.card[data-jp="${i}"]`);
      if (cardsInRow.length === 0) continue;

      let maxHeight = 0;
      cardsInRow.forEach(c => {
          if (c.offsetHeight > maxHeight) maxHeight = c.offsetHeight;
      });

      cardsInRow.forEach(c => {
          c.style.height = maxHeight + 'px';
      });
  }
}

// ==========================================================================
// PROSES DATA & LOGIK FILTER JADWAL TEMATIK
// ==========================================================================
function handleTematikGridFilter() {
  if (!isTematikLoaded || !TEMATIK_DATA) return;

  const query = document.getElementById('searchTematikInput').value.toLowerCase().trim();
  const selectedPekan = document.getElementById('pekanSelect').value;
  const container = document.getElementById('resultsTematikGrid');
  const clearTematikBtn = document.getElementById('clearTematikBtn');

  if(clearTematikBtn) clearTematikBtn.style.display = query.length > 0 ? "flex" : "none";

  let isTematikKelasSearch = false;
  if (query !== "") {
    isTematikKelasSearch = TEMATIK_DATA.rows.some(r => r.kelas.toLowerCase().includes(query));
  }

  const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT"];
  const currentDayString = getTodayString(); 
  container.innerHTML = "";
  container.style.display = "flex"; 

  let activeDaysData = [];
  let globalMaxJp = 0; 

  days.forEach(day => {
    let dayRows = TEMATIK_DATA.rows.filter(r => r.hari === day);
    if(dayRows.length === 0) return;

    let jpGroupsMatch = {};
    let hasMatchForDay = false;
    
    dayRows.forEach(row => {
      const cell = row.jadwalPekan[selectedPekan];
      if (!cell || !cell.mapel || cell.fullText === "-") return;

      let isMatch = false;
      if (query !== "") {
          isMatch = cell.guru.toLowerCase().includes(query) || 
                    cell.mapel.toLowerCase().includes(query) || 
                    row.kelas.toLowerCase().includes(query);
      } else {
          isMatch = true;
      }

      if (isMatch) {
          hasMatchForDay = true;
          if (!jpGroupsMatch[row.jp]) jpGroupsMatch[row.jp] = [];
          jpGroupsMatch[row.jp].push({
              kelas: row.kelas.replace(/kelas\s+/i, '').trim(),
              mapel: cell.mapel,
              guru: cell.guru,
              waktu: row.waktu 
          });
      }
    });

    if (hasMatchForDay || query === "") {
        let localMax = 0;
        TEMATIK_DATA.rows.filter(r => r.hari === day).forEach(r => {
            let j = parseInt(r.jp);
            if(!isNaN(j) && j > localMax) localMax = j;
        });
        
        if(localMax > globalMaxJp) globalMaxJp = localMax;

        activeDaysData.push({
            day: day,
            dayRows: dayRows,
            jpGroupsMatch: jpGroupsMatch
        });
    }
  });

  if (activeDaysData.length === 0) {
    container.style.display = "none";
    const initTematik = document.getElementById('initialStateTematik');
    initTematik.innerHTML = `<p style="font-size: 15px; color: var(--text-muted);">Tidak ada jadwal pelajaran tematik yang cocok dengan pencarian.</p>`;
    initTematik.style.display = "block";
    return;
  }

  document.getElementById('initialStateTematik').style.display = "none";

  const activeDays = activeDaysData.map(d => d.day);
  let defaultActiveDay = activeDays.includes(currentDayString) ? currentDayString : activeDays[0];

  const mobileTabsContainer = document.createElement('div');
  mobileTabsContainer.className = 'mobile-day-tabs';
  
  const daysWrapper = document.createElement('div');
  daysWrapper.className = 'days-wrapper';

  const btnSemua = document.createElement('button');
  btnSemua.className = `tab-btn`;
  btnSemua.innerText = "SEMUA";
  btnSemua.onclick = () => {
      mobileTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btnSemua.classList.add('active');
      daysWrapper.querySelectorAll('.day-column').forEach(c => c.classList.add('active-mobile-day'));
      daysWrapper.classList.add('show-all-mobile');
  };
  mobileTabsContainer.appendChild(btnSemua);

  activeDays.forEach((day) => {
      const shortDay = day.replace("'", "").substring(0,3).toUpperCase();
      const btn = document.createElement('button');
      btn.className = `tab-btn ${day === defaultActiveDay ? 'active' : ''}`;
      btn.innerText = shortDay;
      
      const dayID = day.replace("'", "").toLowerCase();
      
      btn.onclick = () => {
          mobileTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          daysWrapper.querySelectorAll('.day-column').forEach(c => c.classList.remove('active-mobile-day'));
          const targetCol = daysWrapper.querySelector(`.col-${dayID}`);
          if(targetCol) targetCol.classList.add('active-mobile-day');
          daysWrapper.classList.remove('show-all-mobile');
      };
      mobileTabsContainer.appendChild(btn);
  });
  
  container.appendChild(mobileTabsContainer);
  container.appendChild(daysWrapper);

  activeDaysData.forEach(dayData => {
    const { day, dayRows, jpGroupsMatch } = dayData;
    let htmlCards = "";

    for (let jpNum = 1; jpNum <= globalMaxJp; jpNum++) {
      let classesInJp = jpGroupsMatch[jpNum] || [];
      
      let rawWaktu = "-";
      let refRow = dayRows.find(r => parseInt(r.jp) === jpNum);
      if (refRow && refRow.waktu) rawWaktu = refRow.waktu;

      if(rawWaktu === "-" && jpNum <= globalMaxJp) {
          const fallbackRef = TEMATIK_DATA.rows.find(r => parseInt(r.jp) === jpNum && r.waktu && r.waktu !== "-");
          if (fallbackRef) rawWaktu = fallbackRef.waktu;
      }

      let formattedWaktu = formatTimeLeftColumn(rawWaktu);

      if (classesInJp.length > 0) {
        let innerColumnsHtml = "";
        let validColCount = 0;

        classesInJp.forEach((item) => {
          let displayMapel = item.mapel;
          let displayGuru = item.guru;
          let displayKelas = item.kelas;
          
          if (query !== "") {
            const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(${escapedQuery})`, 'gi');
            displayMapel = displayMapel.replace(regex, `<mark class="search-highlight">$1</mark>`);
            displayGuru = highlightGuru(item.guru, query); 
            displayKelas = displayKelas.replace(regex, `<mark class="search-highlight">$1</mark>`);
          }

          let separatorClass = validColCount > 0 ? "tematik-inner-col-border" : "";
          validColCount++;

          const kelasHTML = isTematikKelasSearch ? '' : `<div class="kelas-info">${displayKelas}</div>`;

          innerColumnsHtml += `
            <div class="tematik-inner-col ${separatorClass}">
              ${kelasHTML}
              <div class="mapel">${displayMapel}</div>
              <div class="guru-nama">${displayGuru}</div>
            </div>
          `;
        });

        htmlCards += `
          <div class="card tematik-card-combined" data-jp="${jpNum}">
            <div class="card-left">
              <span class="jp">${jpNum}</span>
              <span class="waktu">${formattedWaktu}</span>
            </div>
            <div class="card-right tematik-flex-row">
              ${innerColumnsHtml}
            </div>
          </div>
        `;
      } else {
        htmlCards += `
          <div class="card tematik-card-combined" data-jp="${jpNum}" style="opacity: 0.6; background: #f8fafc; border: 1px dashed #cbd5e1; box-shadow: none;">
            <div class="card-left">
              <span class="jp">${jpNum}</span>
              <span class="waktu">${formattedWaktu}</span>
            </div>
            <div class="card-right tematik-flex-row" style="justify-content: center; align-items: center; min-height: 60px;">
              <span style="color: #94a3b8; font-weight: 600; font-size: 14px; letter-spacing: 1px;">KOSONG</span>
            </div>
          </div>
        `;
      }
    }

    const dayID = day.replace("'", "").toLowerCase();
    const col = document.createElement('div');
    
    let colClass = `day-column col-${dayID}`;
    if (day === currentDayString) colClass += ` today-active`; 
    if (day === defaultActiveDay) colClass += ` active-mobile-day`; 
    
    col.className = colClass;
    col.innerHTML = `<div class="day-title">${day}</div>${htmlCards}`;
    daysWrapper.appendChild(col);
  });

  applySubjectColors();
  setTimeout(() => syncCardHeights('resultsTematikGrid'), 50); 
}

// ==========================================================================
// PROSES DATA & LOGIK FILTER JADWAL UMUM
// ==========================================================================
function clearSearch() {
  document.getElementById('searchInput').value = '';
  handleSearch();
}

function handleSearch() {
  if (!isDataLoaded) return; 
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const init = document.getElementById('initialState');
  const container = document.getElementById('resultsGrid');
  const clearBtn = document.getElementById('clearBtn');
  const jpCounter = document.getElementById('jpCounter');

  if(clearBtn) clearBtn.style.display = query.length > 0 ? "flex" : "none";

  if (query === "") {
    init.style.display = "block";
    container.style.display = "none";
    if(jpCounter) jpCounter.style.display = "none";
    currentExactMatch = ""; 
    isKelasSearch = false;
    return;
  }

  init.style.display = "none";
  container.style.display = "flex"; 

  let filtered = RAW_DATA.filter(item => {
    const guru = (item.guru || "").toString().toLowerCase();
    const kelas = (item.kelas || "").toString().toLowerCase();
    const mapel = (item.mapel || "").toString().toLowerCase();
    return guru.includes(query) || kelas.includes(query) || mapel.includes(query);
  });

  currentExactMatch = query.toUpperCase(); 
  isKelasSearch = false; 

  let foundClass = false;
  for (let item of filtered) {
    if (item.kelas) {
        let kelases = item.kelas.split(',').map(k => k.trim());
        let found = kelases.find(k => k.toLowerCase().includes(query));
        if (found) { 
            currentExactMatch = found; 
            isKelasSearch = true; 
            foundClass = true;
            break; 
        }
    }
  }

  if (!foundClass) {
    for (let item of filtered) {
      if (item.guru) {
          let gurus = item.guru.split('/').map(g => g.trim());
          let found = gurus.find(g => g.toLowerCase().includes(query));
          if (found) { 
              currentExactMatch = found; 
              isKelasSearch = false; 
              break; 
          }
      }
    }
  }

  let totalJP = 0;
  let isGuruSearch = false;
  let countedSlots = new Set(); 

  filtered.forEach(item => {
    const guruLower = (item.guru || "").toString().toLowerCase();
    
    if (guruLower.includes(query) && query.length >= 3) {
      isGuruSearch = true;
      const slotKey = `${item.hari}|${item.jp}`;
      
      if (!countedSlots.has(slotKey)) {
        const jpVal = parseInt(item.jp);
        if (!isNaN(jpVal)) {
          if (item.hari === "JUM'AT" && (jpVal === 3 || jpVal === 4 || jpVal === 5)) {
            totalJP += 0.5; 
          } else {
            totalJP += 1; 
          }
          countedSlots.add(slotKey); 
        }
      }
    }
  });

  if (jpCounter) {
    if (isGuruSearch && totalJP > 0) {
      const formattedJP = Number.isInteger(totalJP) ? totalJP : totalJP.toFixed(1);
      jpCounter.innerText = `Total Mengajar: ${formattedJP} JP / Pekan`;
      jpCounter.style.display = "flex";
    } else {
      jpCounter.style.display = "none"; 
    }
  }

  const hasSeninData = filtered.some(item => item.hari === 'SENIN');
  if (hasSeninData) {
    const refSenin = RAW_DATA.find(d => d.hari === 'SENIN' && parseInt(d.jp) === 1);
    const waktuSenin1 = refSenin ? refSenin.waktu : '-';
    filtered.push({ hari: 'SENIN', jp: 1, waktu: waktuSenin1, kelas: '', mapel: 'FLAG CEREMONY', guru: '' });
  }

  const groupedData = regroupFilteredData(filtered);
  renderGrid(groupedData, query);
}

function regroupFilteredData(data) {
  const groupedMap = new Map();
  data.forEach(item => {
    const key = item.mapel === 'FLAG CEREMONY' ? 'FLAG_CEREMONY' : `${item.hari}|${item.jp}`;
    if (groupedMap.has(key)) {
      const existingEntry = groupedMap.get(key);
      const newKelasArr = (item.kelas || "").split(',').map(k => k.trim()).filter(k => k);
      newKelasArr.forEach(k => { if (!existingEntry.kelas_list.includes(k)) existingEntry.kelas_list.push(k); });
      const existingGurus = existingEntry.guru.split('/').map(g => g.trim()).filter(g => g && g !== "-");
      const newGurus = (item.guru || "").split('/').map(g => g.trim()).filter(g => g && g !== "-");
      newGurus.forEach(g => { if (!existingGurus.includes(g)) existingGurus.push(g); });
      existingEntry.guru = existingGurus.length > 0 ? existingGurus.join(' / ') : "-";
    } else {
      const initialKelas = (item.kelas || "").split(',').map(k => k.trim()).filter(k => k);
      groupedMap.set(key, { ...item, kelas_list: initialKelas });
    }
  });
  return Array.from(groupedMap.values()).map(group => {
    group.kelas = group.kelas_list.sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).join(', ');
    delete group.kelas_list;
    return group;
  });
}

function highlightGuru(guruString, query) {
  if (!guruString) return "-";
  if (!query) return guruString; 
  const parts = guruString.split('/');
  return parts.map(part => {
    if(part.toLowerCase().includes(query)) {
      return `<span class="search-highlight">${part.trim()}</span>`;
    } else {
      return `<span style="color: var(--text-main); font-weight: 500;">${part.trim()}</span>`;
    }
  }).join(' / ');
}

function renderGrid(data, query) {
  const container = document.getElementById('resultsGrid');
  const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU']; 
  const currentDayString = getTodayString(); 
  container.innerHTML = "";
  container.style.display = "flex"; 

  let activeDays = [];
  let globalMaxJp = 0; 

  days.forEach(day => {
    const dayData = data.filter(d => d.hari === day);
    if (dayData.length > 0) {
        activeDays.push(day);
        RAW_DATA.forEach(r => {
            if (r.hari === day) {
                let j = parseInt(r.jp);
                if (!isNaN(j) && j > globalMaxJp) globalMaxJp = j;
            }
        });
    }
  });

  let defaultActiveDay = activeDays.includes(currentDayString) ? currentDayString : activeDays[0];

  const mobileTabsContainer = document.createElement('div');
  mobileTabsContainer.className = 'mobile-day-tabs';
  
  const daysWrapper = document.createElement('div');
  daysWrapper.className = 'days-wrapper';

  const btnSemua = document.createElement('button');
  btnSemua.className = `tab-btn`;
  btnSemua.innerText = "SEMUA";
  btnSemua.onclick = () => {
      mobileTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btnSemua.classList.add('active');
      daysWrapper.querySelectorAll('.day-column').forEach(c => c.classList.add('active-mobile-day'));
      daysWrapper.classList.add('show-all-mobile');
  };
  mobileTabsContainer.appendChild(btnSemua);

  activeDays.forEach((day) => {
      const shortDay = day.replace("'", "").substring(0,3).toUpperCase();
      const btn = document.createElement('button');
      btn.className = `tab-btn ${day === defaultActiveDay ? 'active' : ''}`;
      btn.innerText = shortDay;
      
      const dayID = day.replace("'", "").toLowerCase();
      
      btn.onclick = () => {
          mobileTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          daysWrapper.querySelectorAll('.day-column').forEach(c => c.classList.remove('active-mobile-day'));
          const targetCol = daysWrapper.querySelector(`.col-${dayID}`);
          if(targetCol) targetCol.classList.add('active-mobile-day');
          daysWrapper.classList.remove('show-all-mobile');
      };
      mobileTabsContainer.appendChild(btn);
  });
  
  container.appendChild(mobileTabsContainer);
  container.appendChild(daysWrapper);

  activeDays.forEach((day, index) => {
    const dayData = data.filter(d => d.hari === day).sort((a, b) => parseInt(a.jp) - parseInt(b.jp));
    const dayID = day.replace("'", "").toLowerCase(); 
    const col = document.createElement('div');
    
    let colClass = `day-column col-${dayID}`;
    if (day === currentDayString) colClass += ` today-active`; 
    if (day === defaultActiveDay) colClass += ` active-mobile-day`; 
    col.className = colClass;
    
    let html = `<div class="day-title">${day}</div>`;
    
    for (let i = 1; i <= globalMaxJp; i++) {
        const itemsForJp = dayData.filter(d => parseInt(d.jp) === i);
        
        let defaultWaktu = "-";
        const refData = RAW_DATA.find(d => d.hari === day && parseInt(d.jp) === i);
        if (refData && refData.waktu) defaultWaktu = refData.waktu;
        
        if (defaultWaktu === "-" && i <= globalMaxJp) {
           const fallbackRef = RAW_DATA.find(d => parseInt(d.jp) === i && d.waktu && d.waktu !== "-");
           if (fallbackRef) defaultWaktu = fallbackRef.waktu;
        }
        let formattedWaktu = formatTimeLeftColumn(defaultWaktu);

        if (itemsForJp.length > 0) {
            itemsForJp.forEach(item => {
              let cardRightHTML = '';
              if (item.mapel === 'FLAG CEREMONY') {
                cardRightHTML = `<div style="font-size: 14px; font-weight: 800; color: #dc2626; text-align: center; width: 100%;">FLAG CEREMONY</div>`;
              } else {
                const finalGuru = highlightGuru(item.guru, query);
                
                const kelasHTML = isKelasSearch ? '' : `<div class="kelas-info">${item.kelas}</div>`;

                cardRightHTML = `
                  ${kelasHTML}
                  <div class="mapel">${item.mapel}</div>
                  <div class="guru-nama">${finalGuru}</div>
                `;
              }
              
              html += `
                <div class="card" data-jp="${i}">
                  <div class="card-left">
                    <span class="jp">${i}</span>
                    <span class="waktu">${formattedWaktu}</span>
                  </div>
                  <div class="card-right">${cardRightHTML}</div>
                </div>
              `;
            });
        } else {
            html += `
              <div class="card" data-jp="${i}" style="opacity: 0.6; background: #f8fafc; border: 1px dashed #cbd5e1; box-shadow: none;">
                <div class="card-left">
                  <span class="jp">${i}</span>
                  <span class="waktu">${formattedWaktu}</span>
                </div>
                <div class="card-right" style="display:flex; justify-content:center; align-items:center;">
                    <span style="color: #94a3b8; font-weight: 600; font-size: 14px; letter-spacing: 1px;">KOSONG</span>
                </div>
              </div>
            `;
        }
    }
    col.innerHTML = html;
    daysWrapper.appendChild(col);
  });

  applySubjectColors();
  setTimeout(() => syncCardHeights('resultsGrid'), 50);
}

// ==========================================================================
// PEWARNAAN DINAMIS MATA PELAJARAN
// ==========================================================================
function applySubjectColors() {
    const cards = document.querySelectorAll('.card-right, .tematik-inner-col');
    
    const colorPalette = [
        '#059669', '#d97706', '#7c3aed', '#db2777', '#ea580c', '#0284c7', '#4f46e5'
    ];
    
    let colorMap = {}; 
    let colorIndex = 0;

    cards.forEach(card => {
        const mapelEl = card.querySelector('.mapel');
        const kelasEl = card.querySelector('.kelas-info');
        
        if (!mapelEl) return;
        
        const mapelName = mapelEl.textContent.trim().toUpperCase();
        const cleanMapelName = mapelName.replace(/<[^>]*>?/gm, ''); 
        const kelasName = kelasEl ? kelasEl.textContent.trim().toUpperCase() : '';

        if (cleanMapelName.includes('AL QURAN') || cleanMapelName.includes('AL-QURAN')) {
            mapelEl.style.setProperty('color', 'var(--text-main)', 'important'); 
            
            if (kelasEl && kelasName !== '') {
                if (!colorMap['KELAS_'+kelasName]) {
                    colorMap['KELAS_'+kelasName] = colorPalette[colorIndex % colorPalette.length];
                    colorIndex++;
                }
                kelasEl.style.setProperty('color', colorMap['KELAS_'+kelasName], 'important');
            }
            
        } else {
            if (kelasEl) {
                kelasEl.style.setProperty('color', 'var(--logo-blue-accent)', 'important'); 
            }
            
            if (!colorMap[cleanMapelName]) {
                if (cleanMapelName.includes('ARABIC')) colorMap[cleanMapelName] = '#1155cc'; 
                else {
                    colorMap[cleanMapelName] = colorPalette[colorIndex % colorPalette.length];
                    colorIndex++;
                }
            }
            mapelEl.style.setProperty('color', colorMap[cleanMapelName], 'important');
        }
    });
}

// ==========================================================================
// CETAK PDF (1 HALAMAN PENUH 100VH DENGAN FLEX STRETCH RAPI)
// ==========================================================================
function cetakPDF(tipeJadwal) {
    if (tipeJadwal !== 'umum') return; 

    const container = document.getElementById('resultsGrid');
    
    if (!container || container.style.display === "none" || container.innerHTML === "") {
        alert("Tidak ada jadwal yang bisa dicetak. Silakan lakukan pencarian terlebih dahulu.");
        return;
    }

    const tabs = container.querySelectorAll('.mobile-day-tabs .tab-btn');
    tabs.forEach(btn => {
        if (btn.innerText.toUpperCase() === "SEMUA") btn.click();
    });

    setTimeout(() => {
        let dynamicLabel = document.getElementById('printDynamicLabel');
        if (!dynamicLabel) {
            dynamicLabel = document.createElement('div');
            dynamicLabel.id = 'printDynamicLabel';
            const headerMain = document.querySelector('.header-main-wrapper');
            const headerBottom = document.querySelector('.header-bottom-row');
            if(headerMain && headerBottom) {
                headerMain.insertBefore(dynamicLabel, headerBottom);
            } else {
                document.body.insertBefore(dynamicLabel, document.body.firstChild);
            }
        }
        dynamicLabel.innerText = currentExactMatch;

        let customFooterLeft = document.getElementById('customPrintFooterLeft');
        if (!customFooterLeft) {
            customFooterLeft = document.createElement('div');
            customFooterLeft.id = 'customPrintFooterLeft';
            customFooterLeft.innerText = 'AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY';
            document.body.appendChild(customFooterLeft);
        }

        let customFooterRight = document.getElementById('customPrintFooterRight');
        if (!customFooterRight) {
            customFooterRight = document.createElement('div');
            customFooterRight.id = 'customPrintFooterRight';
            customFooterRight.innerText = 'JADWAL PELAJARAN';
            document.body.appendChild(customFooterRight);
        }

        let printFixStyle = document.getElementById('printFixStyle');
        if (!printFixStyle) {
            printFixStyle = document.createElement('style');
            printFixStyle.id = 'printFixStyle';
            document.head.appendChild(printFixStyle);
        }
        
        printFixStyle.innerHTML = `
            @media screen {
                #printDynamicLabel, #customPrintFooterLeft, #customPrintFooterRight { display: none !important; }
            }

            @media print {
                @page {
                    size: A4 landscape !important;
                    margin: 0 !important; 
                }

                body {
                    padding: 8mm 12mm 15mm 12mm !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    height: 100vh !important;
                    width: 100vw !important;
                    display: flex !important;
                    flex-direction: column !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important; 
                    margin: 0 !important;
                }

                .header-bottom-row, .tab-container, #controlsUmum, #controlsTematik { display: none !important; }
                #initialState, #initialStateTematik { display: none !important; }
                #printHeader { display: none !important; }
                
                body.print-umum #resultsTematikGrid { display: none !important; }
                body.print-tematik #resultsGrid { display: none !important; }

                .header-section {
                    flex-shrink: 0 !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                }
                .header-main-wrapper {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    width: 100% !important;
                    gap: 0 !important;
                }
                .header-top-content {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 100% !important;
                    gap: 5px !important;
                }
                .header-logo {
                    height: 45px !important;
                    margin: 0 auto !important;
                }
                .header-top-content div {
                    text-align: center !important;
                }
                .header-top-content h1 {
                    font-size: 16px !important;
                    margin: 0 !important;
                    color: #0f172a !important;
                }
                .desktop-subtext {
                    font-size: 10px !important;
                    margin: 2px 0 0 0 !important;
                    display: block !important;
                    color: #1155cc !important;
                }
                .mobile-subtext { display: none !important; }

                #printDynamicLabel {
                    display: block !important;
                    flex-shrink: 0 !important;
                    text-align: center !important;
                    font-size: 14px !important; 
                    font-weight: 700 !important;
                    color: #ffffff !important; 
                    background-color: #1e40af !important; 
                    padding: 6px 0 !important;
                    margin: 8px 0 10px 0 !important;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    border-radius: 4px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .flex-schedule-container {
                    display: flex !important;
                    flex-direction: column !important;
                    flex: 1 !important; 
                    min-height: 0 !important; 
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                }

                .days-wrapper {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: stretch !important; 
                    flex: 1 !important; 
                    width: 100% !important;
                    gap: 6px !important;
                    min-height: 0 !important;
                }

                .day-column {
                    display: flex !important;
                    flex-direction: column !important;
                    flex: 1 !important; 
                    min-width: 0 !important;
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 6px !important;
                    padding: 3px !important;
                    box-shadow: none !important;
                }
                .day-column.today-active { border: 1px solid #e2e8f0 !important; }
                .day-column.today-active .day-title::after { display: none !important; }

                .day-title {
                    flex-shrink: 0 !important;
                    font-size: 9px !important;
                    padding: 3px 0 !important;
                    margin-bottom: 3px !important;
                }

                .card {
                    display: flex !important;
                    flex-direction: row !important;
                    flex: 1 !important; 
                    min-height: 0 !important; 
                    margin-bottom: 3px !important;
                    padding: 2px 4px !important;
                    border: 1px solid #cbd5e1 !important;
                    border-radius: 4px !important;
                    box-shadow: none !important;
                }
                .card:last-child { margin-bottom: 0 !important; }

                .card-left {
                    flex: 0 0 35px !important;
                    justify-content: center !important;
                }
                .jp { font-size: 12px !important; margin-bottom: 2px !important; }
                .waktu { font-size: 6.5px !important; }

                .card-right {
                    flex: 1 !important;
                    justify-content: center !important;
                    gap: 1px !important;
                }
                .kelas-info { 
                    font-size: 8px !important; 
                    line-height: 2.0 !important; 
                }
                .mapel { 
                    font-size: 8.5px !important; 
                    line-height: 2.0 !important; 
                }
                .guru-nama { 
                    font-size: 7.5px !important; 
                    line-height: 2.0 !important; 
                }

                #customPrintFooterLeft {
                    display: block !important;
                    position: fixed;
                    bottom: 6mm;
                    left: 10mm;
                    font-size: 8px;
                    font-weight: bold;
                    color: #475569 !important;
                    font-family: Arial, sans-serif;
                    z-index: 9999;
                }

                #customPrintFooterRight {
                    display: block !important;
                    position: fixed;
                    bottom: 6mm;
                    right: 10mm;
                    font-size: 8px;
                    font-weight: bold;
                    color: #475569 !important;
                    font-family: Arial, sans-serif;
                    z-index: 9999;
                }

                /* PENYESUAIAN TAMBAHAN KHUSUS PENGGUNA HP */
                body.cetak-hp {
                    padding: 4mm 6mm 10mm 6mm !important;
                }
                body.cetak-hp .card-right .mapel {
                    font-size: 8px !important;
                }
                body.cetak-hp .card-right .guru-nama {
                    font-size: 7px !important;
                }
            }
        `;

        window.print();
        
    }, 300);
}
