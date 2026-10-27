document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeSwitch = document.getElementById('theme-switch');
    const body = document.body;
    
    // Only proceed with theme switch functionality if the element exists
    if (themeSwitch) {
        // Check for saved theme preference or use preferred color scheme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            body.setAttribute('data-theme', savedTheme);
            themeSwitch.checked = savedTheme === 'dark';
        } else {
            // Check if user prefers dark mode
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDarkMode) {
                body.setAttribute('data-theme', 'dark');
                themeSwitch.checked = true;
            }
        }
        
        // Theme switch event listener
        themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }
    
    // Search functionality
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    const tags = document.querySelectorAll('.tag');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function() {
            if (searchInput.value.trim() !== '') {
                // In a real app, this would trigger a search
                alert('Searching for: ' + searchInput.value);
            }
        });
    }
    
    // Allow Enter key to trigger search
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                // In a real app, this would trigger a search
                alert('Searching for: ' + searchInput.value);
            }
        });
    }
    
    // Make tags clickable
    if (tags.length > 0 && searchInput) {
        tags.forEach(tag => {
            tag.addEventListener('click', function() {
                const tagText = this.textContent.trim();
                searchInput.value = tagText;
                // In a real app, this would trigger a search
                alert('Searching for: ' + tagText);
            });
        });
    }
    
    // Smooth scroll for "Scroll to explore"
    const scrollIndicator = document.querySelector('.hero-scroll');
    
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', function() {
            window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
            });
        });
    }
  } // Close the if(themeSwitch) block
});
