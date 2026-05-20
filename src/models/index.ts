import { Sequelize } from "sequelize";
import dotenv from "dotenv";

import { initUser, User } from "./user.model.js";
import { initTechnicianProfile, TechnicianProfile } from "./technician-profile.model.js";
import { initServiceRequest, ServiceRequest } from "./service-request.model.js";
import { initTransaction, Transaction } from "./transaction.model.js";
import { initPlatformEvent, PlatformEvent } from "./platform-event.model.js";
import { initTechnicianVerification, TechnicianVerification } from "./technician-verification.model.js";
import { initReview, Review } from "./review.model.js";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  schema: "fixit",
  define: {
    schema: "fixit",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});

// Initialize models
initUser(sequelize);
initTechnicianProfile(sequelize);
initServiceRequest(sequelize);
initTransaction(sequelize);
initPlatformEvent(sequelize);
initTechnicianVerification(sequelize);
initReview(sequelize);

// Define associations
User.hasOne(TechnicianProfile, {
  foreignKey: "user_id",
  as: "technicianProfile",
});
TechnicianProfile.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(ServiceRequest, {
  foreignKey: "client_id",
  as: "clientRequests",
});
ServiceRequest.belongsTo(User, {
  foreignKey: "client_id",
  as: "client",
});

User.hasMany(ServiceRequest, {
  foreignKey: "technician_id",
  as: "technicianJobs",
});
ServiceRequest.belongsTo(User, {
  foreignKey: "technician_id",
  as: "technician",
});

ServiceRequest.hasMany(Transaction, {
  foreignKey: "service_request_id",
  as: "transactions",
});
Transaction.belongsTo(ServiceRequest, {
  foreignKey: "service_request_id",
  as: "serviceRequest",
});

User.hasMany(TechnicianVerification, {
  foreignKey: "user_id",
  as: "verifications",
});
TechnicianVerification.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Reviews associations
User.hasMany(Review, {
  foreignKey: "reviewer_id",
  as: "reviewsGiven",
});
User.hasMany(Review, {
  foreignKey: "reviewed_id",
  as: "reviewsReceived",
});
Review.belongsTo(User, {
  foreignKey: "reviewer_id",
  as: "reviewer",
});
Review.belongsTo(User, {
  foreignKey: "reviewed_id",
  as: "reviewed",
});
Review.belongsTo(ServiceRequest, {
  foreignKey: "service_request_id",
  as: "serviceRequest",
});

export {
  sequelize,
  User,
  TechnicianProfile,
  ServiceRequest,
  Transaction,
  PlatformEvent,
  TechnicianVerification,
  Review,
};
