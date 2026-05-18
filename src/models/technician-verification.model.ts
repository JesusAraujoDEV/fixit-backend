import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import type { User } from "./user.model";

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export class TechnicianVerification extends Model<
  InferAttributes<TechnicianVerification>,
  InferCreationAttributes<TechnicianVerification>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare specialty: string;
  declare experience: string;
  declare documents_count: CreationOptional<number>;
  declare status: CreationOptional<VerificationStatus>;
  declare rejection_reason: CreationOptional<string | null>;
  declare reviewed_at: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
}

export function initTechnicianVerification(sequelize: Sequelize): void {
  TechnicianVerification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: { tableName: "users", schema: "fixit" },
          key: "id",
        },
        onDelete: "CASCADE",
      },
      specialty: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      experience: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      documents_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM(...VERIFICATION_STATUSES),
        allowNull: false,
        defaultValue: "pending",
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: "technician_verifications",
      schema: "fixit",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
}
