import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import type { ServiceRequest } from "./service-request.model";

export const TRANSACTION_STATUSES = ["pending", "paid", "refunded"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export class Transaction extends Model<
  InferAttributes<Transaction>,
  InferCreationAttributes<Transaction>
> {
  declare id: CreationOptional<string>;
  declare service_request_id: string;
  declare amount: number;
  declare commission_amount: CreationOptional<number>;
  declare status: CreationOptional<TransactionStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associations
  declare serviceRequest?: NonAttribute<ServiceRequest>;
}

export function initTransaction(sequelize: Sequelize): void {
  Transaction.init(
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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      commission_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.ENUM(...TRANSACTION_STATUSES),
        allowNull: false,
        defaultValue: "pending",
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
      tableName: "transactions",
      schema: "fixit",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
}
