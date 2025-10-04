document.getElementById("bookNowBtn").addEventListener("click", () => {
  document.getElementById("bookingSection").style.display = "block";
  window.scrollTo(0, document.getElementById("bookingSection").offsetTop);
});

document.getElementById("bookingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("bookingSection").style.display = "none";
  document.getElementById("seatSelection").style.display = "block";

  const seatContainer = document.getElementById("seatsContainer");
  seatContainer.innerHTML = "";
  for (let i = 1; i <= 30; i++) {
    const seat = document.createElement("div");
    seat.classList.add("seat");
    seat.innerText = i;
    seat.addEventListener("click", () => seat.classList.toggle("selected"));
    seatContainer.appendChild(seat);
  }
});

document.getElementById("confirmSeatsBtn").addEventListener("click", () => {
  const selectedSeats = [...document.querySelectorAll(".seat.selected")].map(s => s.innerText);
  if (selectedSeats.length === 0) {
    alert("Please select at least one seat!");
    return;
  }

  document.getElementById("seatSelection").style.display = "none";
  document.getElementById("confirmation").style.display = "block";
  document.getElementById("confirmationMessage").innerText = 
    `You have successfully booked seat(s): ${selectedSeats.join(", ")}. 
    Your flight details have been sent to your email.`;
});
