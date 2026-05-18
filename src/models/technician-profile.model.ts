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

export class TechnicianProfile extends Model<
  InferAttributes<TechnicianProfile>,
  InferCreationAttributes<TechnicianProfile>
> {
  declare id: CreationOptional<string>;
  declare user_id: string;
  declare bio: CreationOptional<string | null>;
  declare is_verified: CreationOptional<boolean>;
  declare is_online: CreationOptional<boolean>;
  declare rating_average: CreationOptional<number>;
  declare current_location: CreationOptional<object | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
}

export function initTechnicianProfile(sequelize: Sequelize): void {
  TechnicianProfile.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: { tableName: "users", schema: "fixit" },
          key: "id",
        },
        onDelete: "CASCADE",
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_online: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      rating_average: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
          max: 5,
        },
      },
      current_location: {
        type: DataTypes.GEOMETRY("POINT", 4326),
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
      tableName: "technician_profiles",
      schema: "fixit",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
}
