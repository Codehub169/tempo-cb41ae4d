document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    // All nav-links containers have the class '.nav-links'
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Fade-in animation for elements with .fade-in class (used in index.html)
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
    if (datePicker) { // Check if the element exists on the current page
        const today = new Date().toISOString().split('T')[0];
        datePicker.setAttribute('min', today);
    }

    // Contact Form Submission (contact.html)
    // The form selector targets the form within .contact-form-container
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
                const result = await response.json(); // Assuming backend sends JSON response
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

    // Appointment Booking Form Submission (booking.html)
    // The form selector targets the form within .booking-form-wrapper
    const bookingForm = document.querySelector('.booking-form-wrapper form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(bookingForm);
            const data = Object.fromEntries(formData.entries());
            
            // Ensure date is in YYYY-MM-DD format
            if (data.date) {
                // Input type 'date' should already provide YYYY-MM-DD, but re-format just in case
                const dateObj = new Date(data.date + 'T00:00:00'); // Ensure parsing as local date
                data.date = dateObj.toISOString().split('T')[0];
            }

            try {
                const response = await fetch('/api/book-appointment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json(); // Assuming backend sends JSON response
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
});
