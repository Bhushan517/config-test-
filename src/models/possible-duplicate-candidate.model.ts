
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";

class PossibleDuplicateCandidate extends Model {
    id: any;
}

PossibleDuplicateCandidate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    candidate_id:{
      type: DataTypes.UUID,
      allowNull: true,
    },
    matching_profile:{
      type: DataTypes.JSON,
      allowNull: true,
    },
    candidate_matching_score:{
      type:DataTypes.JSON,
      allowNull: true,
    },
    program_id:{
      type:DataTypes.UUID,
      allowNull:false
    },
    created_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull: true
    },
    updated_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull: true
  },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "possible_duplicate_candidate",
    modelName: "possible_duplicate_candidate",
    timestamps: false
  }
);

sequelize.sync();
export { PossibleDuplicateCandidate };