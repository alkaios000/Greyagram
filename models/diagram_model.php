<?php

/**
 * Diagram Model
 * Mengelola penyimpanan, pembaruan, dan pengambilan diagram per pengguna dari database.
 */

require_once __DIR__ . '/../config/database.php';

class DiagramModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    /**
     * Dapatkan semua diagram milik pengguna tertentu
     */
    public function getByUser(int $userId): array
    {
        $stmt = $this->db->prepare("
            SELECT id, user_id, title, description, type, code, thumbnail, layout_data, created_at, updated_at,
                   LENGTH(code) AS code_size
            FROM diagrams 
            WHERE user_id = :user_id 
            ORDER BY updated_at DESC
        ");
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Cari diagram berdasarkan ID dan User ID (menjamin isolasi per user)
     */
    public function getById(int $id, int $userId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT id, user_id, title, description, type, code, layout_data, thumbnail, created_at, updated_at 
            FROM diagrams 
            WHERE id = :id AND user_id = :user_id 
            LIMIT 1
        ");
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Simpan diagram baru ke database
     */
    public function create(int $userId, string $title, string $code, ?string $description = null, string $type = 'class', ?string $layoutData = null, ?string $thumbnail = null): int
    {
        $sql = "INSERT INTO diagrams (user_id, title, description, type, code, layout_data, thumbnail, created_at, updated_at) 
                VALUES (:user_id, :title, :description, :type, :code, :layout_data, :thumbnail, NOW(), NOW())";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'user_id'     => $userId,
            'title'       => trim($title) !== '' ? trim($title) : 'Diagram Tanpa Judul',
            'description' => $description,
            'type'        => $type,
            'code'        => $code,
            'layout_data' => $layoutData,
            'thumbnail'   => $thumbnail
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Perbarui diagram milik pengguna
     */
    public function update(int $id, int $userId, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id, 'user_id' => $userId];

        if (isset($data['title'])) {
            $fields[] = "title = :title";
            $params['title'] = trim($data['title']) !== '' ? trim($data['title']) : 'Diagram Tanpa Judul';
        }
        if (isset($data['code'])) {
            $fields[] = "code = :code";
            $params['code'] = $data['code'];
        }
        if (array_key_exists('description', $data)) {
            $fields[] = "description = :description";
            $params['description'] = $data['description'];
        }
        if (isset($data['type'])) {
            $fields[] = "type = :type";
            $params['type'] = $data['type'];
        }
        if (array_key_exists('layout_data', $data)) {
            $fields[] = "layout_data = :layout_data";
            $params['layout_data'] = $data['layout_data'];
        }
        if (array_key_exists('thumbnail', $data)) {
            $fields[] = "thumbnail = :thumbnail";
            $params['thumbnail'] = $data['thumbnail'];
        }

        if (empty($fields)) {
            return false;
        }

        $fields[] = "updated_at = NOW()";
        $sql = "UPDATE diagrams SET " . implode(', ', $fields) . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Simpan cepat posisi kartu dan thumbnail tanpa mengubah judul / kode
     */
    public function updateLayout(int $id, int $userId, ?string $layoutData = null, ?string $thumbnail = null): bool
    {
        $fields = ["updated_at = NOW()"];
        $params = [
            'id'      => $id,
            'user_id' => $userId
        ];

        if ($layoutData !== null) {
            $fields[] = "layout_data = :layout_data";
            $params['layout_data'] = $layoutData;
        }

        if ($thumbnail !== null) {
            $fields[] = "thumbnail = :thumbnail";
            $params['thumbnail'] = $thumbnail;
        }

        if (count($fields) === 1) {
            return false;
        }

        $sql = "UPDATE diagrams SET " . implode(', ', $fields) . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Gandakan diagram milik pengguna
     */
    public function duplicate(int $id, int $userId): ?int
    {
        $existing = $this->getById($id, $userId);
        if (!$existing) return null;

        $newTitle = $existing['title'] . ' (Salinan)';
        return $this->create(
            $userId,
            $newTitle,
            $existing['code'],
            $existing['description'],
            $existing['type'],
            $existing['layout_data'],
            $existing['thumbnail']
        );
    }

    /**
     * Hapus diagram milik pengguna
     */
    public function delete(int $id, int $userId): bool
    {
        $stmt = $this->db->prepare("DELETE FROM diagrams WHERE id = :id AND user_id = :user_id");
        return $stmt->execute(['id' => $id, 'user_id' => $userId]);
    }
}

