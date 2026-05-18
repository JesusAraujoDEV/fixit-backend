import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";

export const EVENT_TYPES = ["info", "success", "warning", "error"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export class PlatformEvent extends Model<
  InferAttributes<PlatformEvent>,
  InferCreationAttributes<PlatformEvent>
> {
  declare id: CreationOptional<string>;
  declare type: EventType;
  declare message: string;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare created_at: CreationOptional<Date>;
}

export function initPlatformEvent(sequelize: Sequelize): void {
  PlatformEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM(...EVENT_TYPES),
        allowNull: false,
        defaultValue: "info",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSONB,
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
      tableName: "platform_events",
      schema: "fixit",
      underscored: true,
      timestamps: false,
    }
  );
}
