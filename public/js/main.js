document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Fade-in animation for elements with .fade-in class
    const faders = document.querySelectorAll('.fade-in');
    if (faders.length > 0) {
        const appearOptions = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        };

        const appearOnScroll = new IntersectionObserver(function(entries, appearOnScrollObserver) {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                } else {
                    entry.target.classList.add('visible');
                    appearOnScrollObserver.unobserve(entry.target);
                }
            });
        }, appearOptions);

        faders.forEach(fader => {
            appearOnScroll.observe(fader);
        });
    }

    // Booking page: Set min date for date picker to today
    const datePicker = document.getElementById('date');
    if (datePicker) {
        const today = new Date().toISOString().split('T')[0];
        datePicker.setAttribute('min', today);
    }

    // Contact Form Submission
    const contactForm = document.querySelector('.contact-form-container form'); 
    if (contactForm) {
        contactForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    alert(result.message || 'Message sent successfully! We will get back to you soon.');
                    contactForm.reset();
                } else {
                    alert('Error: ' + (result.message || 'Could not send message.'));
                }
            } catch (error) {
                console.error('Error submitting contact form:', error);
                alert('An error occurred while sending the message. Please try again later.');
            }
        });
    }

    // Appointment Booking Form Submission
    const bookingForm = document.querySelector('.booking-form-wrapper form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(bookingForm);
            const data = Object.fromEntries(formData.entries());
            
            if (data.preferred_date) {
                const dateObj = new Date(data.preferred_date + 'T00:00:00'); 
                data.preferred_date = dateObj.toISOString().split('T')[0];
            }

            try {
                const response = await fetch('/api/book-appointment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    alert(result.message || 'Appointment requested successfully! Our team will call you to confirm.');
                    bookingForm.reset();
                } else {
                    alert('Error: ' + (result.message || 'Could not request appointment.'));
                }
            } catch (error) {
                console.error('Error submitting appointment form:', error);
                alert('An error occurred while requesting the appointment. Please try again later.');
            }
        });
    }

    // --- New Doctor Functionality ---
    async function fetchDoctors() {
        try {
            const response = await fetch('/api/doctors');
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
                return []; // Return empty array on error
            }
            return await response.json();
        } catch (error) {
            console.error("Could not fetch doctors:", error);
            return []; // Return empty array on error
        }
    }

    // Populate Doctors on Homepage (index.html)
    const homepageDoctorsGrid = document.querySelector('section#doctors .doctors-grid');
    if (homepageDoctorsGrid) {
        fetchDoctors().then(doctors => {
            if (doctors && doctors.length > 0) {
                homepageDoctorsGrid.innerHTML = ''; // Clear any placeholders
                doctors.slice(0, 3).forEach(doctor => { // Show first 3 doctors on homepage
                    const doctorCard = document.createElement('div');
                    doctorCard.classList.add('doctor-card');
                    doctorCard.innerHTML = `
                        <img src="${doctor.image_url || 'https://via.placeholder.com/300x280.png?text=Doctor+Image'}" alt="${doctor.name}">
                        <div class="doctor-info">
                            <h3>${doctor.name}</h3>
                            <p>${doctor.specialty}</p>
                        </div>
                    `;
                    homepageDoctorsGrid.appendChild(doctorCard);
                });
            } else if (doctors) { // doctors is an empty array
                homepageDoctorsGrid.innerHTML = '<p>Our expert team will be listed here soon.</p>';
            }
            // If doctors is undefined (fetch failed and returned undefined), grid remains empty or shows previous error message.
        }).catch(err => {
            console.error("Error populating homepage doctors:", err);
            homepageDoctorsGrid.innerHTML = '<p>Could not load doctor information. Please try again later.</p>';
        });
    }

    // Populate Doctors on Doctors Page (doctors.html)
    const doctorsPageGrid = document.querySelector('main section .team-grid'); // More specific selector for doctors.html
    if (doctorsPageGrid && window.location.pathname.includes('doctors.html')) { // Check if we are on doctors.html by checking for the specific grid container and path
        fetchDoctors().then(doctors => {
            if (doctors && doctors.length > 0) {
                doctorsPageGrid.innerHTML = ''; // Clear any placeholders
                doctors.forEach(doctor => {
                    const profileCard = document.createElement('div');
                    profileCard.classList.add('doctor-profile-card');
                    profileCard.innerHTML = `
                        <div class="card-header">
                            <img src="${doctor.image_url || 'https://via.placeholder.com/300x250.png?text=Doctor+Image'}" alt="${doctor.name}">
                        </div>
                        <div class="card-body">
                            <h3>${doctor.name}</h3>
                            <p class="specialty">${doctor.specialty}</p>
                            <p class="bio">${doctor.bio || 'Detailed biography not available.'}</p>
                            <a href="booking.html" class="cta-button">Book with ${doctor.name}</a>
                        </div>
                    `;
                    doctorsPageGrid.appendChild(profileCard);
                });
            } else if (doctors) {
                doctorsPageGrid.innerHTML = '<p>Our team of specialists will be listed here soon.</p>';
            }
        }).catch(err => {
            console.error("Error populating doctors page:", err);
            doctorsPageGrid.innerHTML = '<p>Could not load specialist information. Please try again later.</p>';
        });
    }

    // Populate Doctor Dropdown on Booking Page (booking.html)
    const doctorSelectDropdown = document.getElementById('doctor');
    if (doctorSelectDropdown) {
        fetchDoctors().then(doctors => {
            if (doctors && doctors.length > 0) {
                doctors.forEach(doctor => {
                    const option = document.createElement('option');
                    option.value = doctor.id; // Use doctor ID for value
                    option.textContent = doctor.name;
                    doctorSelectDropdown.appendChild(option);
                });
            }
        }).catch(err => {
            console.error("Error populating doctor dropdown:", err);
            // Optionally, inform the user in the UI, though the 'Any Available Doctor' option still works.
        });
    }
    // --- End New Doctor Functionality ---
});
