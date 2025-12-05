const API_BASE = 'https://pesuattendance.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.getElementById('app-root');
    const loaderContainer = document.querySelector('.loader-container');

    let allData = {};
    let currentSortMethod = 'default';
    let currentCalendarDate = new Date();
    let modalCalendarDate = new Date();
    let userBunkDays = new Set();

    const LoginPage = (error = '') => `
      <div class="login-page page" id="login-page">
        <h1>Welcome</h1>
        <p>Sign in to view your attendance.</p>
        <form id="login-form" class="login-form">
          <div class="form-group">
            <input name="username" class="form-input" type="text" placeholder="SRN / PRN" required>
          </div>
          <div class="form-group">
            <input id="password-input" name="password" class="form-input" type="password" placeholder="Password" required>
            <div id="password-toggle-btn" class="password-toggle"></div>
          </div>
          <button type="submit" class="btn">Sign In</button>
          ${error ? `<div class="error-box">${error}</div>` : ''}
        </form>
        <p class="login-info-text">
          <a href="#" id="why-login-link" style="color: var(--accent-blue); text-decoration: none; font-size: 0.9rem;">Why login?</a>
        </p>
      </div>
    `;

    const WhyLoginModal = `
      <div class="modal-container" id="why-login-modal">
        <div class="modal-backdrop"></div>
        <div class="modal">
          <button class="modal-close-btn">&times;</button>
          <h2>Why login?</h2>
          <p>
            This website requires your <b>PESU credentials</b> only to fetch your official attendance details directly from PESU Academy.
            Your login information is <b>never stored</b> or shared, and all requests are made securely.
          </p>
          <p>
            Data is fetched from: <b>${API_BASE}</b>
          </p>
        </div>
      </div>
    `;

    const AttendancePage = (data) => `
            <div class="attendance-page page" id="attendance-page">
              <div class="container">
                <header class="header">
                  <div class="header-left">
                    <h1>Hello, ${data.student_name}</h1>
                  </div>
                  <div class="header-actions" style="display: flex; gap: 0.5rem;">
                    <a href="#" id="logout-btn" class="btn-logout">Logout</a>
                  </div>
                </header>

                <div class="mode-info">
                  <div class="mode-info-icon">💡</div>
                  <div class="mode-info-text">
                    <p><strong>Instant</strong> shows how many classes you can miss <em>right now</em> before your attendance falls below the target.</p>
                    <p><strong>Long‑Term</strong> projects the <em>maximum total</em> number of classes you can miss across the entire semester.</p>
                  </div>
                </div>
                <div class="mode-toggle">
                    <div class="mode-toggle-slider"></div>
                    <button class="mode-toggle-btn active" data-mode="instant">Instant Calculator</button>
                    <button class="mode-toggle-btn" data-mode="long-term">Long-Term Projection</button>
                </div>
                <div class="calculators-wrapper">
                    <div id="instant-calculator" class="calculator-section visible">
                        <div class="controls-container">
                            <div class="control-group"><label>Semester</label><select id="semester_select" class="select-input">${data.semesters.map(s => `<option value="${s.id}" ${s.id === data.selected_batch_id ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
                            <div class="control-group"><label>Sort By</label><select id="sort_select" class="select-input"><option value="default">Default</option><option value="az">Name (A-Z)</option><option value="bunks-asc">Bunks (Least to Most)</option><option value="bunks-desc">Bunks (Most to Least)</option></select></div>
                            <div class="control-group"><label>Minimum Target</label><input type="range" id="min-attendance" min="50" max="100" value="75"></div>
                            <div class="control-group"><label>Target %</label><div id="slider-value">75%</div></div>
                        </div>
                        <main class="courses-grid"></main>
                    </div>
                    <div id="long-term-calculator" class="calculator-section">
                        <div class="long-term-controls">
                            <div class="control-group date-picker-wrapper">
                                <label for="end-date-picker">Select End Date of Semester</label>
                                <div id="date-picker-trigger" class="select-input date-picker-trigger">Select a date</div>
                                <input type="date" id="end-date-picker" style="display: none;">
                                <div id="ios-calendar-container" class="ios-calendar-container">
                                    <div class="calendar-main"></div>
                                    <div class="calendar-legend">
                                        <div class="legend-title">Treat as Holiday:</div>
                                        <div class="legend-item"><div class="legend-dot dot-holiday"></div><label>Holidays & Sundays</label></div>
                                        <div class="legend-item">
                                          <div class="legend-dot dot-isa"></div>
                                          <label for="isa-holiday-toggle">ISAs</label>
                                          <input type="checkbox" id="isa-holiday-toggle" checked>
                                        </div>
                                        <div class="legend-item">
                                          <div class="legend-dot dot-event"></div>
                                          <label for="event-holiday-toggle">Other Events</label>
                                          <input type="checkbox" id="event-holiday-toggle" checked>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="control-group date-picker-wrapper">
                              <label for="bunk-day-picker">Select Bunk Days</label>
                              <div id="bunk-picker-trigger" class="select-input date-picker-trigger">Select days</div>
                              <input type="date" id="bunk-day-picker" style="display:none;">
                              <div id="bunk-calendar-container" class="ios-calendar-container">
                                  <div class="bunk-calendar-main"></div>
                                  <div class="calendar-legend">
                                    <div class="legend-title">Marked as Bunk:</div>
                                    <div class="legend-item">
                                       <div class="legend-dot" style="background:#8a4dff;"></div>
                                       <label>You plan to skip</label>
                                    </div>
                                  </div>
                              </div>
                            </div>
                        </div>
                        <main class="courses-grid long-term-results"></main>
                    </div>
                </div>
            </div>
        </div>`;

    const renderCards = (courses, gridSelector) => {
        const grid = document.querySelector(gridSelector);
        if (!grid) return;
        grid.innerHTML = courses.map(c => `
            <div class="course-card" data-code="${c.code}">
                <div class="card-content">
                    <h2>${c.name}</h2>
                    <p class="course-code">${c.code}</p>
                    <div class="info-row">
                        <span class="info-label">Current:</span>
                        <span class="info-value"><b>${c.attended}/${c.total} (${c.percentage}%)</b></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">You can miss</span>
                        <div class="bunk-info"><span class="bunk-count">0</span> more class(es).</div>
                    </div>
                </div>
            </div>
        `).join('');
        document.querySelectorAll(gridSelector + ' .course-card').forEach((card, index) => {
            setTimeout(() => card.classList.add('visible'), index * 50);
        });
    };

    const updateDisplay = () => {
        const slider = document.getElementById('min-attendance');
        if (!slider || !allData.attendance) return;
        const minPercentage = parseInt(slider.value);
        const coursesWithBunks = allData.attendance.map(course => {
            const total = course.total, attended = course.attended;
            if (attended === 0 && total > 0) return { ...course, bunks: 0 };
            const bunksLeft = Math.floor((attended / (minPercentage / 100)) - total);
            return { ...course, bunks: Math.max(0, bunksLeft) };
        });
        if (currentSortMethod === 'az') coursesWithBunks.sort((a, b) => a.name.localeCompare(b.name));
        else if (currentSortMethod === 'bunks-asc') coursesWithBunks.sort((a, b) => a.bunks - b.bunks);
        else if (currentSortMethod === 'bunks-desc') coursesWithBunks.sort((a, b) => b.bunks - a.bunks);
        renderCards(coursesWithBunks, '#instant-calculator .courses-grid');
        document.getElementById('slider-value').textContent = `${minPercentage}%`;
        updateSliderColor(slider);
        document.querySelectorAll('#instant-calculator .course-card').forEach((card, index) => {
            card.querySelector('.bunk-count').textContent = coursesWithBunks[index].bunks;
        });
    };

    const showLoader = (show) => loaderContainer.classList.toggle('visible', show);

    const transitionTo = (newPageHTML, callback) => {
        const currentPage = appRoot.querySelector('.page');
        if (currentPage) {
            currentPage.classList.remove('visible');
            currentPage.addEventListener('transitionend', () => {
                appRoot.innerHTML = newPageHTML;
                const newPage = appRoot.querySelector('.page');
                setTimeout(() => { newPage.classList.add('visible'); if (callback) callback(); }, 50);
            }, { once: true });
        } else {
            appRoot.innerHTML = newPageHTML;
            const newPage = appRoot.querySelector('.page');
            setTimeout(() => { newPage.classList.add('visible'); if (callback) callback(); }, 50);
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        showLoader(true);
        const formData = new FormData(event.target);
        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                // Store credentials temporarily for subsequent requests
                sessionStorage.setItem('username', formData.get('username'));
                sessionStorage.setItem('password', formData.get('password'));
                await loadInitialData();
            } else {
                showLoader(false);
                transitionTo(LoginPage(data.error || 'Login failed'), attachLoginListeners);
            }
        } catch (error) {
            showLoader(false);
            transitionTo(LoginPage('Network error or CORS issue. The API may not support direct browser access.'), attachLoginListeners);
        }
    };

    const handleLogout = async (event) => {
        event.preventDefault();
        allData = null;
        sessionStorage.clear();
        transitionTo(LoginPage(), attachLoginListeners);
        try {
            await fetch(`${API_BASE}/api/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const loadInitialData = async (batchId = '') => {
        showLoader(true);
        const url = `${API_BASE}/api/all_data${batchId ? `?batch_id=${batchId}` : ''}`;
        try {
            const response = await fetch(url);
            allData = await response.json();
            if (!allData.success) throw new Error(allData.error);
            transitionTo(AttendancePage(allData), attachAttendanceListeners);
        } catch (error) {
            sessionStorage.clear();
            transitionTo(LoginPage(error.message || 'Session expired. Please login again.'), attachLoginListeners);
        } finally {
            showLoader(false);
        }
    };

    const updateSliderColor = (slider) => {
        if (!slider) return;
        const percentage = (slider.value - slider.min) / (slider.max - slider.min);
        const hue = percentage * 120;
        const color = `hsl(${hue}, 80%, 45%)`;
        slider.style.background = `linear-gradient(90deg, ${color} ${percentage * 100}%, var(--slider-track-color) ${percentage * 100}%)`;
    };

    const calculateLongTermBunks = () => {
        if (!allData.calendar || !allData.timetable || !allData.attendance) return;

        const endDatePicker = document.getElementById('end-date-picker');
        const slider = document.getElementById('min-attendance');
        const resultsGrid = document.querySelector('.long-term-results');
        if (!endDatePicker || !slider || !resultsGrid || !endDatePicker.value) return;

        const minPercentage = parseFloat(slider.value) / 100;

        const projectedResults = allData.attendance.map(course => {
            const bunks = Math.floor((course.attended / minPercentage) - course.total);
            return {
                ...course,
                bunks: Math.max(0, bunks)
            };
        });

        resultsGrid.innerHTML = projectedResults.map(c => `
            <div class="course-card visible" data-code="${c.code}">
                <div class="card-content">
                    <h2>${c.name}</h2>
                    <p class="course-code">${c.code}</p>
                    <p class="current-attendance">Current: ${c.attended}/${c.total} (${c.percentage}%)</p>
                    <div class="bunk-info">
                        <span class="bunk-count">${c.bunks}</span><span> more class(es)</span>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const attachLoginListeners = () => {
        const whyLoginLink = document.getElementById('why-login-link');
        if (whyLoginLink) {
            whyLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.body.insertAdjacentHTML('beforeend', WhyLoginModal);
                const modal = document.getElementById('why-login-modal');
                setTimeout(() => modal.classList.add('visible'), 10);

                const closeModal = () => {
                    modal.classList.remove('visible');
                    modal.addEventListener('transitionend', () => modal.remove(), { once: true });
                };
                modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
                modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
            });
        }
        document.getElementById('login-form').addEventListener('submit', handleLogin);
        const toggleBtn = document.getElementById('password-toggle-btn');
        const passwordInput = document.getElementById('password-input');
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const isVisible = passwordInput.type === 'text';
                passwordInput.type = isVisible ? 'password' : 'text';
                toggleBtn.classList.toggle('visible', !isVisible);
            });
        }
    };

    const attachAttendanceListeners = () => {
        const toggleContainer = document.querySelector('.mode-toggle');
        const sliderEl = document.querySelector('.mode-toggle-slider');
        const buttons = document.querySelectorAll('.mode-toggle-btn');

        const moveSlider = (targetButton) => {
            const containerLeft = toggleContainer.getBoundingClientRect().left;
            const targetLeft = targetButton.getBoundingClientRect().left;
            const newLeft = targetLeft - containerLeft;
            sliderEl.style.width = `${targetButton.offsetWidth}px`;
            sliderEl.style.transform = `translateX(${newLeft}px)`;
        };

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('active')) return;
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                moveSlider(btn);

                const mode = btn.dataset.mode;
                document.querySelectorAll('.calculator-section')
                    .forEach(sec => sec.classList.remove('visible'));
                document.getElementById(`${mode}-calculator`).classList.add('visible');
                if (mode === 'long-term') setupLongTermUI();
            });
        });

        moveSlider(document.querySelector('.mode-toggle-btn.active'));

        document.getElementById('logout-btn').addEventListener('click', handleLogout);

        document.getElementById('semester_select')
            .addEventListener('change', (e) => loadInitialData(e.target.value));

        document.getElementById('sort_select')
            .addEventListener('change', (e) => { currentSortMethod = e.target.value; updateDisplay(); });

        document.getElementById('min-attendance')
            .addEventListener('input', updateDisplay);

        updateDisplay();
    };

    const setupLongTermUI = () => {
        if (!allData.calendar || !allData.timetable) return;
        const endDatePicker = document.getElementById('end-date-picker');
        const slider = document.getElementById('min-attendance');

        if (!endDatePicker.value && allData.calendar.length > 0) {
            const lastEvent = [...allData.calendar].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];
            const defaultDate = new Date(lastEvent.endDate);
            endDatePicker.value = defaultDate.toISOString().split('T')[0];
        }

        endDatePicker.onchange = calculateLongTermBunks;
        slider.oninput = calculateLongTermBunks;
        calculateLongTermBunks();
    };

    const initialize = async () => {
        // Skip session check since the API doesn't support it
        // Just show login page
        showLoader(false);
        transitionTo(LoginPage(), attachLoginListeners);
    };
    initialize();
});
