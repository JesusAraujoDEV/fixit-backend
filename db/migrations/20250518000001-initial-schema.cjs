'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 0. Create schema
      await queryInterface.sequelize.query(
        'CREATE SCHEMA IF NOT EXISTS fixit;',
        { transaction }
      );

      // 1. Enable PostGIS extension
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS postgis;',
        { transaction }
      );

      // 2. Create ENUM types in fixit schema
      await queryInterface.sequelize.query(
        `CREATE TYPE fixit.enum_user_role AS ENUM ('client', 'technician', 'admin');`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE fixit.enum_service_category AS ENUM (
          'plumbing', 'electrical', 'carpentry', 'painting',
          'appliance_repair', 'locksmith', 'cleaning', 'hvac', 'general'
        );`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE fixit.enum_request_status AS ENUM (
          'pending', 'searching', 'matched', 'in_progress', 'completed', 'cancelled'
        );`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE fixit.enum_transaction_status AS ENUM ('pending', 'paid', 'refunded');`,
        { transaction }
      );

      // 3. Create users table
      await queryInterface.createTable(
        { tableName: 'users', schema: 'fixit' },
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
            unique: true,
          },
          password_hash: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          role: {
            type: 'fixit.enum_user_role',
            allowNull: false,
          },
          full_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          avatar_url: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction }
      );

      // Users indexes
      await queryInterface.addIndex(
        { tableName: 'users', schema: 'fixit' },
        ['email'],
        { name: 'idx_users_email', unique: true, transaction }
      );
      await queryInterface.addIndex(
        { tableName: 'users', schema: 'fixit' },
        ['role'],
        { name: 'idx_users_role', transaction }
      );

      // 4. Create technician_profiles table
      await queryInterface.createTable(
        { tableName: 'technician_profiles', schema: 'fixit' },
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            unique: true,
            references: {
              model: { tableName: 'users', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          bio: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          is_verified: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_online: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          rating_average: {
            type: Sequelize.DECIMAL(3, 2),
            allowNull: false,
            defaultValue: 0.0,
          },
          current_location: {
            type: 'GEOMETRY(Point, 4326)',
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction }
      );

      // Technician profiles indexes
      await queryInterface.addIndex(
        { tableName: 'technician_profiles', schema: 'fixit' },
        ['user_id'],
        { name: 'idx_technician_profiles_user_id', unique: true, transaction }
      );

      // Spatial GIST index for proximity queries
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_technician_profiles_location
         ON fixit.technician_profiles USING GIST (current_location);`,
        { transaction }
      );

      // Partial index for online technicians
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_technician_profiles_online
         ON fixit.technician_profiles (is_online) WHERE is_online = TRUE;`,
        { transaction }
      );

      // Rating average check constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE fixit.technician_profiles
         ADD CONSTRAINT chk_rating_range CHECK (rating_average >= 0 AND rating_average <= 5);`,
        { transaction }
      );

      // 5. Create service_requests table
      await queryInterface.createTable(
        { tableName: 'service_requests', schema: 'fixit' },
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          client_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'users', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          technician_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: { tableName: 'users', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
          title: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },
          category: {
            type: 'fixit.enum_service_category',
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: '',
          },
          images: {
            type: 'TEXT[] DEFAULT \'{}\'',
            allowNull: false,
          },
          status: {
            type: 'fixit.enum_request_status',
            allowNull: false,
            defaultValue: 'pending',
          },
          price_estimated: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          location: {
            type: 'GEOMETRY(Point, 4326)',
            allowNull: false,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction }
      );

      // Service requests indexes
      await queryInterface.addIndex(
        { tableName: 'service_requests', schema: 'fixit' },
        ['client_id'],
        { name: 'idx_service_requests_client_id', transaction }
      );
      await queryInterface.addIndex(
        { tableName: 'service_requests', schema: 'fixit' },
        ['technician_id'],
        { name: 'idx_service_requests_technician_id', transaction }
      );
      await queryInterface.addIndex(
        { tableName: 'service_requests', schema: 'fixit' },
        ['status'],
        { name: 'idx_service_requests_status', transaction }
      );
      await queryInterface.addIndex(
        { tableName: 'service_requests', schema: 'fixit' },
        ['category'],
        { name: 'idx_service_requests_category', transaction }
      );

      // Spatial GIST index for service request locations
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_service_requests_location
         ON fixit.service_requests USING GIST (location);`,
        { transaction }
      );

      // Created_at descending index for feed ordering
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_service_requests_created_at
         ON fixit.service_requests (created_at DESC);`,
        { transaction }
      );

      // Title length check
      await queryInterface.sequelize.query(
        `ALTER TABLE fixit.service_requests
         ADD CONSTRAINT chk_title_length CHECK (char_length(title) >= 5);`,
        { transaction }
      );

      // Max images check
      await queryInterface.sequelize.query(
        `ALTER TABLE fixit.service_requests
         ADD CONSTRAINT chk_images_max CHECK (
           array_length(images, 1) IS NULL OR array_length(images, 1) <= 4
         );`,
        { transaction }
      );

      // 6. Create transactions table
      await queryInterface.createTable(
        { tableName: 'transactions', schema: 'fixit' },
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          service_request_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'service_requests', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          commission_amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
          },
          status: {
            type: 'fixit.enum_transaction_status',
            allowNull: false,
            defaultValue: 'pending',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction }
      );

      // Transactions indexes
      await queryInterface.addIndex(
        { tableName: 'transactions', schema: 'fixit' },
        ['service_request_id'],
        { name: 'idx_transactions_service_request_id', transaction }
      );
      await queryInterface.addIndex(
        { tableName: 'transactions', schema: 'fixit' },
        ['status'],
        { name: 'idx_transactions_status', transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX idx_transactions_created_at
         ON fixit.transactions (created_at DESC);`,
        { transaction }
      );

      // Amount positive check
      await queryInterface.sequelize.query(
        `ALTER TABLE fixit.transactions
         ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);`,
        { transaction }
      );

      // Commission non-negative check
      await queryInterface.sequelize.query(
        `ALTER TABLE fixit.transactions
         ADD CONSTRAINT chk_commission_non_negative CHECK (commission_amount >= 0);`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop tables in reverse dependency order
      await queryInterface.dropTable(
        { tableName: 'transactions', schema: 'fixit' },
        { transaction, cascade: true }
      );
      await queryInterface.dropTable(
        { tableName: 'service_requests', schema: 'fixit' },
        { transaction, cascade: true }
      );
      await queryInterface.dropTable(
        { tableName: 'technician_profiles', schema: 'fixit' },
        { transaction, cascade: true }
      );
      await queryInterface.dropTable(
        { tableName: 'users', schema: 'fixit' },
        { transaction, cascade: true }
      );

      // Drop ENUM types
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS fixit.enum_transaction_status;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS fixit.enum_request_status;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS fixit.enum_service_category;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS fixit.enum_user_role;',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
