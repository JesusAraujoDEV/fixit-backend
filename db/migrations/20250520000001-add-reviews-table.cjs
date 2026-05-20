'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        { tableName: 'reviews', schema: 'fixit' },
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
          reviewer_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'users', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          reviewed_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'users', schema: 'fixit' },
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          rating: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
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

      // Constraints
      await queryInterface.sequelize.query(
        `ALTER TABLE fixit.reviews
         ADD CONSTRAINT chk_rating_range CHECK (rating >= 1 AND rating <= 5);`,
        { transaction }
      );

      // Prevent duplicate reviews (one review per user per service request)
      await queryInterface.addIndex(
        { tableName: 'reviews', schema: 'fixit' },
        ['service_request_id', 'reviewer_id'],
        { name: 'idx_reviews_unique_per_request', unique: true, transaction }
      );

      await queryInterface.addIndex(
        { tableName: 'reviews', schema: 'fixit' },
        ['reviewed_id'],
        { name: 'idx_reviews_reviewed_id', transaction }
      );

      await queryInterface.addIndex(
        { tableName: 'reviews', schema: 'fixit' },
        ['reviewer_id'],
        { name: 'idx_reviews_reviewer_id', transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable(
      { tableName: 'reviews', schema: 'fixit' },
      { cascade: true }
    );
  },
};
