/**
 * GitHub Absolute Dates Landing Page JavaScript
 * Handles CTA tracking, year updates, and basic interactions
 */

(function() {
    'use strict';

    // Update copyright year
    function updateYear() {
        const yearElement = document.getElementById('current-year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    // Track CTA clicks
    function trackCTAClick(location) {
        console.log(`CTA clicked from: ${location}`, {
            timestamp: new Date().toISOString(),
            location: location,
            userAgent: navigator.userAgent,
            referrer: document.referrer
        });
        
        // Optional: Send to analytics service
        // Example: gtag('event', 'cta_click', { location: location });
    }

    // Make trackCTAClick globally available for onclick handlers
    window.trackCTAClick = trackCTAClick;

    // Smooth scroll for anchor links
    function initSmoothScroll() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Lazy load images
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    // Add focus styles for keyboard navigation
    function initFocusStyles() {
        const focusableElements = document.querySelectorAll(
            'a, button, input, textarea, select, details summary, [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach(element => {
            element.addEventListener('focus', function() {
                this.style.outline = '2px solid #0969da';
                this.style.outlineOffset = '2px';
            });

            element.addEventListener('blur', function() {
                this.style.outline = '';
                this.style.outlineOffset = '';
            });
        });
    }

    // Handle FAQ accordion behavior
    function initFAQ() {
        const faqItems = document.querySelectorAll('.faq-item details');
        
        faqItems.forEach(item => {
            item.addEventListener('toggle', function() {
                if (this.open) {
                    // Close other open items (optional - remove if you want multiple open)
                    faqItems.forEach(otherItem => {
                        if (otherItem !== this && otherItem.open) {
                            otherItem.open = false;
                        }
                    });
                }
            });
        });
    }

    // Performance monitoring
    function logPerformanceMetrics() {
        if ('performance' in window) {
            window.addEventListener('load', function() {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                        console.log('Performance metrics:', {
                            loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                            firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
                            firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
                        });
                    }
                }, 0);
            });
        }
    }

    // Initialize everything when DOM is ready
    function init() {
        updateYear();
        initSmoothScroll();
        initLazyLoading();
        initFocusStyles();
        initFAQ();
        logPerformanceMetrics();
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Handle external link clicks
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.hostname !== window.location.hostname) {
            // External link clicked
            console.log('External link clicked:', link.href);
        }
    });

})();
