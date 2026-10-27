/**
 * Footer component for the Travel Planner application
 * This component provides consistent footer across all pages
 */

class Footer {
  constructor() {
    this.year = new Date().getFullYear();
  }

  /**
   * Initialize the footer
   */
  init() {
    this.render();
  }

  /**
   * Render the footer
   */
  render() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    
    footer.innerHTML = `
      <footer class="footer mt-auto py-3 bg-light">
        <div class="container">
          <div class="row">
            <div class="col-md-4">
              <h5>AI Travel Planner</h5>
              <p class="text-muted">Plan your trips with AI assistance and personalized experiences.</p>
            </div>
            <div class="col-md-4">
              <h5>Quick Links</h5>
              <ul class="list-unstyled">
                <li><a href="index.html">Home</a></li>
                <li><a href="dashboard.html">Dashboard</a></li>
                <li><a href="chat.html">AI Assistant</a></li>
              </ul>
            </div>
            <div class="col-md-4">
              <h5>Features</h5>
              <ul class="list-unstyled">
                <li>AI-powered itinerary generation</li>
                <li>Weather integration</li>
                <li>Interactive chat assistant</li>
              </ul>
            </div>
          </div>
          <hr>
          <div class="text-center">
            <p class="mb-0">&copy; ${this.year} AI Travel Planner. All rights reserved.</p>
          </div>
        </div>
      </footer>
    `;
  }
}

// Initialize footer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const footer = new Footer();
  footer.init();
});

export default Footer;
