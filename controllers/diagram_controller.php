<?php

/**
 * Diagram Controller
 * Mengatur alur logika tampilan workspace pembuatan dan pengeditan diagram.
 */

require_once __DIR__ . '/../middlewares/auth_middleware.php';

class DiagramController
{
    /**
     * Tampilkan halaman workspace diagram utama
     */
    public function index(): void
    {
        // Pastikan sesi aktif
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

        $page_title = 'Diagram Workspace';
        $hide_footer = true;

        // Contoh kode awal Mermaid Class Diagram
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

        require_once __DIR__ . '/../views/diagram/index_view.php';
    }
}
