/**
 * Navigation component for the Travel Planner application
 * This component provides navigation links to all main sections of the app
 */

class Navbar {
  constructor() {
    this.userToken = localStorage.getItem('token');
    let username = localStorage.getItem('username');
    
    // Check if username is a JSON string and parse it if needed
    if (username && (username.startsWith('{') || username.startsWith('[')) && username.includes('username')) {
      try {
        const userData = JSON.parse(username);
        username = userData.username || 'User';
        // Store the correct username for future use
        localStorage.setItem('username', username);
      } catch (e) {
        console.error('Error parsing username:', e);
        username = 'User';
      }
    }
    
    this.username = username || 'User';
  }

  /**
   * Initialize the navbar
   */
  init() {
    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the navbar
   */
  render() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const isLoggedIn = !!this.userToken;
    
    navbar.innerHTML = `
      <header class="header">
        <nav class="navbar navbar-expand-lg">
          <div class="container">
            <a class="navbar-brand" href="index.html">
              <i class="fas fa-globe-americas"></i> AI Travel Planner
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
              <ul class="navbar-nav me-auto">
                ${isLoggedIn ? `
                  <li class="nav-item">
                    <a class="nav-link" href="dashboard.html">Dashboard</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="trip-details.html">My Trips</a>
                  </li>
                 <li class="nav-item">
                    <a class="nav-link" href="https://cdn.botpress.cloud/webchat/v2.4/shareable.html?configUrl=https://files.bpcontent.cloud/2025/05/18/10/20250518101057-0V0NRF1B.json" target="_blank">
                      AI Assistant
                    </a>
                 </li>

                  <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="plannerDropdown" role="button" data-bs-toggle="dropdown">
                      Trip Planner
                    </a>
                    <ul class="dropdown-menu">
                      <li><a class="dropdown-item" href="itinerary-builder.html">Itinerary Builder</a></li>
                      <li><a class="dropdown-item" href="itinerary.html">View Itinerary</a></li>
                    </ul>
                  </li>
                ` : ''}
              </ul>
              <ul class="navbar-nav">
                ${isLoggedIn ? `
                  <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                      <i class="fas fa-user-circle"></i> ${this.username || 'User'}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li><a class="dropdown-item" href="#" id="logout-btn">Logout</a></li>
                    </ul>
                  </li>
                ` : `
                  <li class="nav-item">
                    <a class="nav-link" href="login.html">Login</a>
                  </li>
                  <li class="nav-item">
                    <a class="nav-link" href="signup.html">Register</a>
                  </li>
                `}
                <li class="nav-item">
                  <div class="theme-toggle-nav">
                    <input type="checkbox" id="theme-switch-nav" class="theme-switch">
                    <label for="theme-switch-nav" class="theme-switch-label">
                      <i class="fas fa-sun"></i>
                      <i class="fas fa-moon"></i>
                      <span class="slider"></span>
                    </label>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </header>
    `;
  }

  /**
   * Attach event listeners to navbar elements
   */
  attachEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Handle theme toggle in navbar
    const themeSwitch = document.getElementById('theme-switch-nav');
    if (themeSwitch) {
      // Check for saved theme preference
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';
      } else {
        // Check if user prefers dark mode
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDarkMode) {
          document.body.setAttribute('data-theme', 'dark');
          themeSwitch.checked = true;
        }
      }

      // Theme switch event listener
      themeSwitch.addEventListener('change', function() {
        if (this.checked) {
          document.body.setAttribute('data-theme', 'dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.body.setAttribute('data-theme', 'light');
          localStorage.setItem('theme', 'light');
        }
      });
    }

    // Highlight active nav item based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      }
    });
  }

  /**
   * Handle user logout
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    
    // Redirect to login page
    window.location.href = 'login.html';
  }
}

// Initialize navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const navbar = new Navbar();
  navbar.init();
});

export default Navbar;
