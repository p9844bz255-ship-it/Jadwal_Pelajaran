// ==========================================================================
// TEMPELKAN URL DEPLOYMENT APPS SCRIPT ANDA DI BAWAH INI
// ==========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxvVZ_0HN5y6p4t1Ga654-SSdXGgMH-MWUe5g2BpqVYRWpRX3qBP7y49axCL2OJwXU8TA/exec";

let RAW_DATA = [];
let TEMATIK_DATA = null;
let isDataLoaded = false;
let isTematikLoaded = false;

window.onload = function() {
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

function handleTematikGridFilter() {
  if (!isTematikLoaded || !TEMATIK_DATA) return;

  const query = document.getElementById('searchTematikInput').value.toLowerCase().trim();
  const selectedPekan = document.getElementById('pekanSelect').value;
  const container = document.getElementById('resultsTematikGrid');
  const clearTematikBtn = document.getElementById('clearTematikBtn');

  clearTematikBtn.style.display = query.length > 0 ? "flex" : "none";

  const activeOptText = document.getElementById('pekanSelect').options[document.getElementById('pekanSelect').selectedIndex]?.text || "";
  document.getElementById('printSubTitleText').innerText = `AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY | ${activeOptText.toUpperCase()}`;

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

  // 1. Buat Wrapper Tab untuk Mobile
  const mobileTabsContainer = document.createElement('div');
  mobileTabsContainer.className = 'mobile-day-tabs';
  
  // 2. Buat Wrapper untuk Hari-Hari (Kolom Jadwal)
  const daysWrapper = document.createElement('div');
  daysWrapper.className = 'days-wrapper';

  // Tab "SEMUA"
  const btnSemua = document.createElement('button');
  btnSemua.className = `tab-btn`;
  btnSemua.innerText = "SEMUA";
  btnSemua.onclick = () => {
      mobileTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btnSemua.classList.add('active');
      daysWrapper.querySelectorAll('.day-column').forEach(c => c.classList.add('active-mobile-day'));
      
      // Tambahkan kelas khusus yang mengaktifkan Horizontal Scroll di HP
      daysWrapper.classList.add('show-all-mobile');
  };
  mobileTabsContainer.appendChild(btnSemua);

  // Tab Masing-Masing Hari
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
          
          // Hapus kelas khusus agar kembali ke mode vertikal (atas-bawah) untuk 1 hari
          daysWrapper.classList.remove('show-all-mobile');
      };
      mobileTabsContainer.appendChild(btn);
  });
  
  // Masukkan Tab dan Wrapper Jadwal ke Kontainer Utama
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

          innerColumnsHtml += `
            <div class="tematik-inner-col ${separatorClass}">
              <div class="kelas-info">${displayKelas}</div>
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
    
    col.innerHTML = `
      <div class="day-title">${day}</div>
      ${htmlCards}
    `;
    // PENTING: Masukkan kolom ke daysWrapper, BUKAN langsung ke container
    daysWrapper.appendChild(col);
  });

  applySubjectColors();
  setTimeout(() => syncCardHeights('resultsTematikGrid'), 50); 
}

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

  clearBtn.style.display = query.length > 0 ? "flex" : "none";

  if (query === "") {
    init.style.display = "block";
    container.style.display = "none";
    jpCounter.style.display = "none"; 
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
          if (item.hari === "JUM'AT" && (jpVal === 3 || jpVal === 4 || jpVal === 5)) totalJP += 0.5; 
          else totalJP += 1; 
          countedSlots.add(slotKey); 
        }
      }
    }
  });

  if (isGuruSearch && totalJP > 0) {
    const formattedJP = Number.isInteger(totalJP) ? totalJP : totalJP.toFixed(1);
    jpCounter.innerText = `Total Mengajar: ${formattedJP} JP / Pekan`;
    jpCounter.style.display = "flex";
  } else {
    jpCounter.style.display = "none"; 
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
      
      // Aktifkan horizontal scroll
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
          
          // Kembalikan ke mode vertikal (hilangkan scroll horizontal)
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
                cardRightHTML = `
                  <div class="kelas-info">${item.kelas}</div>
                  <div class="mapel">${item.mapel}</div>
                  <div class="guru-nama">${finalGuru}</div>
                `;
              }
              
              html += `
                <div class="card" data-jp="${i}">
                  <div class="card-left">
                    <span class="jp">${item.jp}</span>
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
    
    // PENTING: Masukkan kolom ke daysWrapper
    daysWrapper.appendChild(col);
  });

  applySubjectColors();
  setTimeout(() => syncCardHeights('resultsGrid'), 50);
}

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
        
        if (!mapelEl || !kelasEl) return;
        
        const mapelName = mapelEl.textContent.trim().toUpperCase();
        const cleanMapelName = mapelName.replace(/<[^>]*>?/gm, ''); 
        const kelasName = kelasEl.textContent.trim().toUpperCase();

        if (cleanMapelName.includes('AL QURAN') || cleanMapelName.includes('AL-QURAN')) {
            mapelEl.style.setProperty('color', 'var(--text-main)', 'important'); 
            
            if (!colorMap['KELAS_'+kelasName]) {
                colorMap['KELAS_'+kelasName] = colorPalette[colorIndex % colorPalette.length];
                colorIndex++;
            }
            kelasEl.style.setProperty('color', colorMap['KELAS_'+kelasName], 'important');
            
        } else {
            kelasEl.style.setProperty('color', 'var(--logo-blue-accent)', 'important'); 
            
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