const API_BASE = '';

class AttendanceApp {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.userData = null;
        this.targetPercentage = 75;
        this.sortMethod = 'default';
        this.init();
    }

    init() {
        this.showLogin();
    }

    showLogin(errorMsg = '') {
        this.appContainer.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="logo">
                        <div class="logo-icon">📚</div>
                        <h1>Attendance Manager</h1>
                        <p>Track your classes with ease</p>
                    </div>
                    <form id="login-form">
                        <div class="form-group">
                            <label for="username">Student ID</label>
                            <input 
                                type="text" 
                                id="username" 
                                name="username" 
                                class="form-input" 
                                placeholder="Enter your SRN / PRN"
                                required
                            >
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <div class="input-wrapper">
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    class="form-input" 
                                    placeholder="Enter your password"
                                    required
                                >
                                <button type="button" class="toggle-password" id="toggle-password">
                                    👁️
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="btn" id="login-btn">Sign In</button>
                        ${errorMsg ? `<div class="error-message">${errorMsg}</div>` : ''}
                    </form>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('toggle-password').addEventListener('click', (e) => {
            const input = document.getElementById('password');
            const btn = e.currentTarget;
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        const formData = new FormData(e.target);

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem('authToken', data.token);
                await this.loadDashboard();
            } else {
                this.showLogin(data.error || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            this.showLogin('Unable to connect. Please try again later.');
        }
    }

    async loadDashboard() {
        this.showLoading();

        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                this.showLogin('Session expired. Please login again.');
                return;
            }

            const response = await fetch(`${API_BASE}/api/all_data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();

            if (data.success) {
                this.userData = data;
                this.showDashboard();
            } else {
                sessionStorage.removeItem('authToken');
                this.showLogin('Session expired. Please login again.');
            }
        } catch (error) {
            sessionStorage.removeItem('authToken');
            this.showLogin('Failed to load data. Please try again.');
        }
    }    showLoading() {
        this.appContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p class="loading-text">Loading your data...</p>
            </div>
        `;
    }

    showDashboard() {
        const { student_name, attendance, semesters } = this.userData;

        const totalClasses = attendance.reduce((sum, c) => sum + c.total, 0);
        const totalAttended = attendance.reduce((sum, c) => sum + c.attended, 0);
        const avgPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
        const coursesBelow75 = attendance.filter(c => c.percentage < 75).length;

        this.appContainer.innerHTML = `
            <div class="dashboard">
                <div class="dashboard-header">
                    <div class="welcome-section">
                        <h2>Welcome back, ${student_name}! 👋</h2>
                        <p>Here's your attendance overview</p>
                    </div>
                    <div class="header-actions">
                        <select class="semester-select" id="semester-select">
                            ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                        <button class="btn-secondary" id="logout-btn">Logout</button>
                    </div>
                </div>

                <div class="stats-overview">
                    <div class="stat-card">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Total Courses</div>
                                <div class="stat-value">${attendance.length}</div>
                            </div>
                            <div class="stat-icon primary">📖</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Overall Attendance</div>
                                <div class="stat-value">${avgPercentage}%</div>
                            </div>
                            <div class="stat-icon success">✓</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Courses Below 75%</div>
                                <div class="stat-value">${coursesBelow75}</div>
                            </div>
                            <div class="stat-icon warning">⚠️</div>
                        </div>
                    </div>
                </div>

                <div class="controls-panel">
                    <div class="controls-grid">
                        <div class="control-item">
                            <label>Target Attendance</label>
                            <div class="range-container">
                                <input 
                                    type="range" 
                                    class="range-input" 
                                    id="target-slider"
                                    min="50" 
                                    max="100" 
                                    value="75"
                                >
                                <span class="range-value" id="target-value">75%</span>
                            </div>
                        </div>
                        <div class="control-item">
                            <label>Sort By</label>
                            <select class="semester-select" id="sort-select">
                                <option value="default">Default Order</option>
                                <option value="name">Course Name (A-Z)</option>
                                <option value="percentage">Attendance (High to Low)</option>
                                <option value="bunks-desc">Bunks Available (High to Low)</option>
                                <option value="bunks-asc">Bunks Available (Low to High)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="courses-container">
                    <div class="courses-header">
                        <h3>Your Courses</h3>
                    </div>
                    <div class="courses-grid" id="courses-grid"></div>
                </div>
            </div>
        `;

        this.renderCourses();
        this.attachDashboardListeners();
    }

    calculateBunks(course) {
        const { attended, total } = course;
        if (attended === 0 && total > 0) return 0;
        const bunksLeft = Math.floor((attended / (this.targetPercentage / 100)) - total);
        return Math.max(0, bunksLeft);
    }

    getSortedCourses() {
        const coursesWithBunks = this.userData.attendance.map(course => ({
            ...course,
            bunks: this.calculateBunks(course)
        }));

        switch (this.sortMethod) {
            case 'name':
                return coursesWithBunks.sort((a, b) => a.name.localeCompare(b.name));
            case 'percentage':
                return coursesWithBunks.sort((a, b) => b.percentage - a.percentage);
            case 'bunks-desc':
                return coursesWithBunks.sort((a, b) => b.bunks - a.bunks);
            case 'bunks-asc':
                return coursesWithBunks.sort((a, b) => a.bunks - b.bunks);
            default:
                return coursesWithBunks;
        }
    }

    getAttendanceClass(percentage) {
        if (percentage >= 75) return 'high';
        if (percentage >= 60) return 'medium';
        return 'low';
    }

    renderCourses() {
        const grid = document.getElementById('courses-grid');
        const courses = this.getSortedCourses();

        grid.innerHTML = courses.map(course => `
            <div class="course-card">
                <div class="course-header">
                    <div class="course-name">${course.name}</div>
                    <div class="course-code">${course.code}</div>
                </div>
                <div class="course-stats">
                    <div class="attendance-badge">
                        <span class="attendance-percentage ${this.getAttendanceClass(course.percentage)}">
                            ${course.percentage}%
                        </span>
                        <span class="attendance-label">${course.attended}/${course.total} classes</span>
                    </div>
                </div>
                <div class="bunk-info">
                    <span class="bunk-count">${course.bunks}</span>
                    <span class="bunk-label">classes can be skipped</span>
                </div>
            </div>
        `).join('');
    }

    attachDashboardListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => {
            sessionStorage.removeItem('authToken');
            this.userData = null;
            this.showLogin();
        });

        document.getElementById('target-slider').addEventListener('input', (e) => {
            this.targetPercentage = parseInt(e.target.value);
            document.getElementById('target-value').textContent = `${this.targetPercentage}%`;
            this.renderCourses();
        });

        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.sortMethod = e.target.value;
            this.renderCourses();
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AttendanceApp();
});
