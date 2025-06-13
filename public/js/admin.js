document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('admin-login-section');
    const appointmentsSection = document.getElementById('admin-appointments-section');
    const loginForm = document.getElementById('admin-login-form');
    const appointmentsTableBody = document.querySelector('#appointments-table tbody');
    const loginErrorMessage = document.getElementById('login-error-message');
    const logoutButton = document.getElementById('logout-button');

    const ADMIN_TOKEN_KEY = 'adminAuthToken';

    function showLogin() {
        loginSection.style.display = 'block';
        appointmentsSection.style.display = 'none';
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        if (appointmentsTableBody) appointmentsTableBody.innerHTML = ''; // Clear table
        if (loginErrorMessage) loginErrorMessage.style.display = 'none';
    }

    function showAppointments() {
        loginSection.style.display = 'none';
        appointmentsSection.style.display = 'block';
        fetchAppointments();
    }

    // Check if already logged in
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
        showAppointments();
    } else {
        showLogin();
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = event.target.username.value;
            const password = event.target.password.value;
            if(loginErrorMessage) loginErrorMessage.style.display = 'none';

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await response.json();
                if (response.ok && data.success && data.token) {
                    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
                    showAppointments();
                } else {
                    if(loginErrorMessage) {
                        loginErrorMessage.textContent = data.message || 'Login failed. Please try again.';
                        loginErrorMessage.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                if(loginErrorMessage) {
                    loginErrorMessage.textContent = 'An error occurred during login.';
                    loginErrorMessage.style.display = 'block';
                }
            }
        });
    }

    // Fetch and render appointments
    async function fetchAppointments() {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) {
            showLogin();
            return;
        }

        try {
            const response = await fetch('/api/admin/appointments', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 403 || response.status === 401) { // Unauthorized or Forbidden
                const data = await response.json(); // Attempt to get error message from server
                alert(data.message || 'Session expired or invalid. Please login again.');
                showLogin();
                return;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const appointments = await response.json();
            renderAppointments(appointments);

        } catch (error) {
            console.error('Error fetching appointments:', error);
            if (appointmentsTableBody) appointmentsTableBody.innerHTML = '<tr><td colspan="9">Failed to load appointments.</td></tr>';
        }
    }

    // Render appointments into the table
    function renderAppointments(appointments) {
        if (!appointmentsTableBody) return;
        appointmentsTableBody.innerHTML = ''; // Clear existing rows

        if (appointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="9">No appointments found.</td></tr>';
            return;
        }

        appointments.forEach(app => {
            const row = appointmentsTableBody.insertRow();
            row.insertCell().textContent = app.id;
            row.insertCell().textContent = app.patient_name;
            row.insertCell().textContent = app.phone;
            row.insertCell().textContent = app.email || 'N/A';
            row.insertCell().textContent = app.preferred_doctor || 'Any';
            // Ensure date is treated as local, not UTC, for toLocaleDateString
            const preferredDate = app.preferred_date ? new Date(app.preferred_date + 'T00:00:00') : null;
            row.insertCell().textContent = preferredDate ? preferredDate.toLocaleDateString() : 'N/A';
            row.insertCell().textContent = app.preferred_time_slot || 'N/A';
            row.insertCell().textContent = app.reason || 'N/A';
            row.insertCell().textContent = app.submission_date ? new Date(app.submission_date).toLocaleString() : 'N/A';
        });
    }

    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            showLogin();
        });
    }
});