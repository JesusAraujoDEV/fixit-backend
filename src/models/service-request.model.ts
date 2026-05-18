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

export const SERVICE_CATEGORIES = [
  "plumbing",
  "electrical",
  "carpentry",
  "painting",
  "appliance_repair",
  "locksmith",
  "cleaning",
  "hvac",
  "general",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const REQUEST_STATUSES = [
  "pending",
  "searching",
  "matched",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export class ServiceRequest extends Model<
  InferAttributes<ServiceRequest>,
  InferCreationAttributes<ServiceRequest>
> {
  declare id: CreationOptional<string>;
  declare client_id: string;
  declare technician_id: CreationOptional<string | null>;
  declare title: string;
  declare category: ServiceCategory;
  declare description: CreationOptional<string>;
  declare images: CreationOptional<string[]>;
  declare status: CreationOptional<RequestStatus>;
  declare price_estimated: CreationOptional<number | null>;
  // TODO: Migrar a GEOMETRY(Point, 4326) cuando PostGIS esté disponible
  declare latitude: number;
  declare longitude: number;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare client?: NonAttribute<User>;
  declare technician?: NonAttribute<User>;
  declare transactions?: NonAttribute<Model[]>;
}

export function initServiceRequest(sequelize: Sequelize): void {
  ServiceRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      client_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: { tableName: "users", schema: "fixit" },
          key: "id",
        },
        onDelete: "CASCADE",
      },
      technician_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: { tableName: "users", schema: "fixit" },
          key: "id",
        },
        onDelete: "SET NULL",
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          len: [5, 200],
        },
      },
      category: {
        type: DataTypes.ENUM(...SERVICE_CATEGORIES),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [],
        validate: {
          maxImages(value: string[]) {
            if (value && value.length > 4) {
              throw new Error("Maximum 4 images allowed");
            }
          },
        },
      },
      status: {
        type: DataTypes.ENUM(...REQUEST_STATUSES),
        allowNull: false,
        defaultValue: "pending",
      },
      price_estimated: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          min: -90,
          max: 90,
        },
      },
      longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: {
          min: -180,
          max: 180,
        },
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
      tableName: "service_requests",
      schema: "fixit",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
}
