<?php

/**
 * URL Helper
 * Fungsi bantu pembuatan URL, redirect, dan penanganan aset.
 */

if (!function_exists('base_url')) {
    /**
     * Dapatkan base URL aplikasi dengan path tambahan opsional
     */
    function base_url(string $path = ''): string
    {
        if (!empty($_SERVER['HTTP_HOST'])) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
            $host = $_SERVER['HTTP_HOST'];

            // Dapatkan subfolder direktori script jika ada
            $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
            $scriptDir = ($scriptDir === '/' || $scriptDir === '\\' || $scriptDir === '.') ? '' : rtrim(str_replace('\\', '/', $scriptDir), '/');

            $base = "{$protocol}://{$host}{$scriptDir}";
        } else {
            $base = rtrim($_ENV['APP_URL'] ?? 'http://localhost/Greyagram', '/');
        }

        $path = ltrim($path, '/');
        return $path !== '' ? "{$base}/{$path}" : $base;
    }
}

if (!function_exists('asset_url')) {
    /**
     * Dapatkan URL untuk file aset (css, js, img) dengan cache busting otomatis
     */
    function asset_url(string $path = ''): string
    {
        $cleanPath = ltrim($path, '/');
        $fullPath = __DIR__ . '/../assets/' . $cleanPath;
        $url = base_url('assets/' . $cleanPath);

        if (file_exists($fullPath)) { 
            $version = filemtime($fullPath);
            return "{$url}?v={$version}";
        }

        return $url;
    }
}

if (!function_exists('redirect')) {
    /**
     * Redirect ke URL atau path tertentu
     */
    function redirect(string $path): void
    {
        $url = str_starts_with($path, 'http://') || str_starts_with($path, 'https://')
            ? $path
            : base_url($path);

        header("Location: {$url}");
        exit;
    }
}

if (!function_exists('current_url')) {
    /**
     * Dapatkan URL saat ini
     */
    function current_url(): string
    {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        return "{$protocol}://{$host}{$uri}";
    }
}
