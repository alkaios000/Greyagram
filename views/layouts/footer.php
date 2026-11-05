    </div><!-- /.app-container -->

    <?php if (empty($hide_footer)): ?>
    <footer class="app-footer">
        <div class="footer-container">
            <p>&copy; <?= date('Y') ?> Greyagram. Seluruh hak cipta dilindungi undang-undang.</p>
        </div>
    </footer>
    <?php endif; ?>

    <!-- Main JavaScript File -->
    <script src="<?= asset_url('js/main.js') ?>"></script>
</body>
</html>
