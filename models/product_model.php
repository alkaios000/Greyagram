<?php

/**
 * Product Model
 * Berisi query dan operasi data untuk entitas produk.
 */

require_once __DIR__ . '/../config/database.php';

class ProductModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Ambil semua data produk
     */
    public function getAll(): array
    {
        $stmt = $this->db->query("SELECT * FROM products ORDER BY id DESC");
        return $stmt->fetchAll();
    }

    /**
     * Dapatkan detail produk berdasarkan ID
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Tambahkan produk baru
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO products (name, description, price, stock, created_at) 
                VALUES (:name, :description, :price, :stock, NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'price'       => $data['price'],
            'stock'       => $data['stock'] ?? 0,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Perbarui data produk
     */
    public function update(int $id, array $data): bool
    {
        $sql = "UPDATE products 
                SET name = :name, description = :description, price = :price, stock = :stock 
                WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            'id'          => $id,
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'price'       => $data['price'],
            'stock'       => $data['stock'] ?? 0,
        ]);
    }

    /**
     * Hapus produk berdasarkan ID
     */
    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM products WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
