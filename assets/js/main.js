/**
 * Greyagram - Main Frontend Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auto-dismiss alert setelah 5 detik jika ada
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});
