/* Full Eventure script.js
   - Supports manual HTML cards (won't delete them)
   - Falls back to rendering EVENTS if no manual cards exist
   - Filters, search, reset, booking modal, seat selection, checkout, success modal
*/

const EVENTS = [
  { id: 1, title: "Stellar Night Concert", category: "Concert", date: "2025-12-12", time: "19:00", venue: "Grand Arena", price: 1500, img: "assets/event-1.jpg", description: "An immersive live performance."},
  { id: 2, title: "Classic Theatre Play", category: "Theater", date: "2026-01-08", time: "18:00", venue: "Downtown Theatre", price: 900, img: "assets/event-2.jpg", description: "A timeless drama performed by award-winning cast."},
  { id: 3, title: "Food & Art Festival", category: "Festival", date: "2026-03-20", time: "10:00", venue: "Riverside Grounds", price: 500, img: "assets/event-3.jpg", description: "Local flavors, art stalls, family-friendly performance."},
  { id: 4, title: "Indie Beats Fest", category: "Concert", date: "2026-04-05", time: "16:00", venue: "Open Park", price: 1200, img: "assets/event-4.jpg", description: "The best indie acts across town."},
  { id: 5, title: "Gala Opera Night", category: "Theater", date: "2025-11-01", time: "20:00", venue: "Opera House", price: 2500, img: "assets/event-5.jpg", description: "A night of classical masterpieces."},
  { id: 6, title: "Summer Beach Party", category: "Festival", date: "2026-06-17", time: "14:00", venue: "Coastal Grounds", price: 600, img: "assets/event-6.jpg", description: "Beachside music & food."},
  { id: 7, title: "Jazz & Wine", category: "Concert", date: "2025-10-20", time: "19:30", venue: "River Lounge", price: 1800, img: "assets/event-7.jpg", description: "Smooth jazz evening."},
  { id: 8, title: "Stand-up Comedy Night", category: "Theater", date: "2025-12-05", time: "21:00", venue: "Laugh House", price: 700, img: "assets/event-8.jpg", description: "Laughs with top comedians."}
];

/* -------------------------
   DOM refs (defensive)
------------------------- */
const cardsEl = document.getElementById('cards');
const promoStrip = document.getElementById('promoStrip');
const searchForm = document.getElementById('searchForm');
const filterKeyword = document.getElementById('filterKeyword');
const filterCategory = document.getElementById('filterCategory');
const resetFilters = document.getElementById('resetFilters');

const bookingModal = document.getElementById('bookingModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalEventTitle = document.getElementById('modalEventTitle');
const modalEventImg = document.getElementById('modalEventImg');
const modalEventWhen = document.getElementById('modalEventWhen');
const modalEventVenue = document.getElementById('modalEventVenue');
const modalSeatPrice = document.getElementById('modalSeatPrice');
const seatMap = document.getElementById('seatMap');
const selectedList = document.getElementById('selectedList');
const selectedTotal = document.getElementById('selectedTotal');
const confirmBookingBtn = document.getElementById('confirmBookingBtn');
const successModal = document.getElementById('successModal');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');
const bookingRefEl = document.getElementById('bookingRef');
const successSummary = document.getElementById('successSummary');
const downloadTicketBtn = document.getElementById('downloadTicket');
const closeSuccessAction = document.getElementById('closeSuccessAction');
const seatsCountSelect = document.getElementById('seatsCount');
const holdTimerEl = document.getElementById('holdTimer');

/* State */
let currentEvent = null;
let seatConfig = { rows: 6, cols: 10, price: 1500 };
let selectedSeats = new Set();
let seatHoldTimer = null;
let holdSeconds = 600;

/* Utilities */
function createEl(tag, cls){ const e=document.createElement(tag); if(cls) e.className = cls; return e; }
function formatCurrency(x){ return x.toLocaleString(); }
function randomRef(){ return 'EVT-' + Math.random().toString(36).substr(2,6).toUpperCase(); }

/* -------------------------
   Promo rendering (optional)
------------------------- */
const PROMOS = [
  { title: "Up to 30% off selected flights", desc: "Limited period offer", img: "assets/promo-1.jpg" },
  { title: "Festival Season Deals", desc: "Book early & save", img: "assets/promo-2.jpg" },
  { title: "Student Discount", desc: "Special fares", img: "assets/promo-3.jpg" }
];
function renderPromos(){
  if(!promoStrip) return;
  promoStrip.innerHTML = '';
  PROMOS.forEach(p=>{
    const pEl = createEl('div','promo');
    pEl.innerHTML = `<h4>${p.title}</h4><p>${p.desc}</p>`;
    promoStrip.appendChild(pEl);
  });
  let idx=0;
  setInterval(()=> {
    idx = (idx+1) % PROMOS.length;
    promoStrip.style.transform = `translateX(-${idx * 272}px)`;
  }, 3500);
}

/* -------------------------
   Render cards (JS)
------------------------- */
function renderCards(list){
  if(!cardsEl) return;
  cardsEl.innerHTML = '';
  list.forEach(ev=>{
    const card = createEl('article','card');
    card.dataset.eventId = ev.id; // attach id for later reference
    card.dataset.category = ev.category || '';
    const img = createEl('img');
    img.src = ev.img;
    img.alt = ev.title;
    const body = createEl('div','card-body');
    body.innerHTML = `<h4>${ev.title}</h4><div class="meta">${ev.date} — ${ev.time} • ${ev.venue}</div><p class="desc">${ev.description}</p>`;
    const footer = createEl('div','card-footer');
    footer.innerHTML = `<div class="price">KSh ${formatCurrency(ev.price)}</div>`;
    const bookBtn = createEl('button','btn small red');
    bookBtn.textContent = 'Book';
    bookBtn.addEventListener('click', ()=> openBooking(ev.id));
    footer.appendChild(bookBtn);
    card.appendChild(img);
    card.appendChild(body);
    body.appendChild(footer);
    cardsEl.appendChild(card);
  });
}

/* -------------------------
   Helpers: ensure booking wiring works for manual cards
------------------------- */
function findEventByTitle(title){
  if(!title) return null;
  const t = title.trim().toLowerCase();
  return EVENTS.find(ev => ev.title.toLowerCase() === t) || null;
}

/* -------------------------
   Filters (operate on DOM cards)
------------------------- */
function filterDomCards(){
  const kw = filterKeyword ? filterKeyword.value.trim().toLowerCase() : '';
  const cat = filterCategory ? filterCategory.value.trim().toLowerCase() : '';

  const domCards = cardsEl ? Array.from(cardsEl.querySelectorAll('.card')) : [];
  domCards.forEach(card => {
    const title = (card.querySelector('h4') || card.querySelector('h3'))?.textContent.trim().toLowerCase() || '';
    const meta = (card.querySelector('.meta')?.textContent || '').toLowerCase();
    const desc = (card.querySelector('.desc')?.textContent || '').toLowerCase();
    const matchesKw = !kw || title.includes(kw) || meta.includes(kw) || desc.includes(kw);
    const cardCategory = (card.dataset.category || '').toLowerCase();
    const matchesCat = !cat || cardCategory === cat || title.includes(cat);

    card.style.display = (matchesKw && matchesCat) ? '' : 'none';
  });
}

/* -------------------------
   Booking modal & seat map
------------------------- */
function openBooking(eventIdOrTitle){
  // accept either numeric id or string title
  let ev = null;
  if(typeof eventIdOrTitle === 'number') ev = EVENTS.find(x=>x.id===eventIdOrTitle);
  else if(typeof eventIdOrTitle === 'string') ev = findEventByTitle(eventIdOrTitle);

  if(!ev){
    // try to infer from currently clicked card (fallback)
    const activeCard = document.activeElement?.closest?.('.card');
    const idAttr = activeCard?.dataset?.eventId;
    if(idAttr) ev = EVENTS.find(x=>String(x.id)===String(idAttr));
  }
  if(!ev) return alert('Event not found.');

  currentEvent = ev;
  if(modalEventTitle) modalEventTitle.textContent = ev.title;
  if(modalEventImg) modalEventImg.src = ev.img;
  if(modalEventWhen) modalEventWhen.textContent = `${ev.date} • ${ev.time}`;
  if(modalEventVenue) modalEventVenue.textContent = ev.venue;
  if(modalSeatPrice) modalSeatPrice.textContent = `KSh ${formatCurrency(ev.price)}`;
  seatConfig.price = ev.price;
  selectedSeats.clear();
  if(selectedList) selectedList.textContent = '–';
  if(selectedTotal) selectedTotal.textContent = 'KSh 0';
  if(typeof buildSeatMap === 'function') buildSeatMap(ev);
  if(bookingModal) bookingModal.setAttribute('aria-hidden','false');
  if(bookingModal) bookingModal.scrollIntoView({behavior:'smooth'});
  startHoldTimer();
}

function closeModal(){
  if(bookingModal) bookingModal.setAttribute('aria-hidden','true');
  clearHoldTimer();
}

/* Seat map builder (same as original) */
function buildSeatMap(ev){
  if(!seatMap) return;
  seatMap.innerHTML = '';
  const rows = seatConfig.rows;
  const cols = seatConfig.cols;
  const reserved = new Set();
  for(let i=0;i<Math.floor(Math.random()*8);i++){
    reserved.add(String.fromCharCode(65 + Math.floor(Math.random()*rows)) + (Math.ceil(Math.random()*cols)));
  }
  for(let r=0;r<rows;r++){
    for(let c=1;c<=cols;c++){
      const seatId = String.fromCharCode(65+r) + c;
      const seatEl = createEl('div','seat');
      seatEl.dataset.seat = seatId;
      seatEl.textContent = seatId;
      if(reserved.has(seatId)){
        seatEl.classList.add('booked');
      } else {
        seatEl.addEventListener('click', ()=> toggleSeat(seatEl));
      }
      seatMap.appendChild(seatEl);
    }
  }
}

/* Seat toggle */
function toggleSeat(el){
  const seatId = el.dataset.seat;
  const limit = parseInt(seatsCountSelect?.value || '1', 10);
  if(el.classList.contains('booked')) return;
  if(el.classList.contains('selected')){
    el.classList.remove('selected');
    selectedSeats.delete(seatId);
  } else {
    if(selectedSeats.size >= limit){
      alert(`You can only select up to ${limit} seat(s).`);
      return;
    }
    el.classList.add('selected');
    selectedSeats.add(seatId);
  }
  updateSelectionUI();
}

function updateSelectionUI(){
  const seats = Array.from(selectedSeats).sort();
  if(selectedList) selectedList.textContent = seats.length ? seats.join(', ') : '–';
  if(selectedTotal) selectedTotal.textContent = 'KSh ' + formatCurrency(seats.length * seatConfig.price);
}

/* Hold timer */
function startHoldTimer(){
  holdSeconds = 600;
  clearHoldTimer();
  updateHoldUI();
  seatHoldTimer = setInterval(()=> {
    holdSeconds--;
    if(holdSeconds <= 0){
      clearHoldTimer();
      selectedSeats.clear();
      updateSelectionUI();
      alert('Hold expired — seats released.');
      closeModal();
    } else updateHoldUI();
  }, 1000);
}
function updateHoldUI(){
  if(!holdTimerEl) return;
  const m = Math.floor(holdSeconds/60);
  const s = holdSeconds%60;
  holdTimerEl.textContent = `Hold expires in ${m}:${String(s).padStart(2,'0')}`;
}
function clearHoldTimer(){
  if(seatHoldTimer){ clearInterval(seatHoldTimer); seatHoldTimer = null; if(holdTimerEl) holdTimerEl.textContent = ''; }
}

/* Confirm booking */
if(confirmBookingBtn) {
  confirmBookingBtn.addEventListener('click', () => {
    const name = document.getElementById('buyerName')?.value.trim();
    const email = document.getElementById('buyerEmail')?.value.trim();
    if(!name || !email) { alert('Please provide name and email to continue.'); return; }
    const seats = Array.from(selectedSeats);
    if(seats.length === 0){ alert('Please select at least one seat.'); return; }
    confirmBookingBtn.disabled = true;
    confirmBookingBtn.textContent = 'Processing...';
    setTimeout(()=> {
      confirmBookingBtn.disabled = false;
      confirmBookingBtn.textContent = 'Confirm Booking';
      finalizeBooking({ name, email, seats });
    }, 1200);
  });
}

/* Finalize booking */
function finalizeBooking({name,email,seats}){
  if(!currentEvent){ alert('No event selected.'); return; }
  const ref = randomRef();
  const booking = {
    ref, eventId: currentEvent.id, title: currentEvent.title, date: currentEvent.date, time: currentEvent.time,
    venue: currentEvent.venue, seats, total: seats.length * seatConfig.price, name, email, createdAt: new Date().toISOString()
  };
  localStorage.setItem('lastBooking', JSON.stringify(booking));
  showSuccess(booking);
  closeModal();
}

/* Success */
function showSuccess(booking){
  if(bookingRefEl) bookingRefEl.textContent = booking.ref;
  if(successSummary) successSummary.innerHTML = `Hi <strong>${booking.name}</strong>, your booking for <strong>${booking.title}</strong> (${booking.date}) has been confirmed. Seats: <strong>${booking.seats.join(', ')}</strong>. Total: <strong>KSh ${formatCurrency(booking.total)}</strong>`;
  if(successModal) successModal.setAttribute('aria-hidden','false');
}
if(closeSuccessBtn) closeSuccessBtn.addEventListener('click', ()=> successModal && successModal.setAttribute('aria-hidden','true'));
if(closeSuccessAction) closeSuccessAction.addEventListener('click', ()=> successModal && successModal.setAttribute('aria-hidden','true'));
if(downloadTicketBtn) downloadTicketBtn.addEventListener('click', ()=> {
  const bk = JSON.parse(localStorage.getItem('lastBooking') || '{}');
  if(!bk.ref) return alert('No booking to download.');
  const content = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${bk.ref}</title></head><body style="font-family:Arial;padding:28px"><h2>Eventure e-Ticket</h2><p><strong>Ref:</strong> ${bk.ref}</p><p><strong>Event:</strong> ${bk.title}</p><p><strong>Date:</strong> ${bk.date} ${bk.time}</p><p><strong>Venue:</strong> ${bk.venue}</p><p><strong>Seats:</strong> ${bk.seats.join(', ')}</p><p><strong>Total:</strong> KSh ${formatCurrency(bk.total)}</p><p>Show this at the venue. Thank you for booking with Eventure.</p></body></html>`;
  const w = window.open('','_blank');
  w.document.write(content); w.document.close();
});

/* -------------------------
   INIT
------------------------- */
function init(){
  // promos
  renderPromos();

  // if there is no manual card in HTML, render from EVENTS
  const hasManualCards = cardsEl && cardsEl.querySelector && cardsEl.querySelectorAll('.card') && cardsEl.querySelectorAll('.card').length > 0;
  if(!hasManualCards && cardsEl){
    renderCards(EVENTS);
  } else if(hasManualCards){
    // ensure each manual card has dataset.category if possible (helps filters)
    const manualCards = Array.from(cardsEl.querySelectorAll('.card'));
    manualCards.forEach(card => {
      if(!card.dataset.category){
        const title = (card.querySelector('h4') || card.querySelector('h3'))?.textContent || '';
        const t = title.toLowerCase();
        if(t.includes('concert')) card.dataset.category = 'concert';
        else if(t.includes('theatre') || t.includes('theater')) card.dataset.category = 'theatre';
        else if(t.includes('festival')) card.dataset.category = 'festival';
        else if(t.includes('comedy')) card.dataset.category = 'comedy';
        else card.dataset.category = '';
      }
      // if manual card lacks an event-id but title matches an EVENTS entry, attach id
      const titleText = (card.querySelector('h4') || card.querySelector('h3'))?.textContent || '';
      const matched = findEventByTitle(titleText);
      if(matched) card.dataset.eventId = matched.id;
    });
  }

  // Wire up global filter inputs
  if(filterKeyword) filterKeyword.addEventListener('input', filterDomCards);
  if(filterCategory) filterCategory.addEventListener('change', filterDomCards);
  if(resetFilters) resetFilters.addEventListener('click', ()=>{
    if(filterKeyword) filterKeyword.value = '';
    if(filterCategory) filterCategory.value = '';
    filterDomCards();
  });

  // Wire Book buttons for both manual and generated cards
  if(cardsEl){
    cardsEl.addEventListener('click', (e)=>{
      const btn = e.target.closest && e.target.closest('.btn');
      if(!btn) return;
      if(!btn.classList.contains('red')) return; // only Book buttons
      const card = btn.closest('.card');
      if(!card) return;
      const eid = card.dataset.eventId;
      if(eid){
        openBooking(Number(eid));
      } else {
        // fallback: try matching by title text
        const title = (card.querySelector('h4') || card.querySelector('h3'))?.textContent;
        openBooking(title);
      }
    });
  }

  // Modal close
  if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

  // Search form handler (if present)
  if(searchForm){
    searchForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      // perform simple search and re-use DOM filters
      filterDomCards();
      const resultsEl = document.getElementById('results');
      if(resultsEl) resultsEl.scrollIntoView({behavior:'smooth'});
    });
  }

  // Explore button graceful hook
  const exploreBtn = document.getElementById('exploreBtn');
  if(exploreBtn){
    exploreBtn.addEventListener('click', ()=> {
      const resultsEl = document.getElementById('results');
      if(resultsEl) resultsEl.scrollIntoView({behavior:'smooth'});
    });
  }

  // Restore last booking optionally
  const last = JSON.parse(localStorage.getItem('lastBooking') || 'null');
  if(last && last.ref){
    // showSuccess(last); // uncomment if you want to auto-show last success
  }
}

/* start */
init();
