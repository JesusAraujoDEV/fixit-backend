import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import type { TechnicianProfile } from "./technician-profile.model";
import type { ServiceRequest } from "./service-request.model";

// Enum values exported for reuse in validations
export const USER_ROLES = ["client", "technician", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare password_hash: string;
  declare role: UserRole;
  declare full_name: string;
  declare phone: CreationOptional<string | null>;
  declare avatar_url: CreationOptional<string | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare technicianProfile?: NonAttribute<TechnicianProfile>;
  declare clientRequests?: NonAttribute<ServiceRequest[]>;
  declare technicianJobs?: NonAttribute<ServiceRequest[]>;
}

export function initUser(sequelize: Sequelize): void {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...USER_ROLES),
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.TEXT,
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
      tableName: "users",
      schema: "fixit",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
}
