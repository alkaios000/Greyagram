<?php

/**
 * Diagram Controller
 * Mengatur alur logika tampilan workspace pembuatan, penyimpanan, dan pengambilan diagram per pengguna.
 */

require_once __DIR__ . '/../middlewares/auth_middleware.php';
require_once __DIR__ . '/../models/diagram_model.php';

class DiagramController
{
    private DiagramModel $diagramModel;

    public function __construct()
    {
        $this->diagramModel = new DiagramModel();
    }

    /**
     * Dapatkan ID pengguna saat ini dari sesi
     */
    private function getCurrentUserId(): int
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // Sediakan sesi pengguna default jika belum ada sesi login
        if (empty($_SESSION['user'])) {
            $_SESSION['user'] = [
                'id'   => 1,
                'name' => 'Pengguna',
                'role' => 'user'
            ];
        }

        return (int)$_SESSION['user']['id'];
    }

    /**
     * Tampilkan halaman galeri proyek diagram pengguna
     */
    public function projects(): void
    {
        $userId = $this->getCurrentUserId();
        $page_title = 'Proyek Saya';

        // Ambil seluruh diagram milik pengguna termasuk thumbnail dan layout
        $diagrams = $this->diagramModel->getByUser($userId);

        require_once __DIR__ . '/../views/diagram/projects_view.php';
    }

    /**
     * Tampilkan halaman workspace diagram utama
     */
    public function index(): void
    {
        $userId = $this->getCurrentUserId();
        $page_title = 'Diagram Workspace';
        $hide_footer = true;

        $current_diagram_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        $current_diagram_title = 'Diagram Tanpa Judul';
        $current_layout_data = null;

        // Contoh kode awal Mermaid Class Diagram jika membuka baru
        $default_code = "classDiagram\n" .
            "    class User {\n" .
            "        +int id\n" .
            "        +string name\n" .
            "        +string email\n" .
            "        +login()\n" .
            "        +logout()\n" .
            "    }\n\n" .
            "    class Customer {\n" .
            "        +string address\n" .
            "        +string phone\n" .
            "        +checkout()\n" .
            "    }\n\n" .
            "    class Order {\n" .
            "        +int id\n" .
            "        +string orderNumber\n" .
            "        +float totalAmount\n" .
            "        +string status\n" .
            "        +calculateTotal()\n" .
            "    }\n\n" .
            "    class OrderItem {\n" .
            "        +int id\n" .
            "        +int quantity\n" .
            "        +float unitPrice\n" .
            "        +getSubtotal()\n" .
            "    }\n\n" .
            "    class Product {\n" .
            "        +int id\n" .
            "        +string title\n" .
            "        +float price\n" .
            "        +int stock\n" .
            "        +updateStock()\n" .
            "    }\n\n" .
            "    User <|-- Customer : extends\n" .
            "    Customer \"1\" --> \"*\" Order : places\n" .
            "    Order \"1\" *-- \"*\" OrderItem : contains\n" .
            "    OrderItem \"*\" --> \"1\" Product : refers to";

        // Jika ada ID diagram di URL, muat diagram dari database milik user ini
        if ($current_diagram_id) {
            $existing = $this->diagramModel->getById($current_diagram_id, $userId);
            if ($existing) {
                $default_code = $existing['code'];
                $current_diagram_title = $existing['title'];
                $current_layout_data = $existing['layout_data'];
            } else {
                $current_diagram_id = null;
            }
        }

        // Ambil daftar diagram tersimpan milik pengguna ini
        $saved_diagrams = $this->diagramModel->getByUser($userId);

        require_once __DIR__ . '/../views/diagram/index_view.php';
    }

    /**
     * Endpoint API: Simpan / Perbarui diagram milik pengguna ke database
     */
    public function save(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $userId = $this->getCurrentUserId();

        // Tangkap data input (JSON atau POST biasa)
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $title = trim($input['title'] ?? 'Diagram Tanpa Judul');
        $code = trim($input['code'] ?? '');
        $description = isset($input['description']) ? trim($input['description']) : null;
        $diagramId = !empty($input['id']) ? (int)$input['id'] : null;
        $layoutData = isset($input['layout_data']) 
            ? (is_array($input['layout_data']) ? json_encode($input['layout_data']) : (string)$input['layout_data']) 
            : null;
        $thumbnail = isset($input['thumbnail']) ? (string)$input['thumbnail'] : null;

        if ($code === '') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Kode diagram tidak boleh kosong.'
            ]);
            return;
        }

        try {
            if ($diagramId) {
                // Cek kepemilikan diagram
                $existing = $this->diagramModel->getById($diagramId, $userId);
                if (!$existing) {
                    http_response_code(403);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Diagram tidak ditemukan atau Anda tidak memiliki akses.'
                    ]);
                    return;
                }

                $updateData = [
                    'title'       => $title,
                    'code'        => $code,
                    'description' => $description
                ];
                if ($layoutData !== null) {
                    $updateData['layout_data'] = $layoutData;
                }
                if ($thumbnail !== null) {
                    $updateData['thumbnail'] = $thumbnail;
                }

                $this->diagramModel->update($diagramId, $userId, $updateData);

                $savedId = $diagramId;
                $msg = 'Diagram "' . htmlspecialchars($title) . '" berhasil diperbarui!';
            } else {
                $savedId = $this->diagramModel->create($userId, $title, $code, $description, 'class', $layoutData, $thumbnail);
                $msg = 'Diagram "' . htmlspecialchars($title) . '" berhasil disimpan ke database!';
            }

            // Catat log aktivitas jika tabel activities tersedia
            $this->logActivity($userId, 'Simpan Diagram', 'Menyimpan diagram: ' . $title);

            echo json_encode([
                'success'    => true,
                'id'         => $savedId,
                'title'      => $title,
                'message'    => $msg,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal menyimpan diagram ke database: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Endpoint API: Simpan posisi card (layout_data) dan thumbnail secara instan/otomatis
     */
    public function savePositions(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $userId = $this->getCurrentUserId();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $diagramId = !empty($input['id']) ? (int)$input['id'] : null;
        $layoutData = isset($input['layout_data']) 
            ? (is_array($input['layout_data']) ? json_encode($input['layout_data']) : (string)$input['layout_data']) 
            : null;
        $thumbnail = isset($input['thumbnail']) ? (string)$input['thumbnail'] : null;

        if (!$diagramId || $layoutData === null) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Parameter ID diagram atau layout_data tidak valid.'
            ]);
            return;
        }

        try {
            $existing = $this->diagramModel->getById($diagramId, $userId);
            if (!$existing) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Diagram tidak ditemukan atau Anda tidak memiliki akses.'
                ]);
                return;
            }

            $this->diagramModel->updateLayout($diagramId, $userId, $layoutData, $thumbnail);

            echo json_encode([
                'success'    => true,
                'id'         => $diagramId,
                'message'    => 'Posisi kartu diagram berhasil disimpan.',
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal menyimpan posisi diagram: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Endpoint API: Duplikat diagram milik pengguna
     */
    public function duplicate(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $userId = $this->getCurrentUserId();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $id = !empty($input['id']) ? (int)$input['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'ID diagram tidak valid.'
            ]);
            return;
        }

        try {
            $newId = $this->diagramModel->duplicate($id, $userId);
            if (!$newId) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Diagram tidak ditemukan untuk diduplikasi.'
                ]);
                return;
            }

            $this->logActivity($userId, 'Duplikat Diagram', 'Menduplikasi diagram ID: ' . $id);

            echo json_encode([
                'success' => true,
                'id'      => $newId,
                'message' => 'Diagram berhasil disalin.'
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal menduplikasi diagram: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Endpoint API: Ambil daftar seluruh diagram tersimpan milik pengguna
     */
    public function list(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $userId = $this->getCurrentUserId();

        try {
            $diagrams = $this->diagramModel->getByUser($userId);
            echo json_encode([
                'success' => true,
                'data'    => $diagrams
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal mengambil daftar diagram: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Endpoint API: Muat konten diagram tertentu milik pengguna
     */
    public function load(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $userId = $this->getCurrentUserId();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($_POST['id']) ? (int)$_POST['id'] : 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'ID diagram tidak valid.'
            ]);
            return;
        }

        try {
            $diagram = $this->diagramModel->getById($id, $userId);
            if (!$diagram) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Diagram tidak ditemukan atau bukan milik Anda.'
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'diagram' => $diagram
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal memuat diagram: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Endpoint API: Hapus diagram milik pengguna
     */
    public function delete(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        $userId = $this->getCurrentUserId();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $id = !empty($input['id']) ? (int)$input['id'] : 0;

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'ID diagram tidak valid.'
            ]);
            return;
        }

        try {
            $existing = $this->diagramModel->getById($id, $userId);
            if (!$existing) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Diagram tidak ditemukan.'
                ]);
                return;
            }

            $this->diagramModel->delete($id, $userId);
            $this->logActivity($userId, 'Hapus Diagram', 'Menghapus diagram: ' . $existing['title']);

            echo json_encode([
                'success' => true,
                'message' => 'Diagram berhasil dihapus.'
            ]);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal menghapus diagram: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Catat riwayat aktivitas user
     */
    private function logActivity(int $userId, string $action, string $details): void
    {
        try {
            $db = Database::getConnection();
            $stmt = $db->prepare("
                INSERT INTO activities (user_id, action, details, ip_address, created_at) 
                VALUES (:user_id, :action, :details, :ip, NOW())
            ");
            $stmt->execute([
                'user_id' => $userId,
                'action'  => $action,
                'details' => $details,
                'ip'      => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        } catch (Throwable $e) {
            // Lewati jika terjadi kegagalan pencatatan log
        }
    }
}
