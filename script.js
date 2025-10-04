/* Eventure — main script
   - Mock data
   - Search and filter
   - Renders cards
   - Booking modal + seat selection
   - Checkout simulation and success modal
   - Uses localStorage for last booking
*/

/* -------------------------
   Mock events dataset
   Replace images by putting files in assets/ and updating .img fields.
------------------------- */
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
   DOM refs
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
let seatConfig = { rows: 6, cols: 10, price: 1500 }; // default
let selectedSeats = new Set();
let seatHoldTimer = null;
let holdSeconds = 600; // 10 minutes

/* -------------------------
   Utilities
------------------------- */
function $(sel){ return document.querySelector(sel) }
function createEl(tag, cls){ const e = document.createElement(tag); if(cls) e.className = cls; return e; }

function formatCurrency(x){ return x.toLocaleString(); }
function randomRef(){ return 'EVT-' + Math.random().toString(36).substr(2,6).toUpperCase(); }

/* -------------------------
   Render promos
------------------------- */
const PROMOS = [
  { title: "Up to 30% off selected flights", desc: "Limited period offer", img: "assets/promo-1.jpg" },
  { title: "Festival Season Deals", desc: "Book early & save", img: "assets/promo-2.jpg" },
  { title: "Student Discount", desc: "Special fares", img: "assets/promo-3.jpg" }
];
function renderPromos(){
  promoStrip.innerHTML = '';
  PROMOS.forEach(p=>{
    const pEl = createEl('div','promo');
    pEl.innerHTML = `<h4>${p.title}</h4><p>${p.desc}</p>`;
    promoStrip.appendChild(pEl);
  });
  // rotate promos every 3.5s
  let idx=0;
  setInterval(()=>{
    idx = (idx+1) % PROMOS.length;
    promoStrip.style.transform = `translateX(-${idx * 272}px)`;
  }, 3500);
}

/* -------------------------
   Render event cards
------------------------- */
function renderCards(list){
  cardsEl.innerHTML = '';
  list.forEach(ev=>{
    const card = createEl('article','card');
    const img = createEl('img');
    img.src = ev.img; // replace with your image in assets/
    img.alt = ev.title;
    const body = createEl('div','card-body');
    body.innerHTML = `<h3>${ev.title}</h3><div class="meta">${ev.date} — ${ev.time} • ${ev.venue}</div><p class="desc">${ev.description}</p>`;
    const footer = createEl('div','card-footer');
    footer.innerHTML = `<div class="price">KSh ${formatCurrency(ev.price)}</div>`;
    const bookBtn = createEl('button','btn red');
    bookBtn.textContent = 'Book';
    bookBtn.addEventListener('click', () => openBooking(ev.id));
    footer.appendChild(bookBtn);
    card.appendChild(img);
    card.appendChild(body);
    body.appendChild(footer);
    cardsEl.appendChild(card);
  });
}

/* -------------------------
   Search & filters
------------------------- */
function applyFilters(){
  const kw = filterKeyword.value.trim().toLowerCase();
  const cat = filterCategory.value;
  const filtered = EVENTS.filter(e=>{
    const matchKw = !kw || (e.title.toLowerCase().includes(kw) || e.venue.toLowerCase().includes(kw));
    const matchCat = !cat || e.category === cat;
    return matchKw && matchCat;
  });
  renderCards(filtered);
}

resetFilters.addEventListener('click', ()=>{
  filterKeyword.value=''; filterCategory.value='';
  renderCards(EVENTS);
});
filterKeyword.addEventListener('input', applyFilters);
filterCategory.addEventListener('change', applyFilters);

/* -------------------------
   Booking modal + seat map
------------------------- */
function openBooking(eventId){
  const ev = EVENTS.find(x=>x.id===eventId);
  if(!ev) return;
  currentEvent = ev;
  modalEventTitle.textContent = ev.title;
  modalEventImg.src = ev.img;
  modalEventWhen.textContent = `${ev.date} • ${ev.time}`;
  modalEventVenue.textContent = ev.venue;
  modalSeatPrice.textContent = `KSh ${formatCurrency(ev.price)}`;
  seatConfig.price = ev.price;
  selectedSeats.clear();
  selectedList.textContent = '–';
  selectedTotal.textContent = 'KSh 0';
  buildSeatMap(ev);
  bookingModal.setAttribute('aria-hidden','false');
  bookingModal.scrollIntoView({behavior:'smooth'});
  startHoldTimer(); // start hold for 10 minutes (demo)
}

function closeModal(){
  bookingModal.setAttribute('aria-hidden','true');
  clearHoldTimer();
}

closeModalBtn.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

function buildSeatMap(ev){
  seatMap.innerHTML = '';
  const rows = seatConfig.rows;
  const cols = seatConfig.cols;
  // create sample reserved seats randomly (or use real data)
  const reserved = new Set();
  // random some booked seats for demo
  for(let i=0;i<Math.floor(Math.random()*8);i++){
    reserved.add(String.fromCharCode(65 + Math.floor(Math.random()*rows)) + (Math.ceil(Math.random()*cols)));
  }
  // generate grid
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

function toggleSeat(el){
  const seatId = el.dataset.seat;
  const limit = parseInt(seatsCountSelect.value || '1', 10);
  // if booked, ignore
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
  selectedList.textContent = seats.length ? seats.join(', ') : '–';
  selectedTotal.textContent = 'KSh ' + formatCurrency(seats.length * seatConfig.price);
}

/* -------------------------
   Hold timer (demo)
------------------------- */
function startHoldTimer(){
  holdSeconds = 600; // 10 minutes
  clearHoldTimer();
  updateHoldUI();
  seatHoldTimer = setInterval(()=>{
    holdSeconds--;
    if(holdSeconds <= 0){
      clearHoldTimer();
      // release seats automatically
      selectedSeats.clear();
      updateSelectionUI();
      alert('Hold expired — seats released.');
      closeModal();
    } else {
      updateHoldUI();
    }
  }, 1000);
}
function updateHoldUI(){
  const m = Math.floor(holdSeconds/60);
  const s = holdSeconds%60;
  holdTimerEl.textContent = `Hold expires in ${m}:${String(s).padStart(2,'0')}`;
}
function clearHoldTimer(){ if(seatHoldTimer){ clearInterval(seatHoldTimer); seatHoldTimer=null; holdTimerEl.textContent=''; } }

/* -------------------------
   Confirm booking
------------------------- */
confirmBookingBtn.addEventListener('click', () => {
  const name = document.getElementById('buyerName').value.trim();
  const email = document.getElementById('buyerEmail').value.trim();
  if(!name || !email){
    alert('Please provide name and email to continue.');
    return;
  }
  const seats = Array.from(selectedSeats);
  if(seats.length === 0){
    alert('Please select at least one seat.');
    return;
  }
  // simulate processing
  confirmBookingBtn.disabled = true;
  confirmBookingBtn.textContent = 'Processing...';
  setTimeout(()=>{
    confirmBookingBtn.disabled = false;
    confirmBookingBtn.textContent = 'Confirm Booking';
    finalizeBooking({ name, email, seats });
  }, 1200);
});

function finalizeBooking({name,email,seats}){
  // build booking record
  const ref = randomRef();
  const booking = {
    ref, eventId: currentEvent.id, title: currentEvent.title, date: currentEvent.date, time: currentEvent.time,
    venue: currentEvent.venue, seats, total: seats.length * seatConfig.price, name, email, createdAt: new Date().toISOString()
  };
  // store in localStorage (demo)
  localStorage.setItem('lastBooking', JSON.stringify(booking));
  showSuccess(booking);
  closeModal();
}

/* -------------------------
   Success modal and download
------------------------- */
function showSuccess(booking){
  bookingRefEl.textContent = booking.ref;
  successSummary.innerHTML = `Hi <strong>${booking.name}</strong>, your booking for <strong>${booking.title}</strong> (${booking.date}) has been confirmed. Seats: <strong>${booking.seats.join(', ')}</strong>. Total: <strong>KSh ${formatCurrency(booking.total)}</strong>`;
  successModal.setAttribute('aria-hidden','false');
}
closeSuccessBtn.addEventListener('click', ()=> successModal.setAttribute('aria-hidden','true'));
closeSuccessAction.addEventListener('click', ()=> successModal.setAttribute('aria-hidden','true'));
downloadTicketBtn.addEventListener('click', ()=> {
  const bk = JSON.parse(localStorage.getItem('lastBooking') || '{}');
  if(!bk.ref) return alert('No booking to download.');
  const content = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${bk.ref}</title></head><body style="font-family:Arial;padding:28px"><h2>Eventure e-Ticket</h2><p><strong>Ref:</strong> ${bk.ref}</p><p><strong>Event:</strong> ${bk.title}</p><p><strong>Date:</strong> ${bk.date} ${bk.time}</p><p><strong>Venue:</strong> ${bk.venue}</p><p><strong>Seats:</strong> ${bk.seats.join(', ')}</p><p><strong>Total:</strong> KSh ${formatCurrency(bk.total)}</p><p>Show this at the venue. Thank you for booking with Eventure.</p></body></html>`;
  const w = window.open('','_blank');
  w.document.write(content); w.document.close();
});

/* -------------------------
   Init & events
------------------------- */
function init(){
  renderPromos();
  renderCards(EVENTS);

  // search form submit: filter events by from/to/date (simple demo)
  searchForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const from = document.getElementById('from').value.trim().toLowerCase();
    const to = document.getElementById('to').value.trim().toLowerCase();
    const date = document.getElementById('date').value;
    const seatsNeeded = parseInt(document.getElementById('seatsCount').value || '1',10);
    // basic filtering demo: match venue or title with to/from
    const results = EVENTS.filter(ev=>{
      const matchDate = !date || ev.date === date;
      const matchFromTo = (!from || ev.venue.toLowerCase().includes(from) || ev.title.toLowerCase().includes(from)) &&
                          (!to || ev.venue.toLowerCase().includes(to) || ev.title.toLowerCase().includes(to));
      return matchDate && matchFromTo;
    });
    renderCards(results.length? results : EVENTS);
    // auto-scroll to results
    document.getElementById('results').scrollIntoView({behavior:'smooth'});
  });

  // quick explore button
  document.getElementById('exploreBtn').addEventListener('click', ()=> {
    document.getElementById('results').scrollIntoView({behavior:'smooth'});
  });

  // filters already wired: filter inputs call applyFilters()
  // show last booking if exists
  const last = JSON.parse(localStorage.getItem('lastBooking') || 'null');
  if(last && last.ref){
    // optionally show success on load (comment out if undesired)
    // showSuccess(last);
  }
}

init();
