'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Helper to generate UUIDs without external deps
function uuid() {
  return crypto.randomUUID();
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const SALT_ROUNDS = 10;

    // ─── User IDs ────────────────────────────────────────────────────────
    const adminId = uuid();
    const client1Id = uuid(); // Cliente en Prebo
    const client2Id = uuid(); // Cliente cerca del Sambil
    const tech1Id = uuid();   // Electricista en San Diego
    const tech2Id = uuid();   // Plomero en Prebo
    const tech3Id = uuid();   // Línea Blanca en Av. Bolívar Norte

    // ─── Hash passwords ──────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    const client1Hash = await bcrypt.hash('Cliente1!', SALT_ROUNDS);
    const client2Hash = await bcrypt.hash('Cliente2!', SALT_ROUNDS);
    const tech1Hash = await bcrypt.hash('Tecnico1!', SALT_ROUNDS);
    const tech2Hash = await bcrypt.hash('Tecnico2!', SALT_ROUNDS);
    const tech3Hash = await bcrypt.hash('Tecnico3!', SALT_ROUNDS);

    const now = new Date();

    // ─── 1. Insert Users ─────────────────────────────────────────────────
    await queryInterface.bulkInsert(
      { tableName: 'users', schema: 'fixit' },
      [
        {
          id: adminId,
          email: 'admin@fixit.com',
          password_hash: adminHash,
          role: 'admin',
          full_name: 'Carlos Mendoza (Admin)',
          phone: '+58 241 8001000',
          avatar_url: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: client1Id,
          email: 'maria.prebo@gmail.com',
          password_hash: client1Hash,
          role: 'client',
          full_name: 'María González',
          phone: '+58 412 7451234',
          avatar_url: 'https://i.pravatar.cc/150?u=maria',
          created_at: now,
          updated_at: now,
        },
        {
          id: client2Id,
          email: 'jose.sambil@gmail.com',
          password_hash: client2Hash,
          role: 'client',
          full_name: 'José Rodríguez',
          phone: '+58 414 4129876',
          avatar_url: 'https://i.pravatar.cc/150?u=jose',
          created_at: now,
          updated_at: now,
        },
        {
          id: tech1Id,
          email: 'pedro.electricista@gmail.com',
          password_hash: tech1Hash,
          role: 'technician',
          full_name: 'Pedro Ramírez',
          phone: '+58 424 3561122',
          avatar_url: 'https://i.pravatar.cc/150?u=pedro',
          created_at: now,
          updated_at: now,
        },
        {
          id: tech2Id,
          email: 'luis.plomero@gmail.com',
          password_hash: tech2Hash,
          role: 'technician',
          full_name: 'Luis Hernández',
          phone: '+58 416 6443355',
          avatar_url: 'https://i.pravatar.cc/150?u=luis',
          created_at: now,
          updated_at: now,
        },
        {
          id: tech3Id,
          email: 'andres.lineablanca@gmail.com',
          password_hash: tech3Hash,
          role: 'technician',
          full_name: 'Andrés Martínez',
          phone: '+58 412 9887766',
          avatar_url: 'https://i.pravatar.cc/150?u=andres',
          created_at: now,
          updated_at: now,
        },
      ]
    );

    // ─── 2. Insert Technician Profiles ───────────────────────────────────
    // Coordenadas reales aproximadas de Valencia, Carabobo, Venezuela:
    // - San Diego: 10.2333, -67.9578
    // - Prebo: 10.1897, -68.0150
    // - Av. Bolívar Norte / Las Acacias: 10.2050, -68.0020
    await queryInterface.bulkInsert(
      { tableName: 'technician_profiles', schema: 'fixit' },
      [
        {
          id: uuid(),
          user_id: tech1Id,
          bio: 'Electricista certificado con 8 años de experiencia. Especialista en instalaciones residenciales y comerciales en San Diego y alrededores.',
          is_verified: true,
          is_online: true,
          rating_average: 4.75,
          current_latitude: 10.2333,
          current_longitude: -67.9578,
          created_at: now,
          updated_at: now,
        },
        {
          id: uuid(),
          user_id: tech2Id,
          bio: 'Plomero profesional. Reparaciones de tuberías, destapes, instalación de calentadores. Zona Prebo y alrededores.',
          is_verified: true,
          is_online: true,
          rating_average: 4.50,
          current_latitude: 10.1897,
          current_longitude: -68.0150,
          created_at: now,
          updated_at: now,
        },
        {
          id: uuid(),
          user_id: tech3Id,
          bio: 'Técnico en línea blanca (neveras, lavadoras, secadoras, aires acondicionados). Servicio a domicilio en toda Valencia.',
          is_verified: true,
          is_online: true,
          rating_average: 4.85,
          current_latitude: 10.2050,
          current_longitude: -68.0020,
          created_at: now,
          updated_at: now,
        },
      ]
    );

    // ─── 3. Insert Service Requests ──────────────────────────────────────
    // Cliente 1 (María en Prebo): Problema eléctrico
    // Cliente 2 (José cerca del Sambil): Fuga de agua
    // Coordenadas:
    // - Prebo (residencial): 10.1910, -68.0130
    // - Sambil Valencia: 10.2100, -67.9950
    await queryInterface.bulkInsert(
      { tableName: 'service_requests', schema: 'fixit' },
      [
        {
          id: uuid(),
          client_id: client1Id,
          technician_id: null,
          title: 'Se fue la luz en toda la casa',
          category: 'electrical',
          description: 'Desde ayer en la noche se fue la luz en toda la casa. Los breakers están arriba pero no llega corriente a ningún tomacorriente. Los vecinos sí tienen luz.',
          images: '{https://placehold.co/600x400/orange/white?text=Breaker+Panel,https://placehold.co/600x400/gray/white?text=Tomacorriente+Sin+Luz}',
          status: 'pending',
          price_estimated: null,
          latitude: 10.1910,
          longitude: -68.0130,
          created_at: now,
          updated_at: now,
        },
        {
          id: uuid(),
          client_id: client2Id,
          technician_id: null,
          title: 'Fuga de agua debajo del fregadero',
          category: 'plumbing',
          description: 'Hay una fuga constante debajo del fregadero de la cocina. Ya puse un tobo pero se llena rápido. Parece que es la conexión de la manguera flexible.',
          images: '{https://placehold.co/600x400/blue/white?text=Fuga+Fregadero,https://placehold.co/600x400/cyan/white?text=Tuberia+Dañada}',
          status: 'pending',
          price_estimated: null,
          latitude: 10.2100,
          longitude: -67.9950,
          created_at: now,
          updated_at: now,
        },
      ]
    );
  },

  async down(queryInterface) {
    // Remove in reverse order due to foreign key constraints
    await queryInterface.bulkDelete(
      { tableName: 'service_requests', schema: 'fixit' },
      null,
      {}
    );
    await queryInterface.bulkDelete(
      { tableName: 'technician_profiles', schema: 'fixit' },
      null,
      {}
    );
    await queryInterface.bulkDelete(
      { tableName: 'users', schema: 'fixit' },
      null,
      {}
    );
  },
};
