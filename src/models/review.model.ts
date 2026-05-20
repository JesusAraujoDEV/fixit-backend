import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import type { User } from "./user.model.js";

export class Review extends Model<
  InferAttributes<Review>,
  InferCreationAttributes<Review>
> {
  declare id: CreationOptional<string>;
  declare service_request_id: string;
  declare reviewer_id: string;
  declare reviewed_id: string;
  declare rating: number;
  declare comment: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;

  // Associations
  declare reviewer?: NonAttribute<User>;
  declare reviewed?: NonAttribute<User>;
}

export function initReview(sequelize: Sequelize): void {
  Review.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      service_request_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: { tableName: "service_requests", schema: "fixit" },
          key: "id",
        },
        onDelete: "CASCADE",
      },
      reviewer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: { tableName: "users", schema: "fixit" },
          key: "id",
        },
        onDelete: "CASCADE",
      },
      reviewed_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: { tableName: "users", schema: "fixit" },
          key: "id",
        },
        onDelete: "CASCADE",
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "reviews",
      schema: "fixit",
      underscored: true,
      timestamps: false,
    }
  );
}
