import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/instance";
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from "./programs.model";
import WorkLocationModel from "./work-location.model";
class VendorComplianceDocumentModel extends Model {
  id: any;
  status!: string;
  uploaded_document: any;
}
VendorComplianceDocumentModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  act: {
    type: DataTypes.STRING,
    allowNull: true
  },
  document_details: {
    type: DataTypes.STRING,
    allowNull: true
  },
  document_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  upload_document_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  work_locations: {
    type: DataTypes.JSON,
    allowNull: true
  },
  hierarchies: {
    type: DataTypes.JSON,
    allowNull: true
  },
  attached_doc_url: {
    type: DataTypes.STRING
  },
  next_update_due: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_updated: {
    type: DataTypes.DATE,
    defaultValue: Date.now()
  },
  ref_id: {
    type: DataTypes.UUID,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Programs,
      key: 'id',
    },
  },
  to_uploaded: {
    type: DataTypes.STRING,
    allowNull: true
  },
  no_of_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  uploaded_document: {
    type: DataTypes.JSON,
    allowNull: true
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
    modelName: 'vendor_compliance_document',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    },
  });

sequelize.sync();
VendorComplianceDocumentModel.belongsTo(Programs, { foreignKey: 'program_id', as: 'programs' });
export default VendorComplianceDocumentModel;
