document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('admin-login-section');
    const adminDashboard = document.getElementById('admin-dashboard');
    
    const loginForm = document.getElementById('admin-login-form');
    const loginErrorMessage = document.getElementById('login-error-message');
    const logoutButton = document.getElementById('logout-button');

    // Doctor Management Elements
    const addDoctorForm = document.getElementById('add-doctor-form');
    const doctorsTableBody = document.querySelector('#doctors-table tbody');
    const addDoctorMessage = document.getElementById('add-doctor-message');
    const doctorsListMessage = document.getElementById('doctors-list-message');

    // Appointment Management Elements
    const appointmentsTableBody = document.querySelector('#appointments-table tbody');
    const appointmentsListMessage = document.getElementById('appointments-list-message');

    const ADMIN_TOKEN_KEY = 'adminAuthToken';

    function showLogin() {
        loginSection.style.display = 'block';
        adminDashboard.style.display = 'none';
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        if (loginErrorMessage) loginErrorMessage.textContent = '';
        clearMessages();
        // Clear tables on logout
        if(doctorsTableBody) doctorsTableBody.innerHTML = '';
        if(appointmentsTableBody) appointmentsTableBody.innerHTML = '';
    }

    function showDashboard() {
        loginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        fetchAdminDoctors();
        fetchAppointments();
    }
    
    function clearMessages() {
        if(addDoctorMessage) {
            addDoctorMessage.textContent = '';
            addDoctorMessage.className = 'status-message';
        }
        if(doctorsListMessage) {
            doctorsListMessage.textContent = '';
            doctorsListMessage.className = 'status-message';
        }
        if(appointmentsListMessage) {
            appointmentsListMessage.textContent = '';
            appointmentsListMessage.className = 'status-message';
        }
        if(loginErrorMessage) {
            loginErrorMessage.textContent = '';
            loginErrorMessage.className = 'status-message error-message'; // Keep error class by default
        }
    }

    function setStatusMessage(element, message, isError = false) {
        if (element) {
            element.textContent = message;
            element.className = 'status-message ' + (isError ? 'error-message' : 'success-message');
        }
    }

    async function apiCall(url, method = 'GET', body = null) {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token && url !== '/api/admin/login') { // Allow login call without token
            showLogin();
            throw new Error('No admin token found. Please login.');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
        };
        if (body) {
            headers['Content-Type'] = 'application/json';
        }
        // For login, no auth header needed initially
        if (url === '/api/admin/login') delete headers['Authorization'];

        const config = {
            method: method,
            headers: headers,
        };
        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(url, config);

        if ((response.status === 401 || response.status === 403) && url !== '/api/admin/login') {
            const errorData = await response.json().catch(() => ({ message: 'Session expired or unauthorized.' }));
            showLogin();
            throw new Error(errorData.message || 'Session expired or unauthorized. Please login again.');
        }
        return response;
    }

    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
        showDashboard();
    } else {
        showLogin();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearMessages();
            const username = event.target.username.value;
            const password = event.target.password.value;

            try {
                const response = await apiCall('/api/admin/login', 'POST', { username, password });
                const data = await response.json();
                if (response.ok && data.success && data.token) {
                    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
                    showDashboard();
                } else {
                    setStatusMessage(loginErrorMessage, data.message || 'Login failed. Please try again.', true);
                }
            } catch (error) {
                console.error('Login error:', error);
                setStatusMessage(loginErrorMessage, 'An error occurred during login. Check server connection.', true);
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            showLogin();
        });
    }

    async function fetchAdminDoctors() {
        if (!doctorsTableBody) return;
        setStatusMessage(doctorsListMessage, 'Loading doctors...');
        try {
            const response = await apiCall('/api/admin/doctors');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to load doctors.'}));
                throw new Error(errorData.message);
            }
            const doctors = await response.json();
            renderAdminDoctors(doctors);
            setStatusMessage(doctorsListMessage, doctors.length > 0 ? '' : 'No doctors found. Add one using the form above.', doctors.length === 0);
        } catch (error) {
            console.error('Error fetching admin doctors:', error);
            setStatusMessage(doctorsListMessage, `Error: ${error.message}`, true);
            if (doctorsTableBody) doctorsTableBody.innerHTML = '<tr><td colspan="4">Failed to load doctors.</td></tr>';
        }
    }

    function renderAdminDoctors(doctors) {
        if (!doctorsTableBody) return;
        doctorsTableBody.innerHTML = ''; 
        if (!doctors || doctors.length === 0) {
            doctorsTableBody.innerHTML = '<tr><td colspan="4">No doctors currently listed.</td></tr>';
            return;
        }
        doctors.forEach(doctor => {
            const row = doctorsTableBody.insertRow();
            row.insertCell().textContent = doctor.id;
            row.insertCell().textContent = doctor.name;
            row.insertCell().textContent = doctor.specialty;
            const actionsCell = row.insertCell();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.classList.add('btn-danger');
            removeButton.onclick = () => removeDoctor(doctor.id, doctor.name);
            actionsCell.appendChild(removeButton);
        });
    }

    if (addDoctorForm) {
        addDoctorForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearMessages();
            const formData = new FormData(addDoctorForm);
            const doctorData = Object.fromEntries(formData.entries());
            setStatusMessage(addDoctorMessage, 'Adding doctor...');

            try {
                const response = await apiCall('/api/admin/doctors', 'POST', doctorData);
                const result = await response.json();
                if (response.ok) {
                    setStatusMessage(addDoctorMessage, result.message || 'Doctor added successfully!');
                    addDoctorForm.reset();
                    fetchAdminDoctors(); 
                } else {
                    setStatusMessage(addDoctorMessage, result.message || 'Failed to add doctor.', true);
                }
            } catch (error) {
                console.error('Error adding doctor:', error);
                setStatusMessage(addDoctorMessage, `Error: ${error.message}`, true);
            }
        });
    }

    async function removeDoctor(doctorId, doctorName) {
        if (!confirm(`Are you sure you want to remove Dr. ${doctorName} (ID: ${doctorId})? This action cannot be undone.`)) {
            return;
        }
        clearMessages();
        setStatusMessage(doctorsListMessage, `Removing Dr. ${doctorName}...`);
        try {
            const response = await apiCall(`/api/admin/doctors/${doctorId}`, 'DELETE');
            const result = await response.json();
            if (response.ok) {
                setStatusMessage(doctorsListMessage, result.message || 'Doctor removed successfully!');
                fetchAdminDoctors(); 
            } else {
                setStatusMessage(doctorsListMessage, result.message || 'Failed to remove doctor.', true);
            }
        } catch (error) {
            console.error('Error removing doctor:', error);
            setStatusMessage(doctorsListMessage, `Error: ${error.message}`, true);
        }
    }

    async function fetchAppointments() {
        if (!appointmentsTableBody) return;
        setStatusMessage(appointmentsListMessage, 'Loading appointments...');
        try {
            const response = await apiCall('/api/admin/appointments');
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to load appointments.'}));
                throw new Error(errorData.message);
            }
            const appointments = await response.json();
            renderAppointments(appointments);
             setStatusMessage(appointmentsListMessage, appointments.length > 0 ? '' : 'No appointments found.', appointments.length === 0);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setStatusMessage(appointmentsListMessage, `Error: ${error.message}`, true);
            if (appointmentsTableBody) appointmentsTableBody.innerHTML = '<tr><td colspan="10">Failed to load appointments.</td></tr>';
        }
    }

    function renderAppointments(appointments) {
        if (!appointmentsTableBody) return;
        appointmentsTableBody.innerHTML = ''; 
        if (!appointments || appointments.length === 0) {
            appointmentsTableBody.innerHTML = '<tr><td colspan="10">No appointments found.</td></tr>';
            return;
        }
        appointments.forEach(app => {
            const row = appointmentsTableBody.insertRow();
            row.insertCell().textContent = app.id;
            row.insertCell().textContent = app.patient_name;
            row.insertCell().textContent = app.phone;
            row.insertCell().textContent = app.email || 'N/A';
            row.insertCell().textContent = app.doctor_name || 'Any Available Doctor';
            const preferredDate = app.preferred_date ? new Date(app.preferred_date + 'T00:00:00Z') : null; // Treat as UTC for consistent display then format locally
            row.insertCell().textContent = preferredDate ? preferredDate.toLocaleDateString() : 'N/A';
            row.insertCell().textContent = app.preferred_time_slot || 'N/A';
            row.insertCell().textContent = app.reason || 'N/A';
            row.insertCell().textContent = app.submission_date ? new Date(app.submission_date).toLocaleString() : 'N/A';
            
            const actionsCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('btn-danger');
            deleteButton.onclick = () => deleteAppointment(app.id);
            actionsCell.appendChild(deleteButton);
        });
    }

    async function deleteAppointment(appointmentId) {
        if (!confirm(`Are you sure you want to delete appointment ID: ${appointmentId}?`)) {
            return;
        }
        clearMessages();
        setStatusMessage(appointmentsListMessage, `Deleting appointment ${appointmentId}...`);
        try {
            const response = await apiCall(`/api/admin/appointments/${appointmentId}`, 'DELETE');
            const result = await response.json();
            if (response.ok) {
                setStatusMessage(appointmentsListMessage, result.message || 'Appointment deleted successfully!');
                fetchAppointments(); 
            } else {
                setStatusMessage(appointmentsListMessage, result.message || 'Failed to delete appointment.', true);
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            setStatusMessage(appointmentsListMessage, `Error: ${error.message}`, true);
        }
    }
});