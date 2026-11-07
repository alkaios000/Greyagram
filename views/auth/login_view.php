<?php
$page_title = 'greyagram';
$hide_footer = true;
require_once __DIR__ . '/../layouts/header.php';
?>

<div class="greyagram-auth-container">
    <!-- Interactive Background Node Canvas -->
    <canvas id="greyagramCanvas" class="greyagram-bg-canvas"></canvas>

    <!-- Minimalist Cardless Login Form -->
    <div class="greyagram-login-box">
        <div class="greyagram-brand-wrap">
            <h1 class="greyagram-brand">greyagram</h1>
        </div>

        <?php if (!empty($error)): ?>
            <div class="greyagram-alert" role="alert">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span><?= e($error) ?></span>
            </div>
        <?php endif; ?>

        <form action="<?= base_url('login/process') ?>" method="POST" class="greyagram-form" autocomplete="off">
            <?= csrf_field() ?>

            <div class="greyagram-input-group">
                <input type="text" id="username" name="email" class="greyagram-input" placeholder="Username" required autofocus>
            </div>

            <div class="greyagram-input-group">
                <input type="password" id="password" name="password" class="greyagram-input greyagram-input-pwd" placeholder="Password" required>
                <button type="button" class="btn-toggle-pwd" id="btnTogglePwd" title="Lihat/Sembunyikan Password" tabindex="-1">
                    <i class="fa-regular fa-eye" id="eyeIcon"></i>
                </button>
            </div>

            <button type="submit" class="greyagram-submit-btn">
                <span>Masuk</span>
            </button>
        </form>
    </div>
</div>

<script>
// Interactive Node Network Canvas Animation
(function() {
    const canvas = document.getElementById('greyagramCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const mouse = { x: null, y: null, radius: 150 };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initParticles();
    }

    function initParticles() {
        particles = [];
        const count = Math.min(100, Math.max(45, Math.floor((width * height) / 13000)));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.65,
                vy: (Math.random() - 0.5) * 0.65,
                radius: Math.random() * 1.5 + 1.2
            });
        }
    }

    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Interaksi klik: dorongan halus ke partikel di sekitar titik klik
    window.addEventListener('click', (e) => {
        if (e.target.closest('input, button, a')) return;
        particles.forEach(p => {
            const dx = p.x - e.clientX;
            const dy = p.y - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 220 && dist > 0) {
                const force = (220 - dist) / 220 * 3.5;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }
        });
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            p.x += p.vx;
            p.y += p.vy;

            // Redam kecepatan berlebih secara natural
            p.vx *= 0.99;
            p.vy *= 0.99;
            if (Math.abs(p.vx) < 0.15) p.vx = (Math.random() - 0.5) * 0.5;
            if (Math.abs(p.vy) < 0.15) p.vy = (Math.random() - 0.5) * 0.5;

            // Pantul di batas layar
            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            else if (p.x > width) { p.x = width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            else if (p.y > height) { p.y = height; p.vy *= -1; }

            // Interaksi mouse
            if (mouse.x !== null && mouse.y !== null) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouse.radius && dist > 0) {
                    const repel = (mouse.radius - dist) / mouse.radius;
                    p.x += (dx / dist) * repel * 1.2;
                    p.y += (dy / dist) * repel * 1.2;

                    // Garis koneksi interaktif ke kursor mouse
                    const mouseAlpha = (1 - dist / mouse.radius) * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(148, 163, 184, ${mouseAlpha})`;
                    ctx.lineWidth = 0.85;
                    ctx.stroke();
                }
            }

            // Gambar titik node
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
            ctx.fill();

            // Hubungkan garis antarnode yang berdekatan
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 115;

                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }

    resize();
    draw();

    // Toggle Password Visibility
    const btnTogglePwd = document.getElementById('btnTogglePwd');
    const pwdInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    if (btnTogglePwd && pwdInput && eyeIcon) {
        btnTogglePwd.addEventListener('click', () => {
            const isPassword = pwdInput.type === 'password';
            pwdInput.type = isPassword ? 'text' : 'password';
            eyeIcon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        });
    }
})();
</script>

<?php
require_once __DIR__ . '/../layouts/footer.php';
?>
