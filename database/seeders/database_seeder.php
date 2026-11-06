<?php

/**
 * Database Seeder
 * Mengisi data awal (dummy/initial data) untuk keperluan pengembangan dan pengujian.
 */

return [
    'run' => function (PDO $db): void {
        echo "Menjalankan database seeders...\n";

        // 1. Seed Users
        $password_hash = password_hash('password', PASSWORD_BCRYPT);

        $users = [
            [
                'name'     => 'Administrator Greyagram',
                'email'    => 'admin@greyagram.com',
                'password' => $password_hash,
                'role'     => 'admin',
            ],
            [
                'name'     => 'User Demo',
                'email'    => 'user@greyagram.com',
                'password' => $password_hash,
                'role'     => 'user',
            ],
        ];

        $stmtUser = $db->prepare("INSERT INTO users (name, email, password, role, created_at, updated_at) 
                                 VALUES (:name, :email, :password, :role, NOW(), NOW())
                                 ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)");

        foreach ($users as $user) {
            $stmtUser->execute($user);
        }
        echo " - Tabel 'users' berhasil di-seed (Akun demo: admin@greyagram.com / password)\n";

        // Ambil ID admin
        $stmtAdmin = $db->query("SELECT id FROM users WHERE email = 'admin@greyagram.com' LIMIT 1");
        $adminId = (int) $stmtAdmin->fetchColumn();

        // 2. Seed Products
        $products = [
            ['name' => 'Greyagram Pro License', 'description' => 'Lisensi tahunan Greyagram versi Pro', 'price' => 299000.00, 'stock' => 100],
            ['name' => 'Custom Diagram Template Pack', 'description' => 'Koleksi 50+ template UML dan Mermaid modern', 'price' => 75000.00, 'stock' => 500],
            ['name' => 'Enterprise Architecture Addon', 'description' => 'Modul integrasi cloud dan ekspor enterprise SVG/PNG', 'price' => 599000.00, 'stock' => 50],
        ];

        $stmtProductCheck = $db->query("SELECT COUNT(*) FROM products");
        if ((int)$stmtProductCheck->fetchColumn() === 0) {
            $stmtProduct = $db->prepare("INSERT INTO products (name, description, price, stock, created_at, updated_at)
                                        VALUES (:name, :description, :price, :stock, NOW(), NOW())");
            foreach ($products as $prod) {
                $stmtProduct->execute($prod);
            }
            echo " - Tabel 'products' berhasil di-seed (" . count($products) . " produk)\n";
        }

        // 3. Seed Diagrams
        $stmtDiagramCheck = $db->query("SELECT COUNT(*) FROM diagrams");
        if ((int)$stmtDiagramCheck->fetchColumn() === 0 && $adminId > 0) {
            $ecommerceCode = "classDiagram\n" .
                "    class User {\n" .
                "        +int id\n" .
                "        +string name\n" .
                "        +string email\n" .
                "        +login()\n" .
                "        +logout()\n" .
                "    }\n" .
                "    class Customer {\n" .
                "        +string address\n" .
                "        +string phone\n" .
                "        +checkout()\n" .
                "    }\n" .
                "    class Order {\n" .
                "        +int id\n" .
                "        +string orderNumber\n" .
                "        +float totalAmount\n" .
                "        +calculateTotal()\n" .
                "    }\n" .
                "    User <|-- Customer : extends\n" .
                "    Customer \"1\" --> \"*\" Order : places";

            $stmtDiag = $db->prepare("INSERT INTO diagrams (user_id, title, description, type, code, created_at, updated_at)
                                     VALUES (:user_id, :title, :description, 'class', :code, NOW(), NOW())");
            $stmtDiag->execute([
                'user_id'     => $adminId,
                'title'       => 'E-Commerce Architecture Diagram',
                'description' => 'Diagram kelas relasi e-commerce utama',
                'code'        => $ecommerceCode
            ]); 
            echo " - Tabel 'diagrams' berhasil di-seed (1 diagram contoh)\n";
        }

        // 4. Seed Activities
        $stmtActCheck = $db->query("SELECT COUNT(*) FROM activities");
        if ((int)$stmtActCheck->fetchColumn() === 0 && $adminId > 0) {
            $stmtAct = $db->prepare("INSERT INTO activities (user_id, action, details, ip_address, created_at)
                                    VALUES (:user_id, :action, :details, :ip, NOW())");
            $stmtAct->execute([
                'user_id' => $adminId,
                'action'  => 'Membuat proyek diagram baru',
                'details' => 'Membuat diagram E-Commerce Architecture Diagram',
                'ip'      => '127.0.0.1'
            ]);
            $stmtAct->execute([
                'user_id' => $adminId,
                'action'  => 'Inisialisasi database sistem',
                'details' => 'Migrasi dan seeder awal dijalankan',
                'ip'      => '127.0.0.1'
            ]);
            echo " - Tabel 'activities' berhasil di-seed\n";
        }
        
        echo "Seeding selesai dengan sukses!\n";
    }
];

