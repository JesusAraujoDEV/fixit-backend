'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create event_type ENUM
      await queryInterface.sequelize.query(
        `CREATE TYPE fixit.enum_event_type AS ENUM ('info', 'success', 'warning', 'error');`,
        { transaction }
      );

      // 2. Create verification_status ENUM
      await queryInterface.sequelize.query(
        `CREATE TYPE fixit.enum_verification_status AS ENUM ('pending', 'approved', 'rejected');`,
        { transaction }
      );

      // 3. Create platform_events table (admin activity log)
      await queryInterface.createTable(
        { tableName: 'platform_events', schema: 'fixit' },
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          type: {
            type: 'fixit.enum_event_type',
            allowNull: false,
            defaultValue: 'info',
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX idx_platform_events_created_at
         ON fixit.platform_events (created_at DESC);`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `CREATE INDEX idx_platform_events_type
         ON fixit.platform_events (type);`,
        { transaction }
      );

      // 4. Create technician_verifications table
      await queryInterface.createTable(
        { tableName: 'technician_verifications', schema: 'fixit' },
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          user_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'users', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          specialty: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          experience: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          documents_count: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          status: {
            type: 'fixit.enum_verification_status',
            allowNull: false,
            defaultValue: 'pending',
          },
          rejection_reason: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          reviewed_at: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex(
        { tableName: 'technician_verifications', schema: 'fixit' },
        ['user_id'],
        { name: 'idx_technician_verifications_user_id', transaction }
      );
      await queryInterface.addIndex(
        { tableName: 'technician_verifications', schema: 'fixit' },
        ['status'],
        { name: 'idx_technician_verifications_status', transaction }
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
      await queryInterface.dropTable(
        { tableName: 'technician_verifications', schema: 'fixit' },
        { transaction, cascade: true }
      );
      await queryInterface.dropTable(
        { tableName: 'platform_events', schema: 'fixit' },
        { transaction, cascade: true }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS fixit.enum_verification_status;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS fixit.enum_event_type;',
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
