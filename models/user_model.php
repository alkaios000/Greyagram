<?php

/**
 * User Model
 * Berisi query dan operasi data untuk entitas pengguna.
 */

require_once __DIR__ . '/../config/database.php';

class UserModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Cari pengguna berdasarkan email
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Cari pengguna berdasarkan ID
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Ambil semua daftar pengguna
     */
    public function getAll(): array
    {
        $stmt = $this->db->query("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC");
        return $stmt->fetchAll();
    }

    /**
     * Tambahkan pengguna baru
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO users (name, email, password, role, created_at) 
                VALUES (:name, :email, :password, :role, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => $data['password'],
            'role'     => $data['role'] ?? 'user',
        ]);
        return (int) $this->db->lastInsertId();
    }
}
